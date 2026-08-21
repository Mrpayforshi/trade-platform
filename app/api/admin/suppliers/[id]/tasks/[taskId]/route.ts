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

const VALID_STATUSES = ["pending", "in_progress", "completed", "failed", "waived"];

// PATCH /api/admin/suppliers/[id]/tasks/[taskId]
// Advances a single admission task's status. Deliberately does NOT check
// whether all tasks are complete and flip the supplier to 'active' —
// that's a separate, explicit ops decision via PATCH /suppliers/[id],
// not an automatic side effect of finishing the last checklist item.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { taskId } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { status, notes, evidence_document_id } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      {
        error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  const updatePayload: Record<string, unknown> = { status };
  if (notes !== undefined) updatePayload.notes = notes;
  if (evidence_document_id !== undefined) updatePayload.evidence_document_id = evidence_document_id;
  if (status === "completed" || status === "failed" || status === "waived") {
    updatePayload.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("supplier_admission_tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update admission task", code: "task_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
