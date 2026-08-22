import { NextResponse } from "next/server";
// ASSUMPTION: I'm guessing this import path/export name based on the
// naming convention of createServerSupabase in lib/supabase/server.ts.
// GitHub content-fetch was down when this was written so I couldn't
// confirm your actual service-role client's location — if it lives
// somewhere else (e.g. lib/supabase/admin.ts), just fix this one import.
import { createServiceSupabase } from "@/lib/supabase/service";
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

  const serviceClient = createServiceSupabase();
  const result = await processPendingNotifications(serviceClient);

  return NextResponse.json(result);
}
