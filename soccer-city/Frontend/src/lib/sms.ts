// lib/sms.ts
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER; // format E.164, ex: +15145550123
const ADMIN_PHONE = process.env.ADMIN_NOTIFICATION_PHONE; // format E.164

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/** Convertit un numéro nord-américain saisi librement (ex: "(450) 555-0192") en format E.164 requis par Twilio. */
function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

export async function sendSMS(to: string, body: string) {
  if (!client || !FROM_NUMBER) {
    console.warn("⚠️ Twilio non configuré (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER manquants), SMS non envoyé");
    return;
  }
  try {
    await client.messages.create({
      to: toE164(to),
      from: FROM_NUMBER,
      body,
    });
  } catch (error) {
    // On ne fait jamais échouer le flux principal (réservation/demande) à
    // cause d'un SMS non envoyé — juste un log pour investiguer.
    console.error("❌ Erreur envoi SMS:", error);
  }
}

export async function sendAdminSMS(body: string) {
  if (!ADMIN_PHONE) return;
  await sendSMS(ADMIN_PHONE, body);
}