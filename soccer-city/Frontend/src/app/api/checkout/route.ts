// app/api/checkout/route.ts
// Crée la session de paiement Stripe pour :
//  - une location de terrain : 1 jour (kind absent / "terrain"), période
//    continue (endDate), ou dates au choix ("terrain-dates")
//  - un forfait anniversaire ("anniversaire") — durée fixe imposée par le serveur
//  - une inscription à l'académie ("academie")
//  - un événement réservé en ligne ("evenement") — prix à l'heure
//
// Sécurité : prix, durée et disponibilités sont TOUJOURS recalculés ici.
// Rien de ce qu'envoie le navigateur n'est cru sur parole.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  computeTaxes,
  computeDeposit,
  depositEligible,
  loadTaxSettings,
  loadPaymentSettings,
} from "@/lib/taxes";
import { ANNIVERSAIRE, ACADEMIE, academyGroup, eventPackage } from "@/config/packages";
import { loadEventPrices } from "@/lib/event-prices";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { findConflicts } from "@/lib/server/availability";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import {
  isUuid, isEmail, isPhone, isDate, isTime, cleanText,
  checkDaySlot, loadOpeningHours, todayMontreal, addDays, daysBetween,
  toMinutes, minutesToTime, nowTimeMontreal,
} from "@/lib/server/validation";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_missing", {
  apiVersion: "2026-07-29.dahlia",
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return bad("Paiement en ligne non configuré.", 503);

    const body = await req.json().catch(() => ({}));
    const kind = String(body.kind || "terrain");
    const userName = cleanText(body.userName, 100);
    const userEmail = cleanText(body.userEmail, 200).toLowerCase();
    const userPhone = cleanText(body.userPhone, 30);
    const paymentOption = body.paymentOption === "deposit" ? "deposit" : "full";
    const guestsNum = Number(body.guests);
    const guests = Number.isInteger(guestsNum) && guestsNum > 0 && guestsNum <= 500 ? guestsNum : null;

    if (!userName || userName.length < 2) return bad("Veuillez indiquer votre nom.");
    if (!isEmail(userEmail)) return bad("Adresse courriel invalide.");
    if (!isPhone(userPhone)) return bad("Numéro de téléphone invalide.");

    // L'URL de retour vient de la configuration, jamais de l'en-tête Origin.
    const origin = SITE_URL || req.nextUrl.origin;
    const hours = await loadOpeningHours();
    const taxSettings = await loadTaxSettings();
    const paySettings = await loadPaymentSettings();

    let subtotal: number;
    let label: string;
    let reservationType = "Terrain";
    let fieldId: string | null = null;
    let fieldName = "";
    let date = "";
    let endDate = "";
    let startTime = "";
    let endTime = "";
    const metaExtra: Record<string, string> = {};

    if (kind === "anniversaire") {
      // ===== Forfait anniversaire : durée FIXE calculée ici =====
      date = String(body.date || "");
      startTime = String(body.startTime || "");
      if (!isDate(date) || !isTime(startTime)) return bad("Date ou heure invalide.");
      const startMin = toMinutes(startTime);
      if (
        startMin < ANNIVERSAIRE.firstStartHour * 60 ||
        startMin > ANNIVERSAIRE.lastStartHour * 60 ||
        startMin % 30 !== 0
      ) {
        return bad("Heure de début non proposée pour le forfait anniversaire.");
      }
      endTime = minutesToTime(startMin + Math.round(ANNIVERSAIRE.durationHours * 60));
      const slotErr = checkDaySlot(date, startTime, endTime, hours);
      if (slotErr) return bad(slotErr);

      const conflicts = await findConflicts([{ date, startTime, endDate: date, endTime }], null);
      if (conflicts.length) return bad("Ce créneau vient d'être réservé. Choisissez une autre heure.", 409);

      subtotal = ANNIVERSAIRE.price;
      reservationType = "Anniversaire";
      fieldName = ANNIVERSAIRE.label;
      endDate = date;
      label = `Forfait anniversaire — ${date} de ${startTime} à ${endTime}`;
      metaExtra.guests = guests ? String(guests) : "";
    } else if (kind === "academie") {
      // ===== Académie =====
      const group = academyGroup(String(body.groupKey || ""));
      if (!group) return bad("Groupe inconnu.");
      const { count, error } = await getSupabaseAdmin()
        .from("academy_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("group_key", group.key)
        .eq("status", "confirmed");
      if (error) throw error;
      if ((count ?? 0) >= group.capacity) return bad("Ce groupe est complet. Choisissez un autre groupe.", 409);

      subtotal = ACADEMIE.price;
      reservationType = "Académie";
      fieldName = `Académie — ${group.label}`;
      label = `Académie — ${group.label} (${group.schedule}) — ${ACADEMIE.period}`;
      metaExtra.groupKey = group.key;
      metaExtra.groupLabel = group.label;
      metaExtra.schedule = group.schedule;
    } else if (kind === "evenement") {
      // ===== Événement en ligne : prix À L'HEURE × heures × jours, complexe privatisé =====
      const eventType = String(body.eventType || "");
      const pkg = eventPackage(eventType);
      const dates = uniqueDates(body.dates);
      startTime = String(body.startTime || "");
      endTime = String(body.endTime || "");
      if (!pkg) return bad("Type d'événement inconnu.");
      if (!dates) return bad("Dates invalides.");
      if (dates.length > 30) return bad("Maximum 30 jours par réservation.");
      for (const d of dates) {
        const err = checkDaySlot(d, startTime, endTime, hours);
        if (err) return bad(err);
      }
      const conflicts = await findConflicts(
        dates.map((d) => ({ date: d, startTime, endDate: d, endTime })),
        null
      );
      if (conflicts.length) {
        return bad(`Ces dates viennent d'être réservées : ${conflicts.join(", ")}. Retirez-les ou changez d'horaire.`, 409);
      }
      const eventPrices = await loadEventPrices();
      const perHour = eventPrices[eventType] ?? pkg.pricePerHour;
      const hoursPerDay = (toMinutes(endTime) - toMinutes(startTime)) / 60;
      subtotal = round2(perHour * hoursPerDay * dates.length);
      reservationType = eventType;
      fieldName = eventType;
      date = dates[0];
      endDate = dates[0];
      label = `${eventType} — ${dates.length} jour(s) de ${startTime} à ${endTime} (${hoursPerDay} h × ${perHour} $/h)`;
      metaExtra.dates = JSON.stringify(dates);
      metaExtra.guests = guests ? String(guests) : "";
    } else if (kind === "terrain-dates" || kind === "terrain") {
      // ===== Location de terrain =====
      fieldId = String(body.fieldId || "");
      if (!isUuid(fieldId)) return bad("Terrain invalide.");
      const { data: fld, error: fldErr } = await getSupabaseAdmin()
        .from("fields")
        .select("name, price_per_hour, active")
        .eq("id", fieldId)
        .maybeSingle();
      if (fldErr) throw fldErr;
      if (!fld || fld.active === false) return bad("Terrain introuvable ou indisponible.");
      fieldName = fld.name;
      const pricePerHour = Number(fld.price_per_hour);
      startTime = String(body.startTime || "");
      endTime = String(body.endTime || "");

      if (kind === "terrain-dates") {
        // Plusieurs dates au choix, même horaire chaque jour
        const dates = uniqueDates(body.dates);
        if (!dates) return bad("Dates invalides.");
        if (dates.length > 30) return bad("Maximum 30 dates par réservation.");
        for (const d of dates) {
          const err = checkDaySlot(d, startTime, endTime, hours);
          if (err) return bad(err);
        }
        const conflicts = await findConflicts(
          dates.map((d) => ({ date: d, startTime, endDate: d, endTime })),
          fieldId
        );
        if (conflicts.length) {
          return bad(`Ces dates viennent d'être réservées sur cet horaire : ${conflicts.join(", ")}. Retirez-les ou changez d'horaire.`, 409);
        }
        const hoursPerDay = (toMinutes(endTime) - toMinutes(startTime)) / 60;
        subtotal = round2(hoursPerDay * pricePerHour * dates.length);
        date = dates[0];
        endDate = dates[0];
        label = `Réservation ${fld.name} — ${dates.length} dates de ${startTime} à ${endTime}`;
        metaExtra.dates = JSON.stringify(dates);
      } else {
        date = String(body.date || "");
        endDate = body.endDate ? String(body.endDate) : date;
        if (!isDate(date) || !isDate(endDate) || !isTime(startTime) || !isTime(endTime)) {
          return bad("Date ou heure invalide.");
        }
        let spanHours: number;
        if (endDate === date) {
          const err = checkDaySlot(date, startTime, endTime, hours);
          if (err) return bad(err);
          spanHours = (toMinutes(endTime) - toMinutes(startTime)) / 60;
        } else {
          // Période continue sur plusieurs jours
          const today = todayMontreal();
          if (date < today) return bad(`La date ${date} est déjà passée.`);
          if (date === today && toMinutes(startTime) <= toMinutes(nowTimeMontreal())) {
            return bad("Cette heure est déjà passée aujourd'hui.");
          }
          if (endDate < date) return bad("La date de fin doit être après la date de début.");
          if (daysBetween(date, endDate) > 31) return bad("Période maximale : 31 jours.");
          if (date > addDays(today, 365)) return bad("Réservation possible jusqu'à un an à l'avance.");
          spanHours =
            (new Date(`${endDate}T${endTime}:00Z`).getTime() - new Date(`${date}T${startTime}:00Z`).getTime()) /
            3_600_000;
          if (spanHours <= 0) return bad("Période invalide.");
        }
        const conflicts = await findConflicts([{ date, startTime, endDate, endTime }], fieldId);
        if (conflicts.length) return bad("Ce créneau vient d'être réservé. Choisissez un autre horaire.", 409);

        subtotal = round2(spanHours * pricePerHour);
        label =
          endDate === date
            ? `Réservation ${fld.name} — ${date} de ${startTime} à ${endTime}`
            : `Réservation ${fld.name} — du ${date} ${startTime} au ${endDate} ${endTime}`;
      }
    } else {
      return bad("Type de réservation inconnu.");
    }

    if (!(subtotal > 0)) return bad("Montant invalide.");

    // ===== Taxes + acompte (validé côté serveur) =====
    const taxes = computeTaxes(subtotal, taxSettings);
    const wantsDeposit = paymentOption === "deposit" && depositEligible(taxes.subtotal, paySettings);
    const { deposit, balance } = computeDeposit(taxes.total, paySettings);
    const amountToPay = wantsDeposit ? deposit : taxes.total;
    const balanceDue = wantsDeposit ? balance : 0;

    const taxLine = `Sous-total ${taxes.subtotal.toFixed(2)} $ + TPS (${taxSettings.gstRate} %) ${taxes.gst.toFixed(2)} $ + TVQ (${taxSettings.qstRate} %) ${taxes.qst.toFixed(2)} $ = ${taxes.total.toFixed(2)} $`;
    const description = wantsDeposit
      ? `Acompte de ${paySettings.depositPercent} %. ${taxLine}. Solde de ${balance.toFixed(2)} $ à régler le jour même, avant l'accès au terrain.`
      : taxLine;

    // Anti-abus : 10 sessions de paiement / 10 min / adresse IP (comptées
    // seulement quand la demande est valide, pour ne pas bloquer un vrai client).
    if (!(await rateLimit(`checkout:${clientIp(req)}`, 10, 600))) {
      return bad("Trop de tentatives. Réessayez dans quelques minutes.", 429);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      locale: "fr-CA",
      // Session courte : limite la fenêtre entre la vérification et le paiement.
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
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
        kind,
        type: reservationType,
        fieldId: fieldId || "",
        fieldName,
        date,
        startTime,
        endTime,
        endDate,
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
    return bad("Le paiement n'a pas pu être préparé. Réessayez dans un instant.", 500);
  }
}

/** Liste de dates valides, sans doublon, triée — ou null si invalide. */
function uniqueDates(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const set = new Set<string>();
  for (const d of input) {
    if (!isDate(d)) return null;
    set.add(d);
  }
  return Array.from(set).sort();
}
