// app/api/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fieldId, fieldName, date, hour, price, userName, userEmail, userPhone } = body;

    if (!fieldId || !date || hour === undefined || !price || !userEmail) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `Réservation ${fieldName} — ${date} à ${hour}h`,
            },
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        fieldId,
        fieldName,
        date,
        hour: String(hour),
        userName,
        userEmail,
        userPhone,
        price: String(price),
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
