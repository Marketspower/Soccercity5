// app/api/event-request/route.ts
// Formulaire « demande d'événement sur mesure ».
// Protections : validation stricte, champ piège anti-robot (honeypot),
// limite d'envoi par IP et par courriel (chaque envoi déclenche des SMS payants).
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { isDate, isEmail, isPhone, cleanText, todayMontreal, addDays } from "@/lib/server/validation";
import {
  sendEventRequestConfirmationEmail,
  sendEventRequestAdminNotificationEmail,
} from "@/lib/email";
import { sendSMS, sendAdminSMS } from "@/lib/sms";

export const dynamic = "force-dynamic";

const EVENT_TYPES = ["Anniversaire", "Tournoi", "Entreprise", "École", "Événement privé", "Compétition"];
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Champ piège invisible : un humain ne le remplit jamais.
    if (body.website) return NextResponse.json({ id: "" });

    const firstName = cleanText(body.firstName, 80);
    const lastName = cleanText(body.lastName, 80);
    const company = cleanText(body.company, 120);
    const phone = cleanText(body.phone, 30);
    const email = cleanText(body.email, 200).toLowerCase();
    const date = String(body.date || "");
    const guests = Number(body.guests);
    const type = String(body.type || "");
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 3000) : "";

    if (!firstName || !lastName) return bad("Veuillez indiquer votre prénom et votre nom.");
    if (!isEmail(email)) return bad("Adresse courriel invalide.");
    if (!isPhone(phone)) return bad("Numéro de téléphone invalide.");
    if (!isDate(date)) return bad("Date invalide.");
    const today = todayMontreal();
    if (date < today) return bad("La date choisie est déjà passée.");
    if (date > addDays(today, 540)) return bad("Date trop éloignée (18 mois maximum).");
    if (!Number.isInteger(guests) || guests < 1 || guests > 500) return bad("Nombre de personnes invalide (1 à 500).");
    if (!EVENT_TYPES.includes(type)) return bad("Type d'événement invalide.");
    if (message.length < 5) return bad("Décrivez brièvement votre projet.");

    const ip = clientIp(req);
    const allowed =
      (await rateLimit(`event-request:ip:${ip}`, 3, 3600)) &&
      (await rateLimit(`event-request:email:${email}`, 3, 86400));
    if (!allowed) return bad("Vous avez déjà envoyé plusieurs demandes. Nous vous répondons très vite !", 429);

    const { data: eventRow, error: insertError } = await getSupabaseAdmin()
      .from("private_events")
      .insert({
        first_name: firstName,
        last_name: lastName,
        company: company || null,
        phone,
        email,
        date,
        guests,
        type,
        message,
        status: "new",
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    // Les notifications ne font jamais échouer la demande (déjà enregistrée).
    const emailParams = { firstName, lastName, company, phone, email, date, guests, type, message };
    await Promise.allSettled([
      sendEventRequestConfirmationEmail(emailParams),
      sendEventRequestAdminNotificationEmail(emailParams),
      sendSMS(phone, `Soccer City : votre demande d'événement (${type}, ${date}) a bien été reçue. Nous vous répondons par courriel avec une proposition.`),
      sendAdminSMS(`Nouvelle demande d'événement : ${firstName} ${lastName} — ${type} le ${date} (${guests} pers.). Tél: ${phone}`),
    ]);

    return NextResponse.json({ id: eventRow.id });
  } catch (error) {
    console.error("❌ Erreur traitement demande d'événement:", error);
    return bad("La demande n'a pas pu être envoyée. Réessayez ou appelez-nous.", 500);
  }
}
