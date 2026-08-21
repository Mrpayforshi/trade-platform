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

// GET /api/admin/suppliers/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Supplier not found", code: "supplier_not_found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PATCH /api/admin/suppliers/[id]
// Handles admission_status transitions (e.g. pending -> active/rejected/
// suspended) and general field updates (bank_account_verified,
// category_ids, etc). Note: this does NOT enforce that admission tasks
// are complete before allowing activation — that check belongs in the
// tasks route or a future DB trigger, not silently assumed here.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const allowedFields = [
    "admission_status",
    "category_ids",
    "performance_score",
    "subscription_status",
    "subscription_expires_at",
    "contact_email",
    "contact_phone",
    "factory_address",
    "bank_account_verified",
  ];

  const updatePayload: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updatePayload[field] = body[field];
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("suppliers")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update supplier", code: "supplier_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
