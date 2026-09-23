// app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendReservationConfirmationEmail, sendAdminNotificationEmail } from "@/lib/email";
import { sendSMS, sendAdminSMS } from "@/lib/sms";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
});

// ⚠️ Client Supabase avec la clé service_role : contourne RLS.
// Usage strictement côté serveur (jamais dans un fichier accessible au navigateur).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("❌ Signature webhook invalide:", error.message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (!metadata) {
      console.error("❌ Métadonnées manquantes sur la session Stripe");
      return NextResponse.json({ error: "Métadonnées manquantes" }, { status: 400 });
    }

    try {
      const isDeposit = metadata.paymentOption === "deposit";
      const balanceTxt = isDeposit
        ? ` Solde à régler le jour de l'événement, avant l'accès au terrain : ${Number(metadata.balanceDue).toFixed(2)} $.`
        : "";

      // ===== Inscription à l'académie (pas une réservation datée) =====
      if (metadata.kind === "academie") {
        const { error: academyError } = await supabaseAdmin
          .from("academy_enrollments")
          .insert({
            group_key: metadata.groupKey,
            group_label: metadata.groupLabel,
            schedule: metadata.schedule,
            user_name: metadata.userName,
            user_email: metadata.userEmail,
            user_phone: metadata.userPhone,
            price: Number(metadata.price),
            tax_gst: Number(metadata.taxGst),
            tax_qst: Number(metadata.taxQst),
            total: Number(metadata.total),
            payment_option: metadata.paymentOption || "full",
            amount_paid: Number(metadata.amountPaid || metadata.total),
            balance_due: Number(metadata.balanceDue || 0),
            status: "confirmed",
          });
        if (academyError) throw academyError;

        await Promise.allSettled([
          sendSMS(
            metadata.userPhone,
            `Soccer City : inscription à l'académie confirmée ! ${metadata.groupLabel} — ${metadata.schedule}. Payé : ${Number(metadata.amountPaid).toFixed(2)} $.${balanceTxt}`
          ),
          sendAdminSMS(
            `Nouvelle inscription académie : ${metadata.userName} — ${metadata.groupLabel}. Payé ${Number(metadata.amountPaid).toFixed(2)} $${isDeposit ? `, solde ${Number(metadata.balanceDue).toFixed(2)} $` : ""}.`
          ),
        ]);
        return NextResponse.json({ received: true });
      }

      // 1. Créer la réservation (end_date renseigné uniquement si multi-jours)
      const { data: reservation, error: reservationError } = await supabaseAdmin
        .from("reservations")
        .insert({
          user_name: metadata.userName,
          user_email: metadata.userEmail,
          user_phone: metadata.userPhone,
          date: metadata.date,
          start_time: metadata.startTime,
          end_time: metadata.endTime,
          end_date: metadata.endDate || null,
          price: Number(metadata.price),
          tax_gst: metadata.taxGst ? Number(metadata.taxGst) : null,
          tax_qst: metadata.taxQst ? Number(metadata.taxQst) : null,
          total: metadata.total ? Number(metadata.total) : null,
          type: metadata.type || "Terrain",
          guests: metadata.guests ? Number(metadata.guests) : null,
          payment_option: metadata.paymentOption || "full",
          amount_paid: metadata.amountPaid ? Number(metadata.amountPaid) : null,
          balance_due: metadata.balanceDue ? Number(metadata.balanceDue) : 0,
          status: "confirmed",
        })
        .select()
        .single();

      if (reservationError) throw reservationError;

      // 2. Enregistrer le paiement, lié à la réservation créée
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          reservation_id: reservation.id,
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          amount: session.amount_total,
          currency: session.currency,
          status: "paid",
          field_id: metadata.fieldId,
          user_name: metadata.userName,
          user_email: metadata.userEmail,
          user_phone: metadata.userPhone,
          date: metadata.date,
        });

      if (paymentError) throw paymentError;

      console.log("✅ Réservation et paiement enregistrés:", reservation.id);

      // 3. Notifications — courriel + SMS, client et admin.
      const emailParams = {
        userName: metadata.userName,
        userEmail: metadata.userEmail,
        userPhone: metadata.userPhone,
        fieldName: metadata.fieldName,
        date: metadata.date,
        startTime: metadata.startTime,
        endTime: metadata.endTime,
        price: Number(metadata.amountPaid || metadata.total || metadata.price),
      };

      await Promise.allSettled([
        sendReservationConfirmationEmail(emailParams),
        sendAdminNotificationEmail(emailParams),
        sendSMS(
          metadata.userPhone,
          `Soccer City : réservation confirmée ! ${metadata.fieldName}, ${metadata.date} de ${metadata.startTime} à ${metadata.endTime}. Payé : ${Number(metadata.amountPaid || metadata.total).toFixed(2)} $ (taxes incluses).${balanceTxt}`
        ),
        sendAdminSMS(
          `Nouvelle réservation payée : ${metadata.userName} — ${metadata.fieldName}, ${metadata.date} ${metadata.startTime}-${metadata.endTime}. Payé ${Number(metadata.amountPaid || metadata.total).toFixed(2)} $${isDeposit ? `, solde ${Number(metadata.balanceDue).toFixed(2)} $ à percevoir` : ""}.`
        ),
      ]);
    } catch (error) {
      console.error("❌ Erreur enregistrement réservation/paiement:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}