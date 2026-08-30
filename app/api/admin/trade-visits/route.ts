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

// POST /api/admin/trade-visits
// Ops-created for now, matching the schema (only admin_full_access_trade_visits
// grants INSERT -- buyers can only SELECT their own via
// buyer_reads_own_trade_visits). A self-service "buyer requests a trip"
// flow is a real product decision (Section 4.2, "See It Yourself"), not
// something to assume here -- flagging it rather than quietly building it.
export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { buyer_id, category_id, travel_start_date, travel_end_date } = body;

  if (!buyer_id) {
    return NextResponse.json(
      { error: "buyer_id is required", code: "validation_failed" },
      { status: 422 }
    );
  }

  const insertPayload: Record<string, unknown> = { buyer_id };
  if (category_id) insertPayload.category_id = category_id;
  if (travel_start_date) insertPayload.travel_start_date = travel_start_date;
  if (travel_end_date) insertPayload.travel_end_date = travel_end_date;

  const { data, error } = await supabase
    .from("trade_visits")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create trade visit", code: "trade_visit_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/admin/trade-visits — filterable by status/buyer_id. Also
// backs the Trip-to-purchase conversion KPI: filter status=completed and
// check resulted_in_transaction_id fill rate client-side, or add a
// summary mode here later if that becomes a recurring report.
export async function GET(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const buyerId = searchParams.get("buyer_id");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("trade_visits")
    .select("*", { count: "exact" })
    .order("travel_start_date", { ascending: true, nullsFirst: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (buyerId) query = query.eq("buyer_id", buyerId);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load trade visits", code: "trade_visits_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
