import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// GET /api/suppliers — public curated browse.
// RLS (suppliers_public_read_active) already restricts anonymous callers
// to admission_status = 'active' AND subscription_status = 'active', but
// we filter explicitly here too so intent is readable without checking
// the DB policy. This is a filtered SQL query, not a search engine —
// deliberately capped, matching the ~10-20 suppliers per category design.
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");
  const limit = Math.min(20, parseInt(searchParams.get("limit") ?? "20", 10));

  let query = supabase
    .from("suppliers")
    .select(
      "id, name, country_of_origin, performance_score, category_ids, subscription_status"
    )
    .eq("admission_status", "active")
    .eq("subscription_status", "active")
    .order("performance_score", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (categoryId) {
    query = query.contains("category_ids", [categoryId]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load suppliers", code: "suppliers_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
