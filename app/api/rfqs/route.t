import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// POST /api/rfqs — buyer submits a request for quote.
// Auth required. Category must be enabled (high-risk categories default to
// disabled per Part 1.4 — an RFQ against a disabled/high-risk category is
// rejected here rather than silently accepted).
export async function POST(request: Request) {
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

  const body = await request.json();
  const { category_id, quantity, specification } = body;

  if (!category_id || !specification) {
    return NextResponse.json(
      {
        error: "category_id and specification are required",
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  // Confirm the buyer has a `users` row (created at signup/onboarding)
  const { data: buyer } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (!buyer) {
    return NextResponse.json(
      { error: "Buyer profile not found", code: "buyer_profile_missing" },
      { status: 404 }
    );
  }

  // Category must exist and be enabled — do not trust the client's claim
  // that a category is orderable
  const { data: category } = await supabase
    .from("categories")
    .select("id, is_enabled, is_high_risk")
    .eq("id", category_id)
    .single();

  if (!category || !category.is_enabled) {
    return NextResponse.json(
      {
        error: "This category is not currently orderable",
        code: "category_disabled",
      },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("rfqs")
    .insert({
      buyer_id: buyer.id,
      category_id,
      quantity: quantity ?? null,
      specification,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not submit RFQ", code: "rfq_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/rfqs — buyer's own RFQs only (RLS-enforced), paginated per
// Part 1.5: default 20, max 50.
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("rfqs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json(
      { error: "Could not load RFQs", code: "rfqs_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
