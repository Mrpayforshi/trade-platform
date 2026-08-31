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

// POST /api/admin/compliance-rules
// Backs the Compliance Decision Engine (plan Section 7.1): maps a
// category to its required documents and SLA. This is reference/config
// data, not a transactional record — no state machine, just create/edit/
// deactivate. is_active is the soft-deactivation flag; there's no DELETE
// route because a rule that's been used shouldn't disappear from history,
// only stop applying going forward.
export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { category_id, rule_name, required_documents, sla_days, is_active } = body;

  if (!category_id || !rule_name) {
    return NextResponse.json(
      { error: "category_id and rule_name are required", code: "validation_failed" },
      { status: 422 }
    );
  }

  const insertPayload: Record<string, unknown> = { category_id, rule_name };
  if (required_documents !== undefined) insertPayload.required_documents = required_documents;
  if (sla_days !== undefined) insertPayload.sla_days = sla_days;
  if (is_active !== undefined) insertPayload.is_active = is_active;

  const { data, error } = await supabase
    .from("compliance_rules")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create compliance rule", code: "compliance_rule_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/admin/compliance-rules — filterable list. is_active defaults
// to showing only active rules (what the Compliance Decision Engine
// would actually apply); pass ?is_active=all to see deactivated rules too.
export async function GET(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");
  const isActiveParam = searchParams.get("is_active");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("compliance_rules")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (isActiveParam === "true") query = query.eq("is_active", true);
  else if (isActiveParam === "false") query = query.eq("is_active", false);
  else if (isActiveParam !== "all") query = query.eq("is_active", true);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load compliance rules", code: "compliance_rules_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
