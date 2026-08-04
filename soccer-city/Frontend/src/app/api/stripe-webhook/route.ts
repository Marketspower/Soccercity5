// app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
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
      // 1. Créer la réservation
      const { data: reservation, error: reservationError } = await supabaseAdmin
        .from("reservations")
        .insert({
          user_name: metadata.userName,
          user_email: metadata.userEmail,
          user_phone: metadata.userPhone,
          date: metadata.date,
          hour: Number(metadata.hour),
          price: Number(metadata.price),
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
          hour: Number(metadata.hour),
        });

      if (paymentError) throw paymentError;

      console.log("✅ Réservation et paiement enregistrés:", reservation.id);
    } catch (error) {
      console.error("❌ Erreur enregistrement réservation/paiement:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}