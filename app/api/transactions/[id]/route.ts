import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// GET /api/transactions/[id] — single transaction, RLS-scoped to the
// caller being the buyer, the supplier, or an admin. Includes the
// landed cost estimate inline since a buyer/supplier viewing a
// transaction almost always wants that alongside it.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { error: "Authentication required", code: "unauthenticated" },
      { status: 401 }
    );
  }

  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !transaction) {
    // RLS makes "exists but not yours" indistinguishable from "doesn't
    // exist" at the query level — both return no row, both get a 404.
    return NextResponse.json(
      { error: "Transaction not found", code: "transaction_not_found" },
      { status: 404 }
    );
  }

  const { data: landedCost } = await supabase
    .from("landed_cost_estimates")
    .select("*")
    .eq("transaction_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ data: { ...transaction, landed_cost_estimate: landedCost ?? null } });
}
