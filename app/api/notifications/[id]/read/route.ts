import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// PATCH /api/notifications/[id]/read
// Sets read_at. Migration 0008 restricts the authenticated role to only
// being able to write this one column on notifications — even a direct
// PostgREST call couldn't rewrite content/event_type through this route
// or any other client path.
export async function PATCH(
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

  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, read_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not mark notification as read", code: "notification_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
