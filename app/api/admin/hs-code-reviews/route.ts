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

// POST /api/admin/hs-code-reviews
// Named directly in the plan's Major Risks mitigation table (Section 21:
// "Incorrect HS classification — High impact — Human compliance review +
// official tariff tools + conservative escalation"). Created as 'pending'
// against an rfq_id; reviewed_by/reviewed_at are set on PATCH by whoever
// actually does the review, not accepted as input here.
export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { rfq_id, proposed_hs_code, notes } = body;

  if (!rfq_id) {
    return NextResponse.json(
      { error: "rfq_id is required", code: "validation_failed" },
      { status: 422 }
    );
  }

  const insertPayload: Record<string, unknown> = { rfq_id };
  if (proposed_hs_code) insertPayload.proposed_hs_code = proposed_hs_code;
  if (notes) insertPayload.notes = notes;

  const { data, error } = await supabase
    .from("hs_code_reviews")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create HS code review", code: "hs_code_review_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/admin/hs-code-reviews — filterable list, e.g. status=pending
// to work a review queue, or rfq_id to check a specific RFQ's history.
export async function GET(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const rfqId = searchParams.get("rfq_id");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("hs_code_reviews")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (rfqId) query = query.eq("rfq_id", rfqId);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load HS code reviews", code: "hs_code_reviews_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
