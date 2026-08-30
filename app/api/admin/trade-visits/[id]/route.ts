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

// trade_visits.status only has a free-form check constraint in the DB
// (no guard trigger like compliance_cases/transactions), so this is an
// app-level soft guard rather than a hard DB constraint. Worth
// upgrading to a real trigger later if trip status starts being set
// from more than one code path.
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  planned: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// GET /api/admin/trade-visits/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("trade_visits")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Trade visit not found", code: "trade_visit_not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PATCH /api/admin/trade-visits/[id]
// Handles status transitions, date corrections, and linking the
// transaction a trip resulted in (the field the Trip-to-purchase
// conversion KPI depends on).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { status: newStatus, travel_start_date, travel_end_date, resulted_in_transaction_id } =
    body;

  const updatePayload: Record<string, unknown> = {};

  if (newStatus) {
    const { data: current, error: fetchError } = await supabase
      .from("trade_visits")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: "Trade visit not found", code: "trade_visit_not_found" },
        { status: 404 }
      );
    }

    const allowed = LEGAL_TRANSITIONS[current.status] ?? [];
    if (current.status !== newStatus && !allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Illegal transition: ${current.status} -> ${newStatus}`,
          code: "illegal_transition",
        },
        { status: 400 }
      );
    }

    updatePayload.status = newStatus;
  }

  if (travel_start_date !== undefined) updatePayload.travel_start_date = travel_start_date;
  if (travel_end_date !== undefined) updatePayload.travel_end_date = travel_end_date;
  if (resulted_in_transaction_id !== undefined) {
    updatePayload.resulted_in_transaction_id = resulted_in_transaction_id;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("trade_visits")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update trade visit", code: "trade_visit_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
