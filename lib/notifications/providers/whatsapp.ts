import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// e.g. 'whatsapp:+14155238886' (Twilio sandbox) or your approved WhatsApp
// Business sender once verified.
const FROM = process.env.TWILIO_WHATSAPP_FROM;

// Minimal E.164 check — strips whitespace/dashes and requires a leading
// '+'. This does NOT add a missing country code for numbers like
// '077xxxxxxx'. That normalization belongs in the phone input at signup,
// not guessed here — a wrong assumed country code would silently send to
// the wrong person's number in another country.
function toE164(phone: string): string {
  const trimmed = phone.replace(/[\s-]/g, "");
  if (!trimmed.startsWith("+")) {
    throw new Error(`Phone number "${phone}" is not in E.164 format (missing +country code)`);
  }
  return trimmed;
}

export async function sendWhatsApp(phone: string, content: string) {
  if (!FROM) {
    throw new Error("TWILIO_WHATSAPP_FROM is not configured");
  }
  const to = toE164(phone);
  await client.messages.create({
    from: FROM,
    to: `whatsapp:${to}`,
    body: content,
  });
}
