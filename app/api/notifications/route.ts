import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// GET /api/notifications — the caller's own notifications
// (notifications_owner_read policy scopes this automatically). Note:
// per the schema, this only works for buyers — notifications.user_id
// has no FK path for suppliers yet (see lib/notifications/dispatch.ts).
export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (unreadOnly) query = query.is("read_at", null);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Could not load notifications", code: "notifications_fetch_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data, page, limit, total: count });
}
