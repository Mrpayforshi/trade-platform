import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// DELETE /api/documents/[id]
// Soft-delete only — documents are never hard-deleted (Part 1.4). The
// underlying storage object is left in place too; this just marks the
// row so it stops appearing in normal queries. Migration 0007 restricts
// the authenticated role to only being able to UPDATE deleted_at and
// deleted_by on this table, so even a direct PostgREST call couldn't
// touch file_hash/file_url through this policy+grant combination.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Resolve a stable identifier for deleted_by. Prefer the admin_users id
  // if the caller is ops, otherwise fall back to the auth user id itself.
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .single();

  const { data, error } = await supabase
    .from("documents")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: adminUser?.id ?? authUser.id,
    })
    .eq("id", id)
    .select("id, deleted_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not delete document", code: "document_delete_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
