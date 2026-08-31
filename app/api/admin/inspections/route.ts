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

const INSPECTION_TYPES = [
  "pre_shipment",
  "in_process",
  "final",
  "post_delivery",
] as const;

// POST /api/admin/inspections
// Ops-only. Scheduling an inspection is an explicit action tied to a
// transaction + supplier — it does not fire automatically off a
// transaction state change (same explicit-action pattern as fee
// creation, supplier activation, and compliance-case approval elsewhere
// in this codebase). RLS backs this up independently: inspections_admin_write
// requires is_admin() on INSERT.
export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const {
    transaction_id,
    supplier_id,
    inspection_type,
    inspection_agency,
    scheduled_date,
  } = body;

  if (!transaction_id || !supplier_id) {
    return NextResponse.json(
      {
        error: "transaction_id and supplier_id are required",
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  if (inspection_type && !INSPECTION_TYPES.includes(inspection_type)) {
    return NextResponse.json(
      {
        error: `inspection_type must be one of: ${INSPECTION_TYPES.join(", ")}`,
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  const insertPayload: Record<string, unknown> = {
    transaction_id,
    supplier_id,
  };
  // Omit inspection_type/status if not provided — let column defaults
  // ('pre_shipment' / 'scheduled') apply rather than assuming here too.
  if (inspection_type) insertPayload.inspection_type = inspection_type;
  if (inspection_agency) insertPayload.inspection_agency = inspection_agency;
  if (scheduled_date) insertPayload.scheduled_date = scheduled_date;

  const { data, error } = await supabase
    .from("inspections")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create inspection", code: "inspection_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/admin/inspections — filterable list.
// summary=true returns pass/fail/waived counts grouped by inspection_type,
// which is the raw input for the "Inspection failure rate" KPI (plan
// Section 19) and eventually supplier_performance.inspection_pass_rate
// once that table has a write path.
export async function GET(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const inspectionType = searchParams.get("inspection_type");
  const transactionId = searchParams.get("transaction_id");
  const supplierId = searchParams.get("supplier_id");
  const summary = searchParams.get("summary") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (summary) {
    let query = supabase.from("inspections").select("inspection_type, status");
    if (transactionId) query = query.eq("transaction_id", transactionId);
    if (supplierId) query = query.eq("supplier_id", supplierId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: "Could not load inspections", code: "inspections_fetch_failed" },
        { status: 500 }
      );
    }

    const totals: Record<
      string,
      { scheduled: number; in_progress: number; passed: number; failed: number; waived: number }
    > = {};
    for (const row of data ?? []) {
      const key = row.inspection_type as string;
      if (!totals[key]) {
        totals[key] = { scheduled: 0, in_progress: 0, passed: 0, failed: 0, waived: 0 };
      }
      totals[key][row.status as keyof (typeof totals)[string]] += 1;
    }

    return NextResponse.json({ data: totals });
  }

  let query = supabase
    .from("inspections")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (inspectionType) query = query.eq("inspection_type", inspectionType);
  if (transactionId) query = query.eq("transaction_id", transactionId);
  if (supplierId) query = query.eq("supplier_id", supplierId);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load inspections", code: "inspections_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
