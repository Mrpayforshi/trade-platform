import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// GET /api/transactions — the caller's own transactions (buyer or
// supplier side — transactions_buyer_read policy covers both via OR).
// No manual owner filtering needed here: RLS already restricts rows to
// ones where the caller is the buyer, the supplier, or an admin.
export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
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
