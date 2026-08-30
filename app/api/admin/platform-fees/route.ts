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

const FEE_TYPES = [
  "transaction_commission",
  "buyer_service_fee",
  "freight_margin",
  "clearing_coordination_fee",
  "inspection_fee",
  "trade_visit_fee",
] as const;

// POST /api/admin/platform-fees
// Ops-only, explicit action — deliberately NOT auto-created off a
// transaction state change. The plan's pricing logic (Section 10:
// "tiered by category/order value", "% of completed trade value") isn't
// a precise enough rule to safely automate yet, and fee creation is
// exactly the kind of financially-consequential action that should stay
// an explicit ops call rather than a side effect, matching how supplier
// activation and compliance approval already work in this codebase.
export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { transaction_id, fee_type, amount, currency, status } = body;

  if (!transaction_id || !fee_type || amount === undefined || amount === null) {
    return NextResponse.json(
      {
        error: "transaction_id, fee_type, and amount are required",
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  if (!FEE_TYPES.includes(fee_type)) {
    return NextResponse.json(
      {
        error: `fee_type must be one of: ${FEE_TYPES.join(", ")}`,
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  const insertPayload: Record<string, unknown> = {
    transaction_id,
    fee_type,
    amount,
  };
  if (currency) insertPayload.currency = currency;
  // Omit status entirely if not provided — let the column default
  // ('pending') apply rather than assuming that value here too.
  if (status) insertPayload.status = status;

  const { data, error } = await supabase
    .from("platform_fees")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create platform fee", code: "fee_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/admin/platform-fees — filterable list for revenue reporting.
// Supports the KPIs that depend on realized vs pending revenue: filter
// by status/fee_type/transaction_id, or pass summary=true to get totals
// grouped by fee_type instead of row-level data.
export async function GET(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const feeType = searchParams.get("fee_type");
  const transactionId = searchParams.get("transaction_id");
  const summary = searchParams.get("summary") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (summary) {
    // Row-level aggregation done in JS rather than a DB view, since this
    // is a small table for now and a dedicated reporting view can be
    // added later if the row count grows enough to matter.
    let query = supabase.from("platform_fees").select("fee_type, status, amount, currency");
    if (status) query = query.eq("status", status);
    if (feeType) query = query.eq("fee_type", feeType);
    if (transactionId) query = query.eq("transaction_id", transactionId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: "Could not load platform fees", code: "fees_fetch_failed" },
        { status: 500 }
      );
    }

    const totals: Record<string, { count: number; amount: number; currency: string }> = {};
    for (const row of data ?? []) {
      const key = row.fee_type as string;
      if (!totals[key]) {
        totals[key] = { count: 0, amount: 0, currency: row.currency };
      }
      totals[key].count += 1;
      totals[key].amount += Number(row.amount);
    }

    return NextResponse.json({ data: totals });
  }

  let query = supabase
    .from("platform_fees")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (feeType) query = query.eq("fee_type", feeType);
  if (transactionId) query = query.eq("transaction_id", transactionId);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load platform fees", code: "fees_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
