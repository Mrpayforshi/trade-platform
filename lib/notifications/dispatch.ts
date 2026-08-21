import type { SupabaseClient } from "@supabase/supabase-js";

type Channel = "push" | "email" | "whatsapp";

type NotifyParams = {
  userId: string;
  eventType: string;
  content: string;
  channels?: Channel[];
};

// Creates notification rows respecting notification_preferences opt-outs.
//
// IMPORTANT — this does NOT actually send a push/email/WhatsApp message.
// There is no delivery provider wired up yet (Twilio or WhatsApp Business
// API for whatsapp, an email provider for email, a push service for push)
// — that needs real credentials that don't exist yet. This function only
// writes rows with status='pending' so the data model and an in-app
// notification list work today. Delivery is a follow-up once Tadiwa
// picks providers — at that point a background job or webhook would
// read 'pending' rows and actually send them, then update status/sent_at.
//
// KNOWN GAP: notifications.user_id only has an FK to public.users
// (buyers). Suppliers have no path into this table under the current
// schema — calling this with a supplier's id will fail the FK constraint,
// not silently do nothing. Flagging rather than working around it, since
// silently substituting a different table would hide a real schema gap.
//
// Requires the service role client — there is no INSERT policy on
// notifications for the authenticated role, by design (system-generated
// only, same pattern as transactions/platform_fees).
export async function notifyUser(
  serviceClient: SupabaseClient,
  { userId, eventType, content, channels = ["push", "email", "whatsapp"] }: NotifyParams
) {
  const { data: prefs } = await serviceClient
    .from("notification_preferences")
    .select("push_enabled, email_enabled, whatsapp_enabled")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .maybeSingle();

  // No preference row yet means the table's own column defaults apply
  // (all channels enabled) — mirror that here rather than assuming opt-out.
  const enabled: Record<Channel, boolean> = {
    push: prefs?.push_enabled ?? true,
    email: prefs?.email_enabled ?? true,
    whatsapp: prefs?.whatsapp_enabled ?? true,
  };

  const rows = channels
    .filter((channel) => enabled[channel])
    .map((channel) => ({
      user_id: userId,
      channel,
      event_type: eventType,
      content,
      status: "pending" as const,
    }));

  if (rows.length === 0) {
    return { created: 0 };
  }

  const { error } = await serviceClient.from("notifications").insert(rows);

  if (error) {
    // Deliberately non-throwing: a notification failing to queue should
    // never fail the primary action (e.g. a transaction state change)
    // that triggered it. Caller can inspect the returned error if it cares.
    return { created: 0, error };
  }

  return { created: rows.length };
}
