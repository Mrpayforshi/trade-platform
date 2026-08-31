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

// inspection_status enum: scheduled -> in_progress -> passed/failed, or
// waived from either open state. passed/failed/waived are terminal — a
// wrong result should be corrected by scheduling a fresh inspection, not
// by mutating a completed one, keeping the record an honest history of
// what actually happened (same reasoning as platform_fees' terminal
// paid/waived states).
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  scheduled: ["in_progress", "waived"],
  in_progress: ["passed", "failed", "waived"],
  passed: [],
  failed: [],
  waived: [],
};

// GET /api/admin/inspections/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("inspections")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Inspection not found", code: "inspection_not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PATCH /api/admin/inspections/[id]
// Handles status transitions plus the fields that get filled in as an
// inspection is worked: result_summary, defects_found, evidence_document_id,
// and completed_at (set automatically when moving into a terminal state,
// not accepted as raw input — avoids ops backdating results by hand).
// platform_fee_id links an existing platform_fees row (fee_type
// 'inspection_fee') once ops creates one — inspections never create a
// fee themselves, matching the explicit-fee-creation pattern.
// transaction_id/supplier_id/inspection_type are not editable here for
// the same reason amount/fee_type aren't on platform_fees: get it right
// or re-create it, don't silently rewrite what was inspected.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const {
    status: newStatus,
    result_summary,
    defects_found,
    evidence_document_id,
    platform_fee_id,
  } = body;

  const updatePayload: Record<string, unknown> = {};

  if (newStatus) {
    const { data: current, error: fetchError } = await supabase
      .from("inspections")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Inspection not found", code: "inspection_not_found" },
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
    if (["passed", "failed", "waived"].includes(newStatus)) {
      updatePayload.completed_at = new Date().toISOString();
    }
  }

  if (result_summary !== undefined) updatePayload.result_summary = result_summary;
  if (defects_found !== undefined) updatePayload.defects_found = defects_found;
  if (evidence_document_id !== undefined) updatePayload.evidence_document_id = evidence_document_id;
  if (platform_fee_id !== undefined) updatePayload.platform_fee_id = platform_fee_id;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("inspections")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update inspection", code: "inspection_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
