import { NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

// POST /api/admin/suppliers/[id]/invite
// Ops sends an auth invite to a supplier's contact email. The invite is
// tagged with { role: 'supplier', supplier_id } in user metadata — the
// handle_new_auth_user trigger (migration 0006) reads this to link the
// new auth.users row onto the EXISTING suppliers row instead of creating
// a duplicate buyer profile.
//
// Requires the service role client because inviteUserByEmail is an admin
// Auth API call, not a regular table write — createServerSupabase (the
// RLS-scoped client) has no access to auth.admin.*.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authClient = await createServerSupabase();

  const {
    data: { user: authUser },
  } = await authClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json(
      { error: "Authentication required", code: "unauthenticated" },
      { status: 401 }
    );
  }

  const { data: adminUser } = await authClient
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .single();

  if (!adminUser) {
    return NextResponse.json(
      { error: "Ops access required", code: "forbidden" },
      { status: 403 }
    );
  }

  // Confirm the supplier exists and isn't already linked to an auth account
  const { data: supplier } = await authClient
    .from("suppliers")
    .select("id, contact_email, auth_user_id")
    .eq("id", id)
    .single();

  if (!supplier) {
    return NextResponse.json(
      { error: "Supplier not found", code: "supplier_not_found" },
      { status: 404 }
    );
  }

  if (supplier.auth_user_id) {
    return NextResponse.json(
      {
        error: "Supplier already has a linked auth account",
        code: "already_linked",
      },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const inviteEmail = body.email ?? supplier.contact_email;

  if (!inviteEmail) {
    return NextResponse.json(
      {
        error: "No contact_email on file and no email provided in request body",
        code: "validation_failed",
      },
      { status: 422 }
    );
  }

  const service = createServiceRoleClient();
  const { data, error } = await service.auth.admin.inviteUserByEmail(
    inviteEmail,
    {
      data: {
        role: "supplier",
        supplier_id: id,
      },
    }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message, code: "invite_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { invited_email: inviteEmail, user_id: data.user?.id } }, { status: 201 });
}
