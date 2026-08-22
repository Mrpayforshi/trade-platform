import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM =
  process.env.RESEND_FROM_EMAIL ?? "TradeLink <notifications@tradelink.example>";

// Subject lines by event_type. event_type is free text on the notifications
// table (no enum), so this is a best-effort lookup with a generic fallback
// rather than an exhaustive switch — add entries as new event types show up
// in practice instead of trying to enumerate them all up front.
const SUBJECTS: Record<string, string> = {
  rfq_submitted: "Your RFQ has been submitted",
  transaction_funded: "Payment received",
  compliance_case_opened: "Compliance review started",
  compliance_case_approved: "Compliance approved",
  compliance_case_rejected: "Compliance case update",
  supplier_dispatched: "Your order has shipped",
  transaction_delivered: "Delivery confirmed",
};

export async function sendEmail(to: string, eventType: string, content: string) {
  const subject = SUBJECTS[eventType] ?? "TradeLink update";
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    text: content,
  });
  if (error) {
    // Let the caller (send.ts) catch this and mark the row failed —
    // deliberately not swallowing it here.
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  }
}
