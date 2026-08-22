import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "./providers/email";
import { sendWhatsApp } from "./providers/whatsapp";

const BATCH_SIZE = 25;

// Reads notifications.status = 'pending' rows (created by notifyUser() in
// dispatch.ts) and actually sends them. This is the piece dispatch.ts's
// comment explicitly flagged as missing — it deliberately only wrote rows
// before now.
//
// Requires a service-role client: notifications has no INSERT/UPDATE
// policy for the authenticated role (system-generated only), same pattern
// as transactions/platform_fees.
//
// 'push' channel rows are left untouched — no push provider decision has
// been made yet (email + WhatsApp only, per Tadiwa/Jernaid). They'll sit
// as 'pending' until a push provider is chosen; that's intentional, not
// a bug.
//
// KNOWN SIMPLIFICATION: sent_at and delivered_at are both set at the
// moment the provider API call succeeds. That's accurate for sent_at
// (the API accepted the message) but optimistic for delivered_at — actual
// delivery confirmation would need Resend/Twilio delivery webhooks, which
// aren't wired up. If the "on-time delivery" / delivery-tracking KPIs
// ever need to distinguish sent-vs-delivered notifications specifically
// (as opposed to shipment delivery), that's the gap to close first.
export async function processPendingNotifications(serviceClient: SupabaseClient) {
  const { data: pending, error } = await serviceClient
    .from("notifications")
    .select("id, user_id, channel, event_type, content")
    .eq("status", "pending")
    .in("channel", ["email", "whatsapp"])
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("[notifications] failed to load pending rows", error);
    return { processed: 0, sent: 0, failed: 0, error: error.message };
  }
  if (!pending || pending.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    const { data: user } = await serviceClient
      .from("users")
      .select("email, phone")
      .eq("id", row.user_id)
      .maybeSingle();

    let ok = false;
    try {
      if (row.channel === "email") {
        if (!user?.email) throw new Error("no email on file for this user");
        await sendEmail(user.email, row.event_type, row.content);
        ok = true;
      } else if (row.channel === "whatsapp") {
        if (!user?.phone) throw new Error("no phone on file for this user");
        await sendWhatsApp(user.phone, row.content);
        ok = true;
      }
    } catch (err) {
      console.error(
        `[notifications] send failed for row ${row.id} (${row.channel})`,
        err
      );
      ok = false;
    }

    const now = new Date().toISOString();
    await serviceClient
      .from("notifications")
      .update(
        ok
          ? { status: "sent", sent_at: now, delivered_at: now }
          : { status: "failed" }
      )
      .eq("id", row.id);

    ok ? sent++ : failed++;
  }

  return { processed: pending.length, sent, failed };
}
