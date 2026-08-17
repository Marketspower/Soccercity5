// lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ⚠️ Tant que votre domaine n'est pas vérifié sur Resend, utilisez leur
// adresse de test "onboarding@resend.dev". Une fois votre domaine
// (ex: soccercity.ca) vérifié dans le dashboard Resend, changez
// RESEND_FROM_EMAIL pour une adresse comme "Soccer City <reservations@soccercity.ca>".
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Soccer City <onboarding@resend.dev>";

// Adresse qui reçoit une notification à chaque nouvelle réservation payée.
// Optionnel : si non définie, aucune notification admin n'est envoyée.
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

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
    // On log l'erreur mais on ne fait jamais échouer le webhook à cause d'un
    // courriel non envoyé : la réservation reste valide même si le courriel rate.
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
