import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      supabase,
      errorResponse: NextResponse.json(
        { error: "Authentication required", code: "unauthenticated" },
        { status: 401 }
      ),
    };
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (!adminUser) {
    return {
      supabase,
      errorResponse: NextResponse.json(
        { error: "Ops access required", code: "forbidden" },
        { status: 403 }
      ),
    };
  }

  return { supabase, errorResponse: null };
}

// fee_status enum: pending -> invoiced -> paid, or -> waived from either
// pending or invoiced. paid and waived are terminal — matches how the
// compliance_cases and transactions state machines treat their own
// terminal states, kept as a soft check here rather than a DB trigger
// since fee correction (e.g. reverting a mis-set status) is a more
// routine ops need than reversing a transaction or compliance decision.
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  pending: ["invoiced", "waived"],
  invoiced: ["paid", "waived"],
  paid: [],
  waived: [],
};

// GET /api/admin/platform-fees/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("platform_fees")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Platform fee not found", code: "fee_not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PATCH /api/admin/platform-fees/[id]
// Handles status transitions (pending -> invoiced -> paid, or waived)
// and linking an invoice_id once invoicing exists. amount/fee_type/
// transaction_id are deliberately not editable here — a fee record with
// the wrong amount or type should be waived and recreated, not silently
// mutated, so the audit trail (trg_audit_platform_fees) stays honest
// about what was actually charged when.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { status: newStatus, invoice_id } = body;

  const updatePayload: Record<string, unknown> = {};

  if (newStatus) {
    const { data: current, error: fetchError } = await supabase
      .from("platform_fees")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Platform fee not found", code: "fee_not_found" },
        { status: 404 }
      );
    }

    const allowed = LEGAL_TRANSITIONS[current.status] ?? [];
    if (current.status !== newStatus && !allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Illegal transition: ${current.status} -> ${newStatus}`,
          code: "illegal_transition",
        },
        { status: 400 }
      );
    }

    updatePayload.status = newStatus;
  }

  if (invoice_id !== undefined) {
    updatePayload.invoice_id = invoice_id;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("platform_fees")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update platform fee", code: "fee_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
