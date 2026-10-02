// lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ⚠️ Tant que votre domaine n'est pas vérifié sur Resend, utilisez leur
// adresse de test "onboarding@resend.dev". Une fois votre domaine
// (ex: soccercity.ca) vérifié dans le dashboard Resend, changez
// RESEND_FROM_EMAIL pour une adresse comme "Soccer City <reservations@soccercity.ca>".
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Soccer City <onboarding@resend.dev>";

// Boîte qui reçoit les RÉPONSES des clients (« Répondre » dans leur messagerie).
// reservations@soccercity5.com est une adresse d'envoi seulement — sans ceci,
// les réponses rebondiraient.
const REPLY_TO = process.env.RESEND_REPLY_TO || "Soccercity5.mtl@gmail.com";

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
      replyTo: REPLY_TO,
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
      replyTo: REPLY_TO,
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
      replyTo: REPLY_TO,
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
      replyTo: REPLY_TO,
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
// ============================================
// DEMANDES D'ÉVÉNEMENT — rappel et expiration (cron quotidien)
// ============================================

interface EventRequestLifecycleParams {
  userName: string;
  userEmail: string;
  eventType: string;
  eventDate: string;
  guests?: number;
  expiresLabel?: string;
}

/** Rappel au client : sa demande est en attente, avec la date limite. */
export async function sendEventRequestReminderEmail(params: EventRequestLifecycleParams) {
  const { userName, userEmail, eventType, eventDate, guests, expiresLabel } = params;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: userEmail,
      subject: "Votre demande d'événement Soccer City — toujours d'actualité ? 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="color: #1d4ed8; font-size: 22px;">Votre demande est en attente</h1>
          <p>Bonjour ${userName},</p>
          <p>Nous avons bien reçu votre demande d'événement et elle est en cours de traitement :</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #666;">Type</td><td style="padding: 8px 0; font-weight: bold;">${eventType}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Date souhaitée</td><td style="padding: 8px 0; font-weight: bold;">${eventDate}</td></tr>
            ${guests ? `<tr><td style="padding: 8px 0; color: #666;">Invités</td><td style="padding: 8px 0; font-weight: bold;">${guests} personne(s)</td></tr>` : ""}
          </table>
          <p>Notre équipe vous contactera très bientôt pour finaliser les détails.
          ${expiresLabel ? `Sans confirmation de part et d'autre d'ici le <strong>${expiresLabel}</strong>, la demande expirera automatiquement afin de libérer la date.` : ""}</p>
          <p style="color: #666; font-size: 14px;">Une question ? Répondez simplement à ce courriel ou appelez-nous.</p>
          <p>À bientôt sur le terrain !<br/>L'équipe Soccer City</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Erreur courriel rappel demande:", error);
  }
}

/** Information au client : sa demande a expiré (sans réponse dans le délai). */
export async function sendEventRequestExpiredEmail(params: EventRequestLifecycleParams) {
  const { userName, userEmail, eventType, eventDate } = params;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: userEmail,
      subject: "Votre demande d'événement Soccer City a expiré",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="color: #b45309; font-size: 22px;">Demande expirée</h1>
          <p>Bonjour ${userName},</p>
          <p>Votre demande d'événement <strong>${eventType}</strong> pour le <strong>${eventDate}</strong>
          n'a pas pu être finalisée dans les délais et vient d'expirer.</p>
          <p>Votre projet tient toujours ? Il suffit de refaire une demande sur notre site
          ou de nous appeler directement — nous nous ferons un plaisir de l'organiser.</p>
          <p style="color: #666; font-size: 14px;">835 Rue Saint-Jacques, Saint-Jean-sur-Richelieu, QC J3B 2N2</p>
          <p>À bientôt !<br/>L'équipe Soccer City</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Erreur courriel expiration demande:", error);
  }
}

/** Alerte à l'admin : une demande attend une réponse et expirera bientôt. */
export async function sendAdminPendingRequestEmail(params: EventRequestLifecycleParams) {
  if (!ADMIN_EMAIL) return;
  const { userName, userEmail, eventType, eventDate, expiresLabel } = params;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: ADMIN_EMAIL,
      subject: `⏰ Demande d'événement sans réponse — ${userName} (${eventType})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
          <h1 style="color: #b45309; font-size: 20px;">Demande en attente de réponse</h1>
          <p>La demande suivante n'a pas encore été traitée dans l'admin :</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #666;">Client</td><td style="padding: 8px 0; font-weight: bold;">${userName} (${userEmail})</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Type</td><td style="padding: 8px 0; font-weight: bold;">${eventType}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Date souhaitée</td><td style="padding: 8px 0; font-weight: bold;">${eventDate}</td></tr>
            ${expiresLabel ? `<tr><td style="padding: 8px 0; color: #666;">Expire le</td><td style="padding: 8px 0; font-weight: bold; color: #b45309;">${expiresLabel}</td></tr>` : ""}
          </table>
          <p>Acceptez ou refusez-la dans l'admin avant son expiration automatique.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Erreur courriel alerte admin:", error);
  }
}
