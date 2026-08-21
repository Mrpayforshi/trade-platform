import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// GET /api/categories — public, no auth. RLS already restricts this to
// is_enabled = true for anonymous callers, but we still filter explicitly
// here so the intent is readable without having to go check the DB policy.
export async function GET() {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, is_high_risk, commission_rate")
    .eq("is_enabled", true)
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: "Could not load categories", code: "categories_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
