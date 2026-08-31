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
      adminUser: null,
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
      adminUser: null,
      errorResponse: NextResponse.json(
        { error: "Ops access required", code: "forbidden" },
        { status: 403 }
      ),
    };
  }

  return { supabase, adminUser, errorResponse: null };
}

// status check constraint: pending -> reviewed / escalated; escalated ->
// reviewed (conservative escalation resolves to a human decision, per
// the plan's mitigation language); reviewed is terminal — a wrong call
// gets corrected via a fresh review row, not a mutated one.
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  pending: ["reviewed", "escalated"],
  escalated: ["reviewed"],
  reviewed: [],
};

// GET /api/admin/hs-code-reviews/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("hs_code_reviews")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "HS code review not found", code: "hs_code_review_not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PATCH /api/admin/hs-code-reviews/[id]
// proposed_hs_code stays editable pre-review (the classification itself
// is a working draft until a human signs off). reviewed_by is always the
// calling admin — never accepted from the request body, so the audit
// trail can't be spoofed. reviewed_at is stamped automatically on the
// 'reviewed' transition, mirroring inspections.completed_at.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, adminUser, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { status: newStatus, proposed_hs_code, notes } = body;

  const updatePayload: Record<string, unknown> = {};

  if (newStatus) {
    const { data: current, error: fetchError } = await supabase
      .from("hs_code_reviews")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "HS code review not found", code: "hs_code_review_not_found" },
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
    if (newStatus === "reviewed") {
      updatePayload.reviewed_by = adminUser!.id;
      updatePayload.reviewed_at = new Date().toISOString();
    }
  }

  if (proposed_hs_code !== undefined) updatePayload.proposed_hs_code = proposed_hs_code;
  if (notes !== undefined) updatePayload.notes = notes;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("hs_code_reviews")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update HS code review", code: "hs_code_review_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
