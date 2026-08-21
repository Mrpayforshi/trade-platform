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

// GET /api/admin/compliance-cases/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("compliance_cases")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Compliance case not found", code: "case_not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PATCH /api/admin/compliance-cases/[id]
// Handles status transitions (open -> pending_documents -> under_review
// -> approved/rejected) and escalation flagging. This route does NOT
// enforce that the state machine transition is legal — unlike
// transactions, there's no DB trigger guarding compliance_cases.status
// yet, so an ops user could currently jump straight from 'open' to
// 'approved'. Flagging this as a gap rather than silently assuming a
// guard exists that doesn't.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const allowedFields = [
    "status",
    "official_reference",
    "sla_deadline",
    "escalation_triggered",
  ];

  const updatePayload: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updatePayload[field] = body[field];
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("compliance_cases")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update compliance case", code: "case_update_failed" },
      { status: 500 }
    );
  }

  // Deliberately does NOT touch the linked transaction, even when status
  // becomes 'approved'. Advancing a transaction's state is a guarded,
  // audited action that belongs to PATCH /api/admin/transactions/[id]/state
  // alone — an implicit write from here would bypass that route's own
  // reason-requirement and MFA check. If a transaction is sitting in
  // compliance_pending waiting on this case, that's a separate, explicit
  // ops action once they see this case is resolved.
  const { data: linkedTransactions } = await supabase
    .from("transactions")
    .select("id, state")
    .eq("compliance_case_id", id);

  return NextResponse.json({
    data,
    linked_transactions: linkedTransactions ?? [],
  });
}
