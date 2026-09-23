// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { computeTaxes, loadTaxSettings } from "@/lib/taxes";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fieldId, fieldName, date, startTime, endTime, endDate,
      price, userName, userEmail, userPhone,
    } = body;

    if (!fieldId || !date || !startTime || !endTime || !price || !userEmail) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

    // ✅ Taxes recalculées côté serveur (on ne fait pas confiance au montant du navigateur)
    const taxSettings = await loadTaxSettings();
    const taxes = computeTaxes(Number(price), taxSettings);

    const isMultiDay = !!endDate && endDate !== date;
    const label = isMultiDay
      ? `Réservation ${fieldName} — du ${date} ${startTime} au ${endDate} ${endTime}`
      : `Réservation ${fieldName} — ${date} de ${startTime} à ${endTime}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: label,
              description: `Sous-total ${taxes.subtotal.toFixed(2)} $ + TPS (${taxSettings.gstRate} %) ${taxes.gst.toFixed(2)} $ + TVQ (${taxSettings.qstRate} %) ${taxes.qst.toFixed(2)} $`,
            },
            unit_amount: Math.round(taxes.total * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        fieldId,
        fieldName,
        date,
        startTime,
        endTime,
        endDate: endDate || "",
        userName,
        userEmail,
        userPhone,
        price: String(taxes.subtotal),
        taxGst: String(taxes.gst),
        taxQst: String(taxes.qst),
        total: String(taxes.total),
      },
      success_url: `${origin}/reservation/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/reservation/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Erreur création session Stripe:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}