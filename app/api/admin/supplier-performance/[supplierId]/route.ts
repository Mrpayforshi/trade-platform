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

const RATE_FIELDS = [
  "on_time_rate",
  "conformity_rate",
  "inspection_pass_rate",
  "dispute_rate",
  "lead_time_accuracy",
] as const;

// GET /api/admin/supplier-performance/[supplierId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("supplier_performance")
    .select("*")
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Could not load supplier performance record", code: "supplier_performance_fetch_failed" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "No performance record for this supplier yet", code: "supplier_performance_not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PATCH /api/admin/supplier-performance/[supplierId]
// Upsert on supplier_id (unique) rather than separate POST/PATCH routes,
// since this table is a one-row-per-supplier scorecard, not a log —
// there's no "create" event distinct from "update the numbers."
//
// IMPORTANT — manual entry only, no automated computation path:
// on_time_rate / lead_time_accuracy have no source table to derive from
// yet, and dispute_rate has no `disputes` table at all (transactions.state
// has a 'disputed' value, but nothing records dispute outcomes). Only
// inspection_pass_rate could theoretically be computed from `inspections`
// today, but this route does not do that automatically — ops enters a
// number, same as transaction_actual_costs. Automating any of these is a
// real product/data decision, not assumed here.
//
// Note: the plan's supplier performance score (Section 6) also lists
// customer satisfaction, warranty/after-sales performance, and
// documentation accuracy — none of which exist as columns on this table.
// That's a pre-existing schema gap, not something this route works around.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();

  const updatePayload: Record<string, unknown> = { supplier_id: supplierId };
  let hasRateField = false;

  for (const field of RATE_FIELDS) {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (Number.isNaN(value)) {
        return NextResponse.json(
          { error: `${field} must be a number`, code: "validation_failed" },
          { status: 422 }
        );
      }
      updatePayload[field] = value;
      hasRateField = true;
    }
  }

  if (!hasRateField) {
    return NextResponse.json(
      {
        error: `At least one of: ${RATE_FIELDS.join(", ")} is required`,
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("supplier_performance")
    .upsert(updatePayload, { onConflict: "supplier_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update supplier performance record", code: "supplier_performance_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
