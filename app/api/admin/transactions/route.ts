import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

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

// POST /api/admin/transactions
// NOTE: there is no `quotes` table in the schema yet — quote negotiation
// currently happens outside the platform (per the ops-mediated model).
// This route is the manual handoff point: ops confirms a quote was
// accepted off-platform and creates the transaction record here. State
// always starts at 'quote_accepted' per the schema default — this route
// does not accept a state override, that's what the [id]/state route is for.
export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { buyer_id, supplier_id, category_id, rfq_id, total_value_usd, compliance_required } = body;

  if (!buyer_id || !supplier_id || !category_id || !total_value_usd) {
    return NextResponse.json(
      {
        error: "buyer_id, supplier_id, category_id, and total_value_usd are required",
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  // Service role: same reasoning as the state-transition route — there is
  // no client insert policy on transactions at all, by design.
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("transactions")
    .insert({
      buyer_id,
      supplier_id,
      category_id,
      rfq_id: rfq_id ?? null,
      total_value_usd,
      compliance_required: compliance_required ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create transaction", code: "transaction_insert_failed" },
      { status: 500 }
    );
  }

  // If this transaction closes out an RFQ, reflect that — but don't fail
  // the whole request if this secondary update has a problem.
  if (rfq_id) {
    await service.from("rfqs").update({ status: "assigned" }).eq("id", rfq_id);
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/admin/transactions — full ops queue, filterable by state.
export async function GET(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .order("state_changed_at", { ascending: false })
    .range(from, to);

  if (state) query = query.eq("state", state);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load transactions", code: "transactions_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
