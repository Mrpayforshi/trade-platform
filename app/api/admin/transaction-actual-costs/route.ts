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

const COST_TYPES = [
  "product",
  "freight",
  "insurance",
  "duty",
  "clearing",
  "delivery",
  "payment_processing",
  "fx",
  "other",
] as const;

// POST /api/admin/transaction-actual-costs
// Ops manually enters realized cost line items after the fact (freight
// bills, duty paid, clearing invoices) -- there is no automated path for
// this data, by design; it depends on ops actually doing the entry.
// Gross profit per transaction = sum(platform_fees for the transaction)
// minus sum(transaction_actual_costs for the transaction).
export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { transaction_id, cost_type, amount, currency, incurred_at, notes } = body;

  if (!transaction_id || !cost_type || amount === undefined || amount === null) {
    return NextResponse.json(
      {
        error: "transaction_id, cost_type, and amount are required",
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  if (!COST_TYPES.includes(cost_type)) {
    return NextResponse.json(
      {
        error: `cost_type must be one of: ${COST_TYPES.join(", ")}`,
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  const insertPayload: Record<string, unknown> = {
    transaction_id,
    cost_type,
    amount,
  };
  if (currency) insertPayload.currency = currency;
  if (incurred_at) insertPayload.incurred_at = incurred_at;
  if (notes) insertPayload.notes = notes;

  const { data, error } = await supabase
    .from("transaction_actual_costs")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create cost entry", code: "cost_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/admin/transaction-actual-costs?transaction_id=...
// Optionally pass summary=true to get a total per transaction instead of
// row-level entries -- useful for a gross-profit-per-transaction view.
export async function GET(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("transaction_id");
  const costType = searchParams.get("cost_type");
  const summary = searchParams.get("summary") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (summary) {
    let query = supabase.from("transaction_actual_costs").select("transaction_id, amount, currency");
    if (transactionId) query = query.eq("transaction_id", transactionId);
    if (costType) query = query.eq("cost_type", costType);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: "Could not load cost entries", code: "costs_fetch_failed" },
        { status: 500 }
      );
    }

    const totals: Record<string, { count: number; amount: number; currency: string }> = {};
    for (const row of data ?? []) {
      const key = row.transaction_id as string;
      if (!totals[key]) {
        totals[key] = { count: 0, amount: 0, currency: row.currency };
      }
      totals[key].count += 1;
      totals[key].amount += Number(row.amount);
    }

    return NextResponse.json({ data: totals });
  }

  let query = supabase
    .from("transaction_actual_costs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (transactionId) query = query.eq("transaction_id", transactionId);
  if (costType) query = query.eq("cost_type", costType);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load cost entries", code: "costs_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}

// DELETE /api/admin/transaction-actual-costs?id=...
// For miskeyed entries. amount/cost_type/transaction_id are not
// PATCH-able by design -- a wrong entry gets deleted and re-entered, not
// mutated, so trg_audit_transaction_actual_costs keeps an honest record
// of what was actually recorded when, matching the platform_fees pattern.
export async function DELETE(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id query param is required", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { error } = await supabase.from("transaction_actual_costs").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Could not delete cost entry", code: "cost_delete_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { deleted: true, id } });
}
