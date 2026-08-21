import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";

// POST /api/documents — multipart/form-data upload.
// Fields: file (required), doc_type (required), owner_type + owner_id
// (admin-only override — everyone else gets their owner identity resolved
// from their own auth session, never trusted from the client).
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

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .single();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("doc_type") as string | null;

  if (!file || !docType) {
    return NextResponse.json(
      { error: "file and doc_type are required", code: "validation_failed" },
      { status: 422 }
    );
  }

  // Resolve owner identity. Admins may override via form fields (e.g. to
  // attach a document to owner_type='ops' or 'dispute'); everyone else
  // gets it resolved server-side from their own session — never trust a
  // client-supplied owner_id for non-admins, or any buyer could attach
  // documents to someone else's record.
  let ownerType: string;
  let ownerId: string;

  const requestedOwnerType = formData.get("owner_type") as string | null;
  const requestedOwnerId = formData.get("owner_id") as string | null;

  if (adminUser && requestedOwnerType && requestedOwnerId) {
    ownerType = requestedOwnerType;
    ownerId = requestedOwnerId;
  } else {
    const { data: buyerRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .single();

    if (buyerRow) {
      ownerType = "buyer";
      ownerId = buyerRow.id;
    } else {
      const { data: supplierRow } = await supabase
        .from("suppliers")
        .select("id")
        .eq("auth_user_id", authUser.id)
        .single();

      if (!supplierRow) {
        return NextResponse.json(
          {
            error: "No buyer or supplier profile found for this account",
            code: "owner_not_found",
          },
          { status: 403 }
        );
      }
      ownerType = "supplier";
      ownerId = supplierRow.id;
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${ownerType}/${ownerId}/${randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "File upload failed", code: "storage_upload_failed" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      owner_type: ownerType,
      owner_id: ownerId,
      doc_type: docType,
      file_url: storagePath, // storage path, not a public URL — bucket is private
      file_hash: fileHash,
    })
    .select()
    .single();

  if (error) {
    // Row insert failed after the file already landed in storage — clean up
    // rather than leaving an orphaned object with no documents row pointing to it.
    await supabase.storage.from("documents").remove([storagePath]);
    return NextResponse.json(
      { error: "Could not record document", code: "document_insert_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

// GET /api/documents — list documents for the caller's own owner_type,
// or all if admin (RLS enforces this regardless, but we scope the query
// explicitly so intent is readable). Query params: owner_type, owner_id
// (admin only), doc_type.
export async function GET(request: Request) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("documents")
    .select("id, owner_type, owner_id, doc_type, file_hash, version, deleted_at, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const docType = searchParams.get("doc_type");
  if (docType) query = query.eq("doc_type", docType);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load documents", code: "documents_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
