// app/api/event-request/pay/route.ts
// Lien de paiement envoyé au client quand l'admin accepte sa demande.
// À chaque clic : vérifie le jeton, le statut et la disponibilité, crée une
// session Stripe neuve (valable 35 min) et redirige le client vers Stripe.
// Le lien lui-même n'expire donc pas tant que la demande est acceptée.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { findConflicts } from "@/lib/server/availability";
import { isUuid, todayMontreal } from "@/lib/server/validation";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { computeTaxes, loadTaxSettings } from "@/lib/taxes";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_missing", {
  apiVersion: "2026-07-29.dahlia",
});

function sameToken(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function GET(req: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
  const fail = (raison: string) =>
    NextResponse.redirect(`${base}/reservation/cancel?raison=${encodeURIComponent(raison)}`, 303);

  if (!(await rateLimit(`event-pay:${clientIp(req)}`, 20, 600))) {
    return fail("Trop de tentatives. Réessayez dans quelques minutes.");
  }

  const id = req.nextUrl.searchParams.get("id") || "";
  const token = req.nextUrl.searchParams.get("t") || "";
  if (!isUuid(id) || !token) return fail("Lien de paiement invalide.");

  try {
    const { data: ev } = await getSupabaseAdmin()
      .from("private_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!ev || !ev.payment_token || !sameToken(String(ev.payment_token), token)) {
      return fail("Lien de paiement invalide ou remplacé par un plus récent.");
    }
    if (ev.status === "paid") {
      return NextResponse.redirect(`${base}/reservation/success?deja=1`, 303);
    }
    if (ev.status !== "accepted") {
      return fail("Cette demande n'est plus disponible. Contactez-nous pour en refaire une.");
    }
    if (ev.date < todayMontreal()) return fail("La date de cet événement est passée.");

    const conflicts = await findConflicts(
      [{ date: ev.date, startTime: ev.start_time, endDate: ev.date, endTime: ev.end_time }],
      null
    );
    if (conflicts.length) {
      return fail("Ce créneau vient d'être réservé par quelqu'un d'autre. Contactez-nous pour trouver une autre date.");
    }

    const taxSettings = await loadTaxSettings();
    const taxes = computeTaxes(Number(ev.quoted_price), taxSettings);
    const userName = [ev.first_name, ev.last_name].filter(Boolean).join(" ");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: ev.email,
      locale: "fr-CA",
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `${ev.type} — ${ev.date} de ${ev.start_time} à ${ev.end_time}`,
              description: `Sous-total ${taxes.subtotal.toFixed(2)} $ + TPS ${taxes.gst.toFixed(2)} $ + TVQ ${taxes.qst.toFixed(2)} $ = ${taxes.total.toFixed(2)} $`,
            },
            unit_amount: Math.round(taxes.total * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: "event-request",
        requestId: ev.id,
        type: ev.type,
        fieldId: "",
        fieldName: ev.type,
        date: ev.date,
        startTime: ev.start_time,
        endTime: ev.end_time,
        endDate: ev.date,
        guests: ev.guests ? String(ev.guests) : "",
        userName,
        userEmail: ev.email,
        userPhone: ev.phone,
        price: String(taxes.subtotal),
        taxGst: String(taxes.gst),
        taxQst: String(taxes.qst),
        total: String(taxes.total),
        paymentOption: "full",
        amountPaid: String(taxes.total),
        balanceDue: "0",
      },
      success_url: `${base}/reservation/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/reservation/cancel`,
    });

    return NextResponse.redirect(session.url!, 303);
  } catch (error) {
    console.error("❌ Lien de paiement événement:", error);
    return fail("Le paiement n'a pas pu être préparé. Réessayez dans un instant.");
  }
}
