// lib/email.ts
// Tous les courriels transactionnels (Resend).
// • Chaque valeur saisie par un client est ÉCHAPPÉE (pas d'injection HTML).
// • Les échecs Resend sont détectés : Resend ne lève pas d'exception,
//   il renvoie { error } — on le lit et on le journalise.
import "server-only";
import { Resend } from "resend";
import { CONTACT } from "@/lib/data";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ⚠️ Domaine à vérifier dans Resend, puis RESEND_FROM_EMAIL = "Soccer City <reservations@votredomaine>".
// L'adresse de test onboarding@resend.dev n'envoie QU'AU propriétaire du compte Resend.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Soccer City <onboarding@resend.dev>";
const REPLY_TO = process.env.RESEND_REPLY_TO || CONTACT.email;
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

if (!process.env.RESEND_FROM_EMAIL && process.env.NODE_ENV === "production") {
  console.warn("⚠️ RESEND_FROM_EMAIL non défini : les clients ne recevront pas les courriels (adresse de test Resend).");
}

/** Échappe une valeur avant de l'insérer dans du HTML. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const money = (n: number) => `${Number(n || 0).toFixed(2)} $`;

function dateLabel(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-CA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

/** Gabarit commun (en-tête, pied de page avec adresse). */
function layout(title: string, body: string, color = "#1d4ed8"): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
    <h1 style="color: ${color}; font-size: 22px; margin: 0 0 16px;">${title}</h1>
    ${body}
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #666; font-size: 13px; margin: 0;">
      Soccer City · ${esc(CONTACT.address)}<br/>
      ${esc(CONTACT.phone)} · ${esc(CONTACT.email)}
    </p>
  </div>`;
}

/** Tableau de détails (libellé → valeur déjà échappée). */
function rows(items: [string, string][]): string {
  return `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">${items
    .map(
      ([k, v]) =>
        `<tr><td style="padding: 6px 0; color: #666; width: 45%;">${k}</td><td style="padding: 6px 0; font-weight: bold;">${v}</td></tr>`
    )
    .join("")}</table>`;
}

function button(href: string, label: string): string {
  return `<p style="margin: 24px 0;"><a href="${esc(href)}" style="background: #1d4ed8; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">${label}</a></p>`;
}

/** Envoi unique : renvoie true si Resend a accepté le courriel. */
async function send(
  to: string | undefined | null,
  subject: string,
  html: string,
  replyTo: string = REPLY_TO
): Promise<boolean> {
  if (!to) return false;
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY manquant : courriel non envoyé —", subject);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM_EMAIL, replyTo, to, subject, html });
    if (error) {
      console.error("❌ Resend a refusé le courriel :", subject, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ Erreur réseau Resend :", subject, error);
    return false;
  }
}

// =====================================================================
// RÉSERVATIONS PAYÉES (terrain, anniversaire, événement en ligne)
// =====================================================================

export interface BookingEmailParams {
  userName: string;
  userEmail: string;
  userPhone: string;
  /** « Terrain 1 », « Forfait anniversaire », « Tournoi »… */
  what: string;
  /** Texte de date(s) déjà formaté (ex. « 2026-11-02 » ou « 3 dates : … ») */
  when: string;
  startTime: string;
  endTime: string;
  amountPaid: number;
  total: number;
  balanceDue: number;
  guests?: number | null;
}

export async function sendBookingConfirmationEmail(p: BookingEmailParams) {
  const items: [string, string][] = [
    ["Prestation", esc(p.what)],
    ["Date", esc(p.when)],
    ["Heure", `${esc(p.startTime)} – ${esc(p.endTime)}`],
  ];
  if (p.guests) items.push(["Invités", `${esc(p.guests)} personne(s)`]);
  items.push(["Montant payé", money(p.amountPaid)]);
  if (p.balanceDue > 0) items.push(["Solde à régler sur place", money(p.balanceDue)]);

  return send(
    p.userEmail,
    "Votre réservation Soccer City est confirmée ⚽",
    layout(
      "Réservation confirmée !",
      `<p>Bonjour ${esc(p.userName)},</p>
       <p>Votre réservation chez <strong>Soccer City</strong> est confirmée. Voici les détails :</p>
       ${rows(items)}
       ${p.balanceDue > 0 ? `<p style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:12px 16px;">Le solde de <b>${money(p.balanceDue)}</b> est à régler le jour même, avant l'accès au terrain.</p>` : ""}
       <p>Vous recevrez un rappel la veille. À bientôt sur le terrain !</p>`
    )
  );
}

export async function sendAdminBookingEmail(p: BookingEmailParams) {
  return send(
    ADMIN_EMAIL,
    `Nouvelle réservation payée — ${p.what} (${p.when})`,
    layout(
      "Nouvelle réservation payée",
      `<p><strong>${esc(p.userName)}</strong><br/>${esc(p.userEmail)} · ${esc(p.userPhone)}</p>
       ${rows([
         ["Prestation", esc(p.what)],
         ["Date", esc(p.when)],
         ["Heure", `${esc(p.startTime)} – ${esc(p.endTime)}`],
         ["Encaissé", money(p.amountPaid)],
         ["Total", money(p.total)],
         ["Solde à percevoir", money(p.balanceDue)],
       ])}`
    )
  );
}

// =====================================================================
// ACADÉMIE
// =====================================================================

export async function sendAcademyConfirmationEmail(p: {
  userName: string; userEmail: string; groupLabel: string; schedule: string;
  period: string; amountPaid: number; balanceDue: number;
}) {
  const items: [string, string][] = [
    ["Groupe", esc(p.groupLabel)],
    ["Horaire", esc(p.schedule)],
    ["Durée", esc(p.period)],
    ["Montant payé", money(p.amountPaid)],
  ];
  if (p.balanceDue > 0) items.push(["Solde à régler", money(p.balanceDue)]);
  return send(
    p.userEmail,
    "Inscription à l'académie Soccer City confirmée ⚽",
    layout(
      "Inscription confirmée !",
      `<p>Bonjour ${esc(p.userName)},</p>
       <p>L'inscription à l'<strong>Académie Soccer City</strong> est confirmée :</p>
       ${rows(items)}
       <p>Une question ? Répondez simplement à ce courriel. À bientôt sur le terrain !</p>`
    )
  );
}

// =====================================================================
// PROBLÈME DE PAIEMENT : créneau pris entre-temps → remboursé
// =====================================================================

export async function sendRefundedConflictEmail(p: {
  userName: string; userEmail: string; what: string; when: string; amount: number;
  /** true = remboursé suite à un problème technique (et non un créneau pris) */
  technical?: boolean;
}) {
  return send(
    p.userEmail,
    "Soccer City — votre paiement a été remboursé",
    layout(
      p.technical ? "Réservation non enregistrée — paiement remboursé" : "Créneau indisponible — paiement remboursé",
      `<p>Bonjour ${esc(p.userName)},</p>
       ${p.technical
         ? `<p>Un problème technique a empêché d'enregistrer votre réservation <strong>${esc(p.what)}</strong> du <strong>${esc(p.when)}</strong>. Notre équipe a été prévenue et vous contactera.</p>`
         : `<p>Le créneau <strong>${esc(p.what)}</strong> du <strong>${esc(p.when)}</strong> a été réservé par une autre personne
       quelques secondes avant la validation de votre paiement.</p>`}
       <p>Nous avons <strong>remboursé intégralement ${money(p.amount)}</strong> sur votre carte
       (délai bancaire de 5 à 10 jours ouvrables).</p>
       ${SITE_URL ? button(`${SITE_URL}/reservation`, "Choisir un autre créneau") : ""}
       <p>Toutes nos excuses pour ce contretemps.</p>`,
      "#b45309"
    )
  );
}

export async function sendAdminAlertEmail(subject: string, lines: string[]) {
  return send(
    ADMIN_EMAIL,
    `⚠️ ${subject}`,
    layout(subject, lines.map((l) => `<p>${esc(l)}</p>`).join(""), "#b91c1c")
  );
}

// =====================================================================
// DEMANDES D'ÉVÉNEMENT (formulaire « sur mesure »)
// =====================================================================

export interface EventRequestEmailParams {
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

export async function sendEventRequestConfirmationEmail(p: EventRequestEmailParams) {
  return send(
    p.email,
    "Votre demande d'événement a bien été reçue — Soccer City",
    layout(
      "Demande reçue !",
      `<p>Bonjour ${esc(p.firstName)} ${esc(p.lastName)},</p>
       <p>Merci pour votre demande. Notre équipe l'étudie et vous répond par courriel avec une proposition
       et un lien de paiement sécurisé.</p>
       ${rows([
         ["Type d'événement", esc(p.type)],
         ["Date souhaitée", esc(dateLabel(p.date))],
         ["Nombre de personnes", esc(p.guests)],
       ])}`
    )
  );
}

export async function sendEventRequestAdminNotificationEmail(p: EventRequestEmailParams) {
  return send(
    ADMIN_EMAIL,
    `Nouvelle demande d'événement — ${p.type} le ${p.date}`,
    layout(
      "Nouvelle demande d'événement",
      `<p><strong>${esc(p.firstName)} ${esc(p.lastName)}</strong>${p.company ? ` — ${esc(p.company)}` : ""}<br/>
       ${esc(p.email)} · ${esc(p.phone)}</p>
       ${rows([
         ["Type", esc(p.type)],
         ["Date", esc(dateLabel(p.date))],
         ["Personnes", esc(p.guests)],
       ])}
       <p style="padding: 12px; background: #f5f5f5; border-radius: 6px; white-space: pre-wrap;">${esc(p.message)}</p>
       ${SITE_URL ? button(`${SITE_URL}/admin/evenements`, "Répondre dans l'admin") : ""}`
    )
  );
}

/** Demande ACCEPTÉE : proposition + lien de paiement. */
export async function sendEventRequestAcceptedEmail(p: {
  userName: string; userEmail: string; eventType: string; eventDate: string;
  startTime: string; endTime: string; subtotal: number; gst: number; qst: number; total: number;
  payUrl: string; adminMessage?: string | null;
}) {
  return send(
    p.userEmail,
    `Votre ${p.eventType} chez Soccer City est accepté — finalisez la réservation`,
    layout(
      "Bonne nouvelle : votre demande est acceptée !",
      `<p>Bonjour ${esc(p.userName)},</p>
       <p>Nous serons ravis d'accueillir votre événement. Voici notre proposition :</p>
       ${rows([
         ["Événement", esc(p.eventType)],
         ["Date", esc(dateLabel(p.eventDate))],
         ["Horaire", `${esc(p.startTime)} – ${esc(p.endTime)}`],
         ["Sous-total", money(p.subtotal)],
         ["TPS", money(p.gst)],
         ["TVQ", money(p.qst)],
         ["Total", `<span style="color:#1d4ed8">${money(p.total)}</span>`],
       ])}
       ${p.adminMessage ? `<p style="padding: 12px; background: #f5f7ff; border-radius: 6px; white-space: pre-wrap;">${esc(p.adminMessage)}</p>` : ""}
       <p><strong>La date est confirmée dès réception du paiement.</strong> Tant que le paiement n'est pas fait,
       le créneau peut être réservé par quelqu'un d'autre.</p>
       ${button(p.payUrl, `Payer ${money(p.total)} en ligne`)}
       <p style="color:#666;font-size:13px;">Paiement sécurisé par Stripe. En payant, vous acceptez nos
       ${SITE_URL ? `<a href="${SITE_URL}/conditions">conditions d'utilisation</a> et notre <a href="${SITE_URL}/confidentialite">politique de confidentialité</a>` : "conditions d'utilisation et notre politique de confidentialité"}.
       Une question ? Répondez simplement à ce courriel.</p>`
    )
  );
}

/** Demande REFUSÉE. */
export async function sendEventRequestDeclinedEmail(p: {
  userName: string; userEmail: string; eventType: string; eventDate: string; reason?: string | null;
}) {
  return send(
    p.userEmail,
    "Votre demande d'événement Soccer City",
    layout(
      "Votre demande d'événement",
      `<p>Bonjour ${esc(p.userName)},</p>
       <p>Merci pour votre intérêt. Malheureusement, nous ne pouvons pas accueillir votre
       <strong>${esc(p.eventType)}</strong> le <strong>${esc(dateLabel(p.eventDate))}</strong>.</p>
       ${p.reason ? `<p style="padding: 12px; background: #f5f5f5; border-radius: 6px; white-space: pre-wrap;">${esc(p.reason)}</p>` : ""}
       <p>Une autre date vous conviendrait ? Répondez à ce courriel ou appelez-nous au ${esc(CONTACT.phone)}.</p>
       ${SITE_URL ? button(`${SITE_URL}/evenements`, "Voir les disponibilités") : ""}`,
      "#374151"
    )
  );
}

/** Demande ACCEPTÉE mais pas encore payée : relance. */
export async function sendEventPaymentReminderEmail(p: {
  userName: string; userEmail: string; eventType: string; eventDate: string; total: number; payUrl: string;
}) {
  return send(
    p.userEmail,
    `Rappel — finalisez votre ${p.eventType} chez Soccer City`,
    layout(
      "Votre date n'est pas encore bloquée",
      `<p>Bonjour ${esc(p.userName)},</p>
       <p>Votre <strong>${esc(p.eventType)}</strong> du <strong>${esc(dateLabel(p.eventDate))}</strong> est accepté,
       mais le paiement n'a pas encore été reçu. La date sera confirmée dès le paiement.</p>
       ${button(p.payUrl, `Payer ${money(p.total)} en ligne`)}`
    )
  );
}

// =====================================================================
// DEMANDES D'ÉVÉNEMENT — rappel et expiration (cron quotidien)
// =====================================================================

interface EventRequestLifecycleParams {
  userName: string;
  userEmail: string;
  eventType: string;
  eventDate: string;
  guests?: number;
  expiresLabel?: string;
}

export async function sendEventRequestReminderEmail(p: EventRequestLifecycleParams) {
  return send(
    p.userEmail,
    "Votre demande d'événement Soccer City est en cours de traitement",
    layout(
      "Votre demande est en attente",
      `<p>Bonjour ${esc(p.userName)},</p>
       <p>Votre demande d'événement est toujours en cours de traitement :</p>
       ${rows([
         ["Type", esc(p.eventType)],
         ["Date souhaitée", esc(dateLabel(p.eventDate))],
         ...(p.guests ? ([["Invités", `${esc(p.guests)} personne(s)`]] as [string, string][]) : []),
       ])}
       <p>Notre équipe vous répond très bientôt.
       ${p.expiresLabel ? `Sans réponse d'ici le <strong>${esc(p.expiresLabel)}</strong>, la demande expirera automatiquement afin de libérer la date.` : ""}</p>`
    )
  );
}

export async function sendEventRequestExpiredEmail(p: EventRequestLifecycleParams) {
  return send(
    p.userEmail,
    "Votre demande d'événement Soccer City a expiré",
    layout(
      "Demande expirée",
      `<p>Bonjour ${esc(p.userName)},</p>
       <p>Votre demande <strong>${esc(p.eventType)}</strong> pour le <strong>${esc(dateLabel(p.eventDate))}</strong>
       n'a pas pu être finalisée dans les délais et vient d'expirer.</p>
       <p>Votre projet tient toujours ? Refaites une demande sur notre site ou appelez-nous au ${esc(CONTACT.phone)}.</p>`,
      "#b45309"
    )
  );
}

export async function sendAdminPendingRequestEmail(p: EventRequestLifecycleParams) {
  return send(
    ADMIN_EMAIL,
    `⏰ Demande d'événement sans réponse — ${p.userName} (${p.eventType})`,
    layout(
      "Demande en attente de réponse",
      `<p>Cette demande n'a pas encore été traitée :</p>
       ${rows([
         ["Client", `${esc(p.userName)} (${esc(p.userEmail)})`],
         ["Type", esc(p.eventType)],
         ["Date souhaitée", esc(dateLabel(p.eventDate))],
         ...(p.expiresLabel ? ([["Expire le", esc(p.expiresLabel)]] as [string, string][]) : []),
       ])}
       ${SITE_URL ? button(`${SITE_URL}/admin/evenements`, "Accepter ou refuser") : ""}`,
      "#b45309"
    )
  );
}

// =====================================================================
// RAPPEL DE RÉSERVATION — la veille (cron quotidien)
// =====================================================================

export interface ReservationReminderParams {
  userName: string;
  userEmail: string;
  reservationType: string;
  date: string;
  startTime: string;
  endTime: string;
  balanceDue: number;
}

export async function sendReservationReminderEmail(p: ReservationReminderParams) {
  return send(
    p.userEmail,
    `⏰ Rappel — votre réservation Soccer City demain (${p.startTime})`,
    layout(
      `⚽ À demain, ${esc(p.userName)} !`,
      `<p>Petit rappel de votre réservation chez <b>Soccer City</b> :</p>
       ${rows([
         ["Type", esc(p.reservationType)],
         ["Date", esc(dateLabel(p.date))],
         ["Heure", `${esc(p.startTime)} – ${esc(p.endTime)}`],
       ])}
       ${p.balanceDue > 0
         ? `<p style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:12px 16px;">
              🟠 <b>Solde à régler sur place : ${money(p.balanceDue)}</b><br/>
              Payable à l'accueil (carte, comptant ou virement) avant l'accès au terrain.</p>`
         : ""}
       <p>Pensez à arriver une dizaine de minutes à l'avance. Bonne séance !</p>`
    )
  );
}

// =====================================================================
// AVIS CLIENTS
// =====================================================================

/** Lendemain de la visite : demande d'avis au client. */
export async function sendReviewRequestEmail(p: { userName: string; userEmail: string; reviewUrl: string }) {
  return send(
    p.userEmail,
    "Comment s'est passé votre match chez Soccer City ? ⚽",
    layout(
      `Merci de votre visite, ${esc(p.userName)} !`,
      `<p>Nous espérons que vous avez passé un excellent moment sur nos terrains.</p>
       <p>Votre avis compte beaucoup pour nous et aide d'autres joueurs à nous découvrir.
       Ça prend moins d'une minute :</p>
       ${button(p.reviewUrl, "Donner mon avis")}
       <p style="color:#666;font-size:13px;">Une remarque à nous faire en privé ? Répondez simplement à ce courriel.</p>`
    )
  );
}

/** Nouvel avis reçu : à approuver dans l'admin. */
export async function sendAdminNewReviewEmail(p: { author: string; rating: number; text: string; verified: boolean }) {
  const stars = "★".repeat(p.rating) + "☆".repeat(5 - p.rating);
  return send(
    ADMIN_EMAIL,
    `Nouvel avis ${stars} de ${p.author} — à approuver`,
    layout(
      "Nouvel avis en attente",
      `<p><strong>${esc(p.author)}</strong>${p.verified ? " · ✅ client vérifié" : ""}</p>
       <p style="font-size:20px;color:#f59e0b;margin:4px 0;">${stars}</p>
       <p style="padding:12px;background:#f5f5f5;border-radius:6px;white-space:pre-wrap;">${esc(p.text)}</p>
       <p>Il ne sera visible sur le site qu'après votre approbation.</p>
       ${SITE_URL ? button(`${SITE_URL}/admin/avis`, "Approuver ou refuser") : ""}`
    )
  );
}

// =====================================================================
// FORMULAIRE DE CONTACT
// =====================================================================

export async function sendContactMessageEmail(p: { name: string; email: string; message: string; source?: string }) {
  return send(
    ADMIN_EMAIL,
    `Nouveau message de ${p.name}${p.source ? ` (${p.source})` : ""}`,
    layout(
      "Nouveau message du site",
      `<p><strong>${esc(p.name)}</strong> — ${esc(p.email)}</p>
       <p style="padding:12px;background:#f5f5f5;border-radius:6px;white-space:pre-wrap;">${esc(p.message)}</p>
       <p style="color:#666;font-size:13px;">Cliquez sur « Répondre » : votre réponse partira directement au client.</p>`
    ),
    p.email
  );
}

export async function sendContactAckEmail(p: { name: string; email: string }) {
  return send(
    p.email,
    "Nous avons bien reçu votre message — Soccer City",
    layout(
      "Message reçu !",
      `<p>Bonjour ${esc(p.name)},</p>
       <p>Merci pour votre message. Notre équipe vous répond par courriel dans les meilleurs délais.</p>`
    )
  );
}
