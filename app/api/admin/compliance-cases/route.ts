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

// POST /api/admin/compliance-cases
// Ops opens a case for a category that requires_compliance. If a
// transaction_id is supplied, the transaction's compliance_case_id and
// compliance_required get linked in the same call — a compliance case
// with no transaction pointing back to it is an orphan that never
// surfaces anywhere in the transaction flow.
export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { category_id, transaction_id, buyer_submitted_reference, sla_deadline } = body;

  if (!category_id) {
    return NextResponse.json(
      { error: "category_id is required", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { data: caseRow, error: caseError } = await supabase
    .from("compliance_cases")
    .insert({
      category_id,
      buyer_submitted_reference: buyer_submitted_reference ?? null,
      sla_deadline: sla_deadline ?? null,
    })
    .select()
    .single();

  if (caseError) {
    return NextResponse.json(
      { error: "Could not create compliance case", code: "case_insert_failed" },
      { status: 500 }
    );
  }

  if (transaction_id) {
    const { error: linkError } = await supabase
      .from("transactions")
      .update({ compliance_case_id: caseRow.id, compliance_required: true })
      .eq("id", transaction_id);

    if (linkError) {
      // Case exists but the link failed — surface this rather than
      // silently returning success with a half-done operation.
      return NextResponse.json(
        {
          data: caseRow,
          warning: "Case created but could not link to transaction",
          code: "transaction_link_failed",
        },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ data: caseRow }, { status: 201 });
}

// GET /api/admin/compliance-cases — filterable by status, with SLA
// breach visibility (sla_deadline in the past and still not resolved).
export async function GET(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const overdue = searchParams.get("overdue") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("compliance_cases")
    .select("*", { count: "exact" })
    .order("sla_deadline", { ascending: true, nullsFirst: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (overdue) {
    query = query
      .lt("sla_deadline", new Date().toISOString())
      .not("status", "in", "(approved,rejected)");
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load compliance cases", code: "cases_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
