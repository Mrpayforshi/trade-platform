import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Self-service, not admin-gated — notification_preferences RLS is
// notification_prefs_owner_all: a user can only read/write rows where
// user_id matches their own users.id. This route relies on that same
// RLS rather than re-checking ownership in app code, but still derives
// user_id server-side (never from the request body) so a client can't
// even attempt to write another user's row.
async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      supabase,
      userId: null,
      errorResponse: NextResponse.json(
        { error: "Authentication required", code: "unauthenticated" },
        { status: 401 }
      ),
    };
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_user_id", authUser.id)
    .single();

  // NOTE: notification_preferences.user_id FKs to public.users only —
  // same structural gap already flagged on the notifications table
  // itself. A supplier calling this route has no users row and will hit
  // the 403 below, not because they lack permission but because the
  // schema has no seat for supplier notification preferences yet.
  if (!userRow) {
    return {
      supabase,
      userId: null,
      errorResponse: NextResponse.json(
        { error: "No buyer account found for this user", code: "forbidden" },
        { status: 403 }
      ),
    };
  }

  return { supabase, userId: userRow.id as string, errorResponse: null };
}

// GET /api/notification-preferences — the caller's own preference rows.
// No rows for a given event_type simply means "use the column defaults"
// (push/email/whatsapp all default to true) — this route does not
// materialize default rows on read.
export async function GET() {
  const { supabase, userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .order("event_type", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Could not load notification preferences", code: "notification_preferences_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// PUT /api/notification-preferences
// Upsert on (user_id, event_type) — the live unique constraint
// notification_preferences_user_id_event_type_key. Body: { event_type,
// push_enabled?, email_enabled?, whatsapp_enabled? }. Only event_type is
// required; omitted channel flags fall back to their column defaults
// (true) on first creation, or stay unchanged on an existing row since
// upsert here only overwrites the keys actually present in the payload.
export async function PUT(request: Request) {
  const { supabase, userId, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const body = await request.json();
  const { event_type, push_enabled, email_enabled, whatsapp_enabled } = body;

  if (!event_type) {
    return NextResponse.json(
      { error: "event_type is required", code: "validation_failed" },
      { status: 422 }
    );
  }

  const upsertPayload: Record<string, unknown> = { user_id: userId, event_type };
  if (push_enabled !== undefined) upsertPayload.push_enabled = push_enabled;
  if (email_enabled !== undefined) upsertPayload.email_enabled = email_enabled;
  if (whatsapp_enabled !== undefined) upsertPayload.whatsapp_enabled = whatsapp_enabled;

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(upsertPayload, { onConflict: "user_id,event_type" })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not update notification preferences", code: "notification_preferences_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
