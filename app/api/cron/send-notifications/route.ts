import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { processPendingNotifications } from "@/lib/notifications/send";

// GET /api/cron/send-notifications
// Triggered by Vercel Cron (see vercel.json). Vercel signs cron requests
// with an Authorization header — this checks it against CRON_SECRET so
// the endpoint can't be hit by anyone who finds the URL.
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();
  const result = await processPendingNotifications(serviceClient);

  return NextResponse.json(result);
}
