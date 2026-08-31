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

// GET /api/admin/compliance-rules/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("compliance_rules")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Compliance rule not found", code: "compliance_rule_not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PATCH /api/admin/compliance-rules/[id]
// Unlike platform_fees/inspections, this is config data, not a
// transactional record — every field is editable, including category_id.
// Editing an in-use rule does not retroactively change already-created
// compliance_cases (they don't reference compliance_rules directly), so
// there's no history-integrity reason to lock fields down here.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { category_id, rule_name, required_documents, sla_days, is_active } = body;

  const updatePayload: Record<string, unknown> = {};
  if (category_id !== undefined) updatePayload.category_id = category_id;
  if (rule_name !== undefined) updatePayload.rule_name = rule_name;
  if (required_documents !== undefined) updatePayload.required_documents = required_documents;
  if (sla_days !== undefined) updatePayload.sla_days = sla_days;
  if (is_active !== undefined) updatePayload.is_active = is_active;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("compliance_rules")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update compliance rule", code: "compliance_rule_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
