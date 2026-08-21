import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Shared ops-auth check — same pattern as the transaction state route:
// confirm the caller is a real admin_users row before doing anything else.
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
    .select("id, role")
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

// POST /api/admin/suppliers — ops creates a new supplier record.
// admission_status defaults to 'pending' per schema — activation happens
// separately once admission tasks are complete (see [id]/route.ts).
export async function POST(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { name, contact_email, contact_phone, country_of_origin, factory_address, category_ids } = body;

  if (!name) {
    return NextResponse.json(
      { error: "name is required", code: "validation_failed" },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name,
      contact_email: contact_email ?? null,
      contact_phone: contact_phone ?? null,
      country_of_origin: country_of_origin ?? "China",
      factory_address: factory_address ?? null,
      category_ids: category_ids ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not create supplier", code: "supplier_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/admin/suppliers — list all suppliers, optionally filtered by
// admission_status (e.g. ?status=pending for the ops admission queue).
export async function GET(request: Request) {
  const { supabase, errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("suppliers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("admission_status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load suppliers", code: "suppliers_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
