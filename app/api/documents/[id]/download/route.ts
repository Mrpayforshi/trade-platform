import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// GET /api/documents/[id]/download
// Bucket is private, so there's no public file_url to hand back directly.
// Instead: (1) try to read the documents row through the RLS-scoped
// client — if that succeeds, the caller is authorized per the same
// ownership rules as everything else; (2) only then generate a short-lived
// signed URL for the underlying storage object.
export async function GET(
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

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, file_url, deleted_at")
    .eq("id", id)
    .single();

  if (error || !doc) {
    // RLS makes an unauthorized doc indistinguishable from a nonexistent
    // one at the query level — both return no row, so both get a 404
    // rather than leaking which case it is.
    return NextResponse.json(
      { error: "Document not found", code: "document_not_found" },
      { status: 404 }
    );
  }

  if (doc.deleted_at) {
    return NextResponse.json(
      { error: "Document has been deleted", code: "document_deleted" },
      { status: 410 }
    );
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_url, 60 * 5); // 5 minute expiry

  if (signError || !signed) {
    return NextResponse.json(
      { error: "Could not generate download link", code: "signed_url_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { url: signed.signedUrl, expires_in: 300 } });
}
