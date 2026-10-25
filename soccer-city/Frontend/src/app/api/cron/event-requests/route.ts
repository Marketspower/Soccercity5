// app/api/cron/event-requests/route.ts
// Tâche planifiée quotidienne (Vercel Cron — voir vercel.json).
//
// 1. DEMANDES SANS RÉPONSE (statut « new ») — délai adaptatif :
//      délai total = (date de l'événement − date de la demande) ÷ 2, min. 1 jour
//      • à mi-parcours → rappel au client + alerte admin (une seule fois)
//      • au bout du délai, ou date passée → « expired » + courriel au client
// 2. DEMANDES ACCEPTÉES MAIS NON PAYÉES
//      • 2 jours après l'acceptation → relance de paiement (une seule fois)
//      • date de l'événement passée → « expired »
// 3. RAPPEL DE RÉSERVATION — courriel au client la veille.
// 4. DEMANDE D'AVIS — courriel au client le lendemain de sa visite.
//
// Toutes les dates sont calculées dans le fuseau de Montréal.
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { todayMontreal, addDays, daysBetween, TIMEZONE } from "@/lib/server/validation";
import { computeTaxes, loadTaxSettings } from "@/lib/taxes";
import {
  sendEventRequestReminderEmail,
  sendEventRequestExpiredEmail,
  sendAdminPendingRequestEmail,
  sendReservationReminderEmail,
  sendEventPaymentReminderEmail,
  sendReviewRequestEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Date (YYYY-MM-DD) à Montréal d'un horodatage. */
const montrealDay = (ts: string | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(ts));

const frLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-CA", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

export async function GET(req: NextRequest) {
  // Sécurité : CRON_SECRET OBLIGATOIRE. Vercel l'envoie automatiquement
  // (Authorization: Bearer <CRON_SECRET>) quand la variable est définie.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("❌ CRON_SECRET non défini : cron désactivé par sécurité.");
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const today = todayMontreal();
  const report = { reminders: 0, expired: 0, paymentReminders: 0, acceptedExpired: 0, bookingReminders: 0, reviewRequests: 0, errors: 0 };

  // ===================== 1. Demandes « new » =====================
  const { data: pending, error: pendErr } = await supabaseAdmin
    .from("private_events")
    .select("id, first_name, last_name, email, date, type, guests, created_at, reminder_sent_at")
    .eq("status", "new");

  if (pendErr) {
    console.error("❌ Cron — lecture demandes:", pendErr);
    report.errors++;
  }

  for (const r of pending ?? []) {
    try {
      const createdDay = montrealDay(r.created_at);
      const gapDays = Math.max(0, daysBetween(createdDay, r.date));
      const delayDays = Math.max(1, Math.floor(gapDays / 2));
      const expiresAt = addDays(createdDay, delayDays);
      const reminderAt = addDays(createdDay, Math.max(1, Math.floor(delayDays / 2)));
      const clientName = [r.first_name, r.last_name].filter(Boolean).join(" ") || "client";

      if (today >= expiresAt || today > r.date) {
        const { data: updated, error: upErr } = await supabaseAdmin
          .from("private_events")
          .update({ status: "expired", expires_at: expiresAt })
          .eq("id", r.id)
          .eq("status", "new") // ne jamais écraser une réponse arrivée entre-temps
          .select("id");
        if (upErr) throw upErr;
        if (updated && updated.length > 0) {
          report.expired++;
          await sendEventRequestExpiredEmail({
            userName: clientName, userEmail: r.email, eventType: r.type, eventDate: r.date,
          });
        }
        continue;
      }

      if (!r.reminder_sent_at && today >= reminderAt) {
        const expiresLabel = frLabel(expiresAt);
        await Promise.allSettled([
          sendEventRequestReminderEmail({
            userName: clientName, userEmail: r.email, eventType: r.type,
            eventDate: r.date, guests: r.guests, expiresLabel,
          }),
          sendAdminPendingRequestEmail({
            userName: clientName, userEmail: r.email, eventType: r.type,
            eventDate: r.date, expiresLabel,
          }),
        ]);
        const { error: remErr } = await supabaseAdmin
          .from("private_events")
          .update({ reminder_sent_at: new Date().toISOString(), expires_at: expiresAt })
          .eq("id", r.id);
        if (remErr) throw remErr;
        report.reminders++;
      }
    } catch (e) {
      console.error("❌ Cron — demande", r.id, e);
      report.errors++;
    }
  }

  // ===================== 2. Acceptées non payées =====================
  const { data: accepted, error: accErr } = await supabaseAdmin
    .from("private_events")
    .select("id, first_name, last_name, email, date, type, quoted_price, payment_token, accepted_at, payment_reminder_sent_at")
    .eq("status", "accepted");

  if (accErr) {
    console.error("❌ Cron — lecture demandes acceptées:", accErr);
    report.errors++;
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
  const taxSettings = await loadTaxSettings();

  for (const r of accepted ?? []) {
    try {
      const clientName = [r.first_name, r.last_name].filter(Boolean).join(" ") || "client";
      if (today > r.date) {
        await supabaseAdmin
          .from("private_events")
          .update({ status: "expired", payment_token: null })
          .eq("id", r.id)
          .eq("status", "accepted");
        report.acceptedExpired++;
        continue;
      }
      if (
        !r.payment_reminder_sent_at &&
        r.accepted_at && r.payment_token &&
        daysBetween(montrealDay(r.accepted_at), today) >= 2
      ) {
        const total = computeTaxes(Number(r.quoted_price), taxSettings).total;
        await sendEventPaymentReminderEmail({
          userName: clientName, userEmail: r.email, eventType: r.type, eventDate: r.date, total,
          payUrl: `${siteUrl}/api/event-request/pay?id=${encodeURIComponent(r.id)}&t=${encodeURIComponent(r.payment_token)}`,
        });
        await supabaseAdmin
          .from("private_events")
          .update({ payment_reminder_sent_at: new Date().toISOString() })
          .eq("id", r.id);
        report.paymentReminders++;
      }
    } catch (e) {
      console.error("❌ Cron — demande acceptée", r.id, e);
      report.errors++;
    }
  }

  // ===================== 3. Rappels de réservation (veille) =====================
  const tomorrow = addDays(today, 1);
  const { data: resas, error: resasErr } = await supabaseAdmin
    .from("reservations")
    .select("id, user_name, user_email, type, date, start_time, end_time, balance_due, balance_paid_at")
    .eq("date", tomorrow)
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .not("user_email", "is", null)
    .neq("user_email", "");

  if (resasErr) {
    console.error("❌ Cron — lecture réservations:", resasErr);
    report.errors++;
  } else {
    // Un seul courriel par client et par jour (réservations multi-dates)
    const byEmail = new Map<string, any[]>();
    for (const r of resas ?? []) {
      const key = String(r.user_email).toLowerCase();
      byEmail.set(key, [...(byEmail.get(key) ?? []), r]);
    }
    for (const rows of Array.from(byEmail.values())) {
      try {
        rows.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
        const first = rows[0];
        const stillDue = first.balance_paid_at ? 0 : Number(first.balance_due ?? 0);
        const sent = await sendReservationReminderEmail({
          userName: first.user_name || "cher client",
          userEmail: first.user_email,
          reservationType: first.type || "Terrain",
          date: first.date,
          startTime: String(first.start_time).slice(0, 5),
          endTime: String(first.end_time).slice(0, 5),
          balanceDue: stillDue,
        });
        if (!sent) { report.errors++; continue; } // on réessaiera au prochain passage
        await supabaseAdmin
          .from("reservations")
          .update({ reminder_sent_at: new Date().toISOString() })
          .in("id", rows.map((r) => r.id));
        report.bookingReminders++;
      } catch (e) {
        console.error("❌ Cron — rappel réservation:", e);
        report.errors++;
      }
    }
  }

  // ===================== 4. Demandes d'avis (lendemain) =====================
  // Une seule demande par client et par jour, jamais deux fois pour la même
  // réservation ; on ne relance pas un client déjà sollicité ces 30 derniers jours.
  const yesterday = addDays(today, -1);
  const { data: visits, error: visitsErr } = await supabaseAdmin
    .from("reservations")
    .select("id, user_name, user_email, date, start_time")
    .eq("date", yesterday)
    .eq("status", "confirmed")
    .is("review_request_sent_at", null)
    .not("user_email", "is", null)
    .neq("user_email", "");

  if (visitsErr) {
    console.error("❌ Cron — lecture visites (avis):", visitsErr.message);
  } else {
    const byEmail = new Map<string, any[]>();
    for (const r of visits ?? []) {
      const key = String(r.user_email).toLowerCase();
      byEmail.set(key, [...(byEmail.get(key) ?? []), r]);
    }
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    for (const [email, rows] of Array.from(byEmail.entries())) {
      try {
        const ids = rows.map((r) => r.id);
        const { count: recent } = await supabaseAdmin
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .ilike("user_email", email)
          .gte("review_request_sent_at", since);
        if ((recent ?? 0) > 0) {
          // Déjà sollicité récemment : on marque sans envoyer
          await supabaseAdmin.from("reservations").update({ review_request_sent_at: new Date().toISOString() }).in("id", ids);
          continue;
        }
        const token = randomBytes(18).toString("base64url");
        const firstName = String(rows[0].user_name || "").trim().split(" ")[0] || "cher client";
        const sent = await sendReviewRequestEmail({
          userName: firstName,
          userEmail: rows[0].user_email,
          reviewUrl: `${siteUrl}/avis?t=${encodeURIComponent(token)}`,
        });
        if (!sent) { report.errors++; continue; }
        await supabaseAdmin.from("reservations").update({ review_token: token }).eq("id", rows[0].id);
        await supabaseAdmin.from("reservations").update({ review_request_sent_at: new Date().toISOString() }).in("id", ids);
        report.reviewRequests++;
      } catch (e) {
        console.error("❌ Cron — demande d'avis:", e);
        report.errors++;
      }
    }
  }

  console.log("✅ Cron Soccer City :", JSON.stringify({ today, tomorrow, ...report }));
  return NextResponse.json({ ok: true, today, tomorrow, ...report });
}
