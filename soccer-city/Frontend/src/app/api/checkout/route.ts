// app/api/checkout/route.ts
// Crée la session de paiement Stripe pour :
//  - une location de terrain (kind absent ou "terrain")
//  - un forfait anniversaire (kind "anniversaire" — prix serveur, conflit vérifié)
//  - une inscription à l'académie (kind "academie" — prix serveur, places vérifiées)
// Gère le paiement en totalité ou l'acompte (deposit_percent, seuil
// deposit_min_subtotal) — montants toujours recalculés côté serveur.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  computeTaxes,
  computeDeposit,
  depositEligible,
  loadTaxSettings,
  loadPaymentSettings,
} from "@/lib/taxes";
import { ANNIVERSAIRE, ACADEMIE, academyGroup } from "@/config/packages";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-07-29.dahlia",
});

// ⚠️ service_role : usage strictement côté serveur (vérifications de
// disponibilité qui doivent voir toutes les réservations).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      kind, fieldId, fieldName, date, startTime, endTime, endDate,
      price, userName, userEmail, userPhone, paymentOption, guests, groupKey,
    } = body;

    if (!userEmail || !userName || !userPhone) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;
    const taxSettings = await loadTaxSettings();
    const paySettings = await loadPaymentSettings();

    // ===== 1) Sous-total et libellé selon le type de réservation =====
    let subtotal: number;
    let label: string;
    let reservationType = "Terrain";
    const metaExtra: Record<string, string> = {};

    if (kind === "anniversaire") {
      if (!date || !startTime || !endTime) {
        return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
      }
      // Prix imposé par le serveur — jamais celui du navigateur.
      subtotal = ANNIVERSAIRE.price;
      reservationType = "Anniversaire";
      label = `Forfait anniversaire — ${date} de ${startTime} à ${endTime}`;
      metaExtra.guests = guests ? String(guests) : "";

      // Conflit : le bloc de 2 h 30 doit être libre (réservations + blocages).
      const { data: clash } = await supabaseAdmin
        .from("reservations")
        .select("id")
        .eq("date", date)
        .neq("status", "cancelled")
        .lt("start_time", endTime)
        .gt("end_time", startTime);
      const { data: blocked } = await supabaseAdmin
        .from("availability")
        .select("id")
        .eq("date", date)
        .lt("start_time", endTime)
        .gt("end_time", startTime);
      if ((clash && clash.length > 0) || (blocked && blocked.length > 0)) {
        return NextResponse.json(
          { error: "Ce créneau vient d'être réservé. Choisissez une autre heure." },
          { status: 409 }
        );
      }
    } else if (kind === "academie") {
      const group = academyGroup(groupKey);
      if (!group) {
        return NextResponse.json({ error: "Groupe inconnu" }, { status: 400 });
      }
      subtotal = ACADEMIE.price;
      label = `Académie — ${group.label} (${group.schedule}) — 1 ${ACADEMIE.period}`;
      metaExtra.groupKey = group.key;
      metaExtra.groupLabel = group.label;
      metaExtra.schedule = group.schedule;

      // Places restantes vérifiées côté serveur.
      const { count } = await supabaseAdmin
        .from("academy_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("group_key", group.key)
        .eq("status", "confirmed");
      if ((count ?? 0) >= group.capacity) {
        return NextResponse.json(
          { error: "Ce groupe est complet. Choisissez un autre groupe." },
          { status: 409 }
        );
      }
    } else {
      // Location de terrain (flux existant)
      if (!fieldId || !date || !startTime || !endTime || !price) {
        return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
      }
      subtotal = Number(price);
      const isMultiDay = !!endDate && endDate !== date;
      label = isMultiDay
        ? `Réservation ${fieldName} — du ${date} ${startTime} au ${endDate} ${endTime}`
        : `Réservation ${fieldName} — ${date} de ${startTime} à ${endTime}`;
    }

    // ===== 2) Taxes + option de paiement (validée côté serveur) =====
    const taxes = computeTaxes(subtotal, taxSettings);
    const wantsDeposit =
      paymentOption === "deposit" && depositEligible(taxes.subtotal, paySettings);
    const { deposit, balance } = computeDeposit(taxes.total, paySettings);
    const amountToPay = wantsDeposit ? deposit : taxes.total;
    const balanceDue = wantsDeposit ? balance : 0;

    const taxLine = `Sous-total ${taxes.subtotal.toFixed(2)} $ + TPS (${taxSettings.gstRate} %) ${taxes.gst.toFixed(2)} $ + TVQ (${taxSettings.qstRate} %) ${taxes.qst.toFixed(2)} $ = ${taxes.total.toFixed(2)} $`;
    const description = wantsDeposit
      ? `Acompte de ${paySettings.depositPercent} %. ${taxLine}. Solde de ${balance.toFixed(2)} $ à régler le jour de l'événement, avant l'accès au terrain.`
      : taxLine;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: { name: label, description },
            unit_amount: Math.round(amountToPay * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: kind || "terrain",
        type: reservationType,
        fieldId: fieldId || "",
        fieldName: fieldName || "",
        date: date || "",
        startTime: startTime || "",
        endTime: endTime || "",
        endDate: endDate || "",
        userName,
        userEmail,
        userPhone,
        price: String(taxes.subtotal),
        taxGst: String(taxes.gst),
        taxQst: String(taxes.qst),
        total: String(taxes.total),
        paymentOption: wantsDeposit ? "deposit" : "full",
        amountPaid: String(amountToPay),
        balanceDue: String(balanceDue),
        ...metaExtra,
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
