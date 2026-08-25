// lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ⚠️ Tant que votre domaine n'est pas vérifié sur Resend, utilisez leur
// adresse de test "onboarding@resend.dev". Une fois votre domaine
// (ex: soccercity.ca) vérifié dans le dashboard Resend, changez
// RESEND_FROM_EMAIL pour une adresse comme "Soccer City <reservations@soccercity.ca>".
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Soccer City <onboarding@resend.dev>";

// Adresse qui reçoit une notification à chaque nouvelle réservation/demande.
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

// ============================================
// RÉSERVATIONS (paiement confirmé)
// ============================================

interface ReservationEmailParams {
  userName: string;
  userEmail: string;
  userPhone: string;
  fieldName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
}

export async function sendReservationConfirmationEmail(params: ReservationEmailParams) {
  const { userName, userEmail, fieldName, date, startTime, endTime, price } = params;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: "Votre réservation Soccer City est confirmée ⚽",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="color: #1d4ed8; font-size: 22px;">Réservation confirmée !</h1>
          <p>Bonjour ${userName},</p>
          <p>Votre réservation chez <strong>Soccer City</strong> est confirmée. Voici les détails :</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #666;">Terrain</td><td style="padding: 8px 0; font-weight: bold;">${fieldName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; font-weight: bold;">${date}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Heure</td><td style="padding: 8px 0; font-weight: bold;">${startTime} - ${endTime}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Montant payé</td><td style="padding: 8px 0; font-weight: bold;">${price.toFixed(2)} $ CAD</td></tr>
          </table>
          <p style="color: #666; font-size: 14px;">835 Rue Saint-Jacques, Saint-Jean-sur-Richelieu, QC J3B 2N2</p>
          <p>À bientôt sur le terrain !<br/>L'équipe Soccer City</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Erreur envoi courriel de confirmation client:", error);
  }
}

export async function sendAdminNotificationEmail(params: ReservationEmailParams) {
  if (!ADMIN_EMAIL) return;

  const { userName, userEmail, userPhone, fieldName, date, startTime, endTime, price } = params;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Nouvelle réservation — ${fieldName} le ${date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
          <h2 style="font-size: 18px;">Nouvelle réservation payée</h2>
          <p><strong>${userName}</strong><br/>${userEmail} · ${userPhone}</p>
          <p>${fieldName} — ${date} de ${startTime} à ${endTime}</p>
          <p>Montant : <strong>${price.toFixed(2)} $ CAD</strong></p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Erreur envoi courriel notification admin:", error);
  }
}

// ============================================
// ✅ Nouveau : DEMANDES D'ÉVÉNEMENTS PRIVÉS
// ============================================

interface EventRequestEmailParams {
  firstName: string;
  lastName: string;
  company?: string;
  email: string;
  phone: string;
  date: string;
  guests: number;
  type: string;
  message: string;
}

export async function sendEventRequestConfirmationEmail(params: EventRequestEmailParams) {
  const { firstName, lastName, email, date, guests, type } = params;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Votre demande d'événement a bien été reçue — Soccer City",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="color: #1d4ed8; font-size: 22px;">Demande reçue !</h1>
          <p>Bonjour ${firstName} ${lastName},</p>
          <p>Merci pour votre demande d'événement chez <strong>Soccer City</strong>. Notre équipe vous recontacte sous 24 h ouvrables pour confirmer les détails.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #666;">Type d'événement</td><td style="padding: 8px 0; font-weight: bold;">${type}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Date souhaitée</td><td style="padding: 8px 0; font-weight: bold;">${date}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Nombre de personnes</td><td style="padding: 8px 0; font-weight: bold;">${guests}</td></tr>
          </table>
          <p style="color: #666; font-size: 14px;">835 Rue Saint-Jacques, Saint-Jean-sur-Richelieu, QC J3B 2N2</p>
          <p>À bientôt !<br/>L'équipe Soccer City</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Erreur envoi courriel confirmation demande événement:", error);
  }
}

export async function sendEventRequestAdminNotificationEmail(params: EventRequestEmailParams) {
  if (!ADMIN_EMAIL) return;

  const { firstName, lastName, company, email, phone, date, guests, type, message } = params;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Nouvelle demande d'événement — ${type}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
          <h2 style="font-size: 18px;">Nouvelle demande d'événement</h2>
          <p><strong>${firstName} ${lastName}</strong>${company ? ` — ${company}` : ""}<br/>${email} · ${phone}</p>
          <p><strong>${type}</strong> · ${date} · ${guests} personnes</p>
          <p style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">${message}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Erreur envoi courriel notification admin (événement):", error);
  }
}