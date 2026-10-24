// app/api/stripe-webhook/route.ts
// Reçoit les événements Stripe et enregistre les paiements.
//
// Ordre de traitement (fiable même si Stripe renvoie plusieurs fois) :
//   1. VERROU : on insère d'abord la ligne `payments` (stripe_session_id unique).
//      Si elle existe déjà → événement déjà traité → on s'arrête.
//   2. On crée la réservation / l'inscription (une seule requête, atomique).
//      • Créneau pris entre-temps (conflit) → REMBOURSEMENT AUTOMATIQUE
//        + courriel/SMS au client + alerte admin.
//      • Erreur temporaire → on retire le verrou et on répond 500 :
//        Stripe réessaiera plus tard.
//   3. On marque le paiement « paid » puis on envoie les notifications
//      (un échec de notification ne fait jamais échouer le webhook).
//
// Gère aussi `charge.refunded` : un remboursement fait dans Stripe
// annule automatiquement la réservation et libère le créneau.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import {
  sendBookingConfirmationEmail,
  sendAdminBookingEmail,
  sendAcademyConfirmationEmail,
  sendRefundedConflictEmail,
  sendAdminAlertEmail,
} from "@/lib/email";
import { sendSMS, sendAdminSMS } from "@/lib/sms";
import { ACADEMIE, academyGroup } from "@/config/packages";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_missing", {
  apiVersion: "2026-07-29.dahlia",
});

const money = (n: unknown) => `${Number(n || 0).toFixed(2)} $`;

/** Erreur « métier » : réessayer ne servira à rien → on rembourse. */
class ConflictError extends Error {}

/** Codes Postgres de la classe 23 (contraintes) = données refusées définitivement. */
const isConstraintError = (e: any) => typeof e?.code === "string" && e.code.startsWith("23");

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error: any) {
    console.error("❌ Signature webhook invalide:", error.message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") break; // paiement différé : on attend « succeeded »
        await handlePaidSession(session, event.created);
        break;
      }
      case "charge.refunded": {
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Erreur webhook (Stripe réessaiera):", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// =====================================================================
// PAIEMENT RÉUSSI
// =====================================================================

/** Après ce délai, une erreur persistante n'est plus réessayée : on rembourse. */
const GIVE_UP_AFTER_S = 12 * 3600;
/** Un verrou « pending » plus vieux que ça = traitement interrompu (plantage, délai dépassé). */
const STALE_LOCK_MS = 10 * 60 * 1000;

async function handlePaidSession(session: Stripe.Checkout.Session, eventCreated: number, retakes = 0): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const m = session.metadata || {};
  if (!m.kind) {
    console.error("❌ Session Stripe sans métadonnées, ignorée:", session.id);
    return;
  }
  const paymentIntent = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  // ----- 1. Verrou d'idempotence -----
  const { data: lock, error: lockErr } = await supabaseAdmin
    .from("payments")
    .insert({
      reservation_id: null,
      stripe_session_id: session.id,
      stripe_payment_intent_id: paymentIntent,
      amount: session.amount_total,
      currency: session.currency,
      status: "pending",
      method: "stripe",
      field_id: m.fieldId || null,
      user_name: m.userName,
      user_email: m.userEmail,
      user_phone: m.userPhone,
      date: m.date || null,
    })
    .select("id")
    .single();

  if (lockErr) {
    if (lockErr.code === "23505") {
      // Déjà traité… ou traitement précédent interrompu en plein milieu ?
      const { data: existing } = await supabaseAdmin
        .from("payments")
        .select("id, status, created_at")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      const age = existing?.created_at ? Date.now() - new Date(existing.created_at).getTime() : Infinity;
      if (existing?.status === "pending" && age > STALE_LOCK_MS && retakes === 0) {
        // L'enregistrement a-t-il eu le temps d'aboutir avant l'interruption ?
        const [{ data: resDone }, { data: acaDone }] = await Promise.all([
          supabaseAdmin.from("reservations").select("id").eq("stripe_session_id", session.id).limit(1),
          supabaseAdmin.from("academy_enrollments").select("id").eq("stripe_session_id", session.id).limit(1),
        ]);
        if ((resDone && resDone.length) || (acaDone && acaDone.length)) {
          await supabaseAdmin
            .from("payments")
            .update({ status: "paid", reservation_id: resDone?.[0]?.id ?? null })
            .eq("id", existing.id);
          return;
        }
        console.warn("⚠️ Verrou abandonné repris pour", session.id);
        await supabaseAdmin.from("payments").delete().eq("id", existing.id).eq("status", "pending");
        return handlePaidSession(session, eventCreated, retakes + 1);
      }
      return; // déjà traité (ou en cours de traitement par un autre appel)
    }
    throw lockErr;
  }

  // ----- 2. Création de la réservation / inscription -----
  let reservationId: string | null = null;
  let notify: () => Promise<unknown>;
  try {
    const result = await createBooking(session, m);
    reservationId = result.reservationId;
    notify = result.notify;
  } catch (error: any) {
    if (error instanceof ConflictError || isConstraintError(error)) {
      await refundForConflict(session, m, paymentIntent, lock.id, error.message);
      return;
    }
    const ageS = Math.floor(Date.now() / 1000) - eventCreated;
    if (ageS > GIVE_UP_AFTER_S) {
      // L'erreur persiste depuis des heures : ne pas laisser un client payé sans rien.
      await refundForConflict(session, m, paymentIntent, lock.id, `Erreur persistante : ${error?.message || error}`, true);
      return;
    }
    // Erreur (peut-être) temporaire : on libère le verrou, Stripe réessaiera.
    await supabaseAdmin.from("payments").delete().eq("id", lock.id);
    if (ageS < 15 * 60) {
      // Alerte dès la 1re tentative ratée (pas à chaque nouvelle tentative).
      await sendAdminAlertEmail("Paiement reçu mais réservation non enregistrée (nouvel essai automatique)", [
        `Client : ${m.userName} — ${m.userEmail} — ${m.userPhone}`,
        `Prestation : ${m.fieldName || m.type || m.groupLabel} — ${m.date || ""}`,
        `Session Stripe : ${session.id}`,
        `Erreur : ${error?.message || error}`,
        "Stripe va réessayer automatiquement. Sans succès d'ici 12 h, le client sera remboursé automatiquement.",
      ]).catch(() => {});
    }
    throw error;
  }

  // ----- 3. Paiement confirmé + notifications -----
  const { error: payUpdErr } = await supabaseAdmin
    .from("payments")
    .update({ status: "paid", reservation_id: reservationId })
    .eq("id", lock.id);
  if (payUpdErr) console.error("⚠️ Paiement non marqué « paid »:", payUpdErr);

  await notify().catch((e) => console.error("⚠️ Notifications:", e));
}

/** Crée l'enregistrement selon le type de paiement. */
async function createBooking(
  session: Stripe.Checkout.Session,
  m: Stripe.Metadata
): Promise<{ reservationId: string | null; notify: () => Promise<unknown> }> {
  const supabaseAdmin = getSupabaseAdmin();
  const isDeposit = m.paymentOption === "deposit";
  const amountPaid = Number(m.amountPaid || m.total || 0);
  const balanceDue = Number(m.balanceDue || 0);
  const balanceTxt = isDeposit
    ? ` Solde à régler sur place avant l'accès au terrain : ${money(balanceDue)}.`
    : "";

  // ===== Académie =====
  if (m.kind === "academie") {
    const group = academyGroup(m.groupKey);
    if (group) {
      const { count } = await supabaseAdmin
        .from("academy_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("group_key", group.key)
        .eq("status", "confirmed");
      if ((count ?? 0) >= group.capacity) {
        throw new ConflictError(`Groupe ${group.label} complet`);
      }
    }
    const { error } = await supabaseAdmin.from("academy_enrollments").insert({
      group_key: m.groupKey,
      group_label: m.groupLabel,
      schedule: m.schedule,
      user_name: m.userName,
      user_email: m.userEmail,
      user_phone: m.userPhone,
      price: Number(m.price),
      tax_gst: Number(m.taxGst),
      tax_qst: Number(m.taxQst),
      total: Number(m.total),
      payment_option: m.paymentOption || "full",
      amount_paid: amountPaid,
      balance_due: balanceDue,
      status: "confirmed",
      stripe_session_id: session.id,
    });
    if (error) throw error;

    // Deux paiements simultanés pour la dernière place : le plus récent cède.
    if (group) {
      const { data: confirmed } = await supabaseAdmin
        .from("academy_enrollments")
        .select("stripe_session_id")
        .eq("group_key", group.key)
        .eq("status", "confirmed")
        .order("created_at", { ascending: true });
      const rank = (confirmed || []).findIndex((r: any) => r.stripe_session_id === session.id);
      if (rank >= group.capacity) {
        await supabaseAdmin.from("academy_enrollments").delete().eq("stripe_session_id", session.id);
        throw new ConflictError(`Groupe ${group.label} complet (dernière place prise simultanément)`);
      }
    }

    return {
      reservationId: null,
      notify: () =>
        Promise.allSettled([
          sendAcademyConfirmationEmail({
            userName: m.userName, userEmail: m.userEmail, groupLabel: m.groupLabel,
            schedule: m.schedule, period: ACADEMIE.period, amountPaid, balanceDue,
          }),
          sendSMS(m.userPhone, `Soccer City : inscription à l'académie confirmée ! ${m.groupLabel} — ${m.schedule}. Payé : ${money(amountPaid)}.${balanceTxt}`),
          sendAdminSMS(`Nouvelle inscription académie : ${m.userName} — ${m.groupLabel}. Payé ${money(amountPaid)}${isDeposit ? `, solde ${money(balanceDue)}` : ""}.`),
          sendAdminAlertEmail("Nouvelle inscription à l'académie", [
            `${m.userName} — ${m.userEmail} — ${m.userPhone}`,
            `${m.groupLabel} (${m.schedule})`,
            `Payé ${money(amountPaid)}${isDeposit ? `, solde ${money(balanceDue)}` : ""}`,
          ]),
        ]),
    };
  }

  // ===== Demande d'événement acceptée puis payée =====
  if (m.kind === "event-request") {
    const { data: request, error: reqErr } = await supabaseAdmin
      .from("private_events")
      .select("id, status")
      .eq("id", m.requestId)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!request || request.status !== "accepted") {
      throw new ConflictError(`Demande ${m.requestId} plus disponible (statut : ${request?.status ?? "introuvable"})`);
    }

    const { data: created, error: resErr } = await supabaseAdmin
      .from("reservations")
      .insert({
        field_id: null,
        user_name: m.userName,
        user_email: m.userEmail,
        user_phone: m.userPhone,
        date: m.date,
        start_time: m.startTime,
        end_time: m.endTime,
        end_date: m.date,
        price: Number(m.price),
        tax_gst: Number(m.taxGst),
        tax_qst: Number(m.taxQst),
        total: Number(m.total),
        type: m.type || "Événement privé",
        guests: m.guests ? Number(m.guests) : null,
        payment_option: "full",
        amount_paid: Number(m.total),
        balance_due: 0,
        status: "confirmed",
        stripe_session_id: session.id,
      })
      .select("id")
      .single();
    if (resErr) throw resErr;

    const { error: evErr } = await supabaseAdmin
      .from("private_events")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", m.requestId);
    if (evErr) console.error("⚠️ Statut de la demande non mis à jour:", evErr);

    const params = {
      userName: m.userName, userEmail: m.userEmail, userPhone: m.userPhone,
      what: m.type, when: m.date, startTime: m.startTime, endTime: m.endTime,
      amountPaid: Number(m.total), total: Number(m.total), balanceDue: 0,
      guests: m.guests ? Number(m.guests) : null,
    };
    return {
      reservationId: created.id,
      notify: () =>
        Promise.allSettled([
          sendBookingConfirmationEmail(params),
          sendAdminBookingEmail(params),
          sendSMS(m.userPhone, `Soccer City : votre ${m.type} du ${m.date} (${m.startTime}-${m.endTime}) est confirmé ! Payé : ${money(m.total)} taxes incluses.`),
          sendAdminSMS(`Événement payé : ${m.userName} — ${m.type} le ${m.date}. ${money(m.total)} encaissés.`),
        ]),
    };
  }

  // ===== Réservations datées : terrain, anniversaire, événement en ligne =====
  const dates: string[] = m.dates ? JSON.parse(m.dates) : [m.date];
  const n = dates.length;
  const subtotal = Number(m.price);
  // Sous-total réparti par jour ; taxes/total/montant payé portés par la
  // 1re réservation seulement, pour que les sommes de l'admin restent justes.
  const perDay = Math.round((subtotal / n) * 100) / 100;
  const firstDay = Math.round((subtotal - perDay * (n - 1)) * 100) / 100;

  const rows = dates.map((d, i) => ({
    field_id: m.fieldId || null,
    user_name: m.userName,
    user_email: m.userEmail,
    user_phone: m.userPhone,
    date: d,
    start_time: m.startTime,
    end_time: m.endTime,
    end_date: n === 1 ? m.endDate || d : d,
    price: i === 0 ? firstDay : perDay,
    tax_gst: i === 0 ? Number(m.taxGst) : null,
    tax_qst: i === 0 ? Number(m.taxQst) : null,
    total: i === 0 ? Number(m.total) : null,
    type: m.type || "Terrain",
    guests: m.guests ? Number(m.guests) : null,
    payment_option: m.paymentOption || "full",
    amount_paid: i === 0 ? amountPaid : null,
    balance_due: i === 0 ? balanceDue : 0,
    status: "confirmed",
    stripe_session_id: session.id,
  }));

  // Insertion en un seul lot : tout passe, ou rien.
  // Le déclencheur SQL anti-chevauchement rejette le lot si un créneau a été pris.
  const { data: created, error } = await supabaseAdmin.from("reservations").insert(rows).select("id");
  if (error) throw error;

  const what = m.fieldName || m.type || "Réservation";
  const when = n === 1
    ? (m.endDate && m.endDate !== m.date ? `du ${m.date} au ${m.endDate}` : m.date)
    : `${n} dates : ${dates.join(", ")}`;
  const params = {
    userName: m.userName, userEmail: m.userEmail, userPhone: m.userPhone,
    what, when, startTime: m.startTime, endTime: m.endTime,
    amountPaid, total: Number(m.total), balanceDue,
    guests: m.guests ? Number(m.guests) : null,
  };

  return {
    reservationId: created?.[0]?.id ?? null,
    notify: () =>
      Promise.allSettled([
        sendBookingConfirmationEmail(params),
        sendAdminBookingEmail(params),
        sendSMS(m.userPhone, `Soccer City : réservation confirmée ! ${what}, ${when}, de ${m.startTime} à ${m.endTime}. Payé : ${money(amountPaid)} (taxes incluses).${balanceTxt}`),
        sendAdminSMS(`Nouvelle réservation payée : ${m.userName} — ${what}, ${when} ${m.startTime}-${m.endTime}. Payé ${money(amountPaid)}${isDeposit ? `, solde ${money(balanceDue)} à percevoir` : ""}.`),
      ]),
  };
}

/** Créneau pris / groupe complet / demande plus valide → remboursement automatique. */
async function refundForConflict(
  session: Stripe.Checkout.Session,
  m: Stripe.Metadata,
  paymentIntent: string | null,
  paymentRowId: string,
  reason: string,
  technical = false
) {
  const supabaseAdmin = getSupabaseAdmin();
  const amount = (session.amount_total || 0) / 100;
  const what = m.fieldName || m.type || m.groupLabel || "Réservation";
  const when = m.dates ? JSON.parse(m.dates).join(", ") : m.date || "";

  let refunded = false;
  try {
    if (!paymentIntent) throw new Error("payment_intent absent");
    await stripe.refunds.create(
      { payment_intent: paymentIntent, reason: "duplicate", metadata: { cause: "creneau_indisponible" } },
      { idempotencyKey: `refund-conflict-${session.id}` }
    );
    refunded = true;
  } catch (e) {
    console.error("❌ Remboursement automatique impossible:", e);
  }

  await supabaseAdmin
    .from("payments")
    .update({
      status: refunded ? "refunded" : "failed",
      refunded_at: refunded ? new Date().toISOString() : null,
      notes: `Conflit : ${reason}`.slice(0, 500),
    })
    .eq("id", paymentRowId);

  await Promise.allSettled([
    refunded
      ? sendRefundedConflictEmail({ userName: m.userName, userEmail: m.userEmail, what, when, amount, technical })
      : Promise.resolve(),
    refunded
      ? sendSMS(m.userPhone, technical
          ? `Soccer City : un problème technique a empêché d'enregistrer votre réservation ${what} (${when}). Vous êtes remboursé intégralement (${money(amount)}). Nous vous contactons.`
          : `Soccer City : le créneau ${what} (${when}) a été réservé juste avant votre paiement. Vous êtes remboursé intégralement (${money(amount)}). Désolés !`)
      : Promise.resolve(),
    sendAdminAlertEmail(
      refunded ? "Paiement remboursé automatiquement (créneau pris)" : "REMBOURSEMENT MANUEL REQUIS",
      [
        `Client : ${m.userName} — ${m.userEmail} — ${m.userPhone}`,
        `Prestation : ${what} — ${when}`,
        `Montant : ${money(amount)} — session ${session.id}`,
        `Raison : ${reason}`,
        refunded ? "Le client a été remboursé et prévenu." : "⚠️ Le remboursement automatique a échoué : remboursez depuis le tableau de bord Stripe.",
      ]
    ),
    sendAdminSMS(
      refunded
        ? `Soccer City : paiement de ${m.userName} remboursé automatiquement (créneau déjà pris).`
        : `URGENT Soccer City : rembourser ${m.userName} (${money(amount)}) manuellement dans Stripe.`
    ),
  ]);
}

// =====================================================================
// REMBOURSEMENT FAIT DANS STRIPE → annulation automatique
// =====================================================================

async function handleRefund(charge: Stripe.Charge) {
  const supabaseAdmin = getSupabaseAdmin();
  const paymentIntent = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!paymentIntent) return;

  const full = charge.refunded || charge.amount_refunded >= charge.amount;

  const { data: payments, error } = await supabaseAdmin
    .from("payments")
    .select("id, status, stripe_session_id, reservation_id, user_name")
    .eq("stripe_payment_intent_id", paymentIntent);
  if (error) throw error;
  if (!payments || payments.length === 0) return;

  for (const p of payments) {
    // Déjà remboursé par nous (conflit) : rien d'autre à faire.
    if (p.status === "refunded" && !full) continue;

    if (!full) {
      // Remboursement partiel : le paiement reste « paid » (la comptabilité
      // le compte toujours) ; on note le montant remboursé.
      await supabaseAdmin
        .from("payments")
        .update({ notes: `Remboursement partiel : ${money(charge.amount_refunded / 100)}`, refunded_at: new Date().toISOString() })
        .eq("id", p.id);
      await sendAdminAlertEmail("Remboursement partiel effectué dans Stripe", [
        `Client : ${p.user_name}`,
        `Remboursé : ${money(charge.amount_refunded / 100)} sur ${money(charge.amount / 100)}`,
        "La réservation reste active. Modifiez-la dans l'admin si nécessaire.",
      ]);
      continue;
    }

    await supabaseAdmin
      .from("payments")
      .update({ status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", p.id);

    // Remboursement total : on libère le créneau / la place
    if (p.stripe_session_id) {
      await supabaseAdmin
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("stripe_session_id", p.stripe_session_id)
        .neq("status", "cancelled");
      await supabaseAdmin
        .from("academy_enrollments")
        .update({ status: "cancelled" })
        .eq("stripe_session_id", p.stripe_session_id);
    }
    if (p.reservation_id) {
      await supabaseAdmin
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", p.reservation_id)
        .neq("status", "cancelled");
    }
    if (p.status !== "refunded") {
      await sendAdminAlertEmail("Remboursement total effectué dans Stripe", [
        `Client : ${p.user_name}`,
        `Montant : ${money(charge.amount_refunded / 100)}`,
        "La réservation (ou l'inscription) correspondante a été annulée automatiquement et le créneau est libéré.",
      ]);
    }
  }
}
