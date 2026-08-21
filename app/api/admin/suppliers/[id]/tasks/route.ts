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

// GET /api/admin/suppliers/[id]/tasks — the admission checklist for one
// supplier (9 possible task_types per the Phase 0 schema).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("supplier_admission_tasks")
    .select("*")
    .eq("supplier_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Could not load admission tasks", code: "tasks_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// POST /api/admin/suppliers/[id]/tasks — assign a new admission task.
// task_type must be one of the 9 enum values; the DB will reject anything
// else, but we validate here too so the error message is actually useful.
const VALID_TASK_TYPES = [
  "identity_verification",
  "ownership_check",
  "factory_verification",
  "product_cert_review",
  "export_capability",
  "bank_verification",
  "reference_check",
  "sample_order",
  "sla_agreement",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, adminUser, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { task_type, due_date, notes, assigned_to } = body;

  if (!task_type || !VALID_TASK_TYPES.includes(task_type)) {
    return NextResponse.json(
      {
        error: `task_type must be one of: ${VALID_TASK_TYPES.join(", ")}`,
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("supplier_admission_tasks")
    .insert({
      supplier_id: id,
      task_type,
      due_date: due_date ?? null,
      notes: notes ?? null,
      // Defaults to the creating ops user if no explicit assignee given
      assigned_to: assigned_to ?? adminUser!.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create admission task", code: "task_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
