// lib/sms.ts
import "server-only";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER; // format E.164, ex: +15149659693
const ADMIN_PHONE = process.env.ADMIN_NOTIFICATION_PHONE; // format E.164

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Convertit un numéro saisi librement en E.164. Renvoie null si le numéro
 * n'est pas valide (évite d'envoyer des SMS vers des numéros farfelus).
 * Seuls les numéros Canada/États-Unis (+1) sont acceptés : protège contre
 * la fraude aux SMS internationaux surtaxés.
 */
export function toE164(phone: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!client || !FROM_NUMBER) {
    console.warn("⚠️ Twilio non configuré : SMS non envoyé");
    return false;
  }
  const e164 = toE164(to);
  if (!e164) {
    console.warn("⚠️ Numéro invalide ou hors Canada/É.-U. : SMS non envoyé");
    return false;
  }
  try {
    await client.messages.create({ to: e164, from: FROM_NUMBER, body: body.slice(0, 600) });
    return true;
  } catch (error) {
    // Ne jamais faire échouer le flux principal à cause d'un SMS.
    console.error("❌ Erreur envoi SMS:", error);
    return false;
  }
}

export async function sendAdminSMS(body: string): Promise<boolean> {
  if (!ADMIN_PHONE) return false;
  return sendSMS(ADMIN_PHONE, body);
}
