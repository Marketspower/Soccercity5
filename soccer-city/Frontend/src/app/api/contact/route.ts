// app/api/contact/route.ts
// Formulaire de contact : envoie le message à l'admin (« Répondre » répond
// directement au client) + accusé de réception au client.
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { cleanText, isEmail } from "@/lib/server/validation";
import { sendContactMessageEmail, sendContactAckEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.website) return NextResponse.json({ ok: true }); // robot

    const name = cleanText(body.name, 80);
    const email = cleanText(body.email, 200).toLowerCase();
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 3000) : "";
    const source = cleanText(body.source, 40);

    if (name.length < 2) return bad("Votre nom est requis.");
    if (!isEmail(email)) return bad("Adresse courriel invalide.");
    if (message.length < 10) return bad("Dites-nous-en un peu plus (10 caractères minimum).");

    if (!(await rateLimit(`contact:${clientIp(req)}`, 5, 3600))) {
      return bad("Trop de messages envoyés. Réessayez dans une heure ou appelez-nous.", 429);
    }

    const sent = await sendContactMessageEmail({ name, email, message, source: source || undefined });
    if (!sent) return bad("Le message n'a pas pu être envoyé. Écrivez-nous sur WhatsApp ou par téléphone.", 502);
    await sendContactAckEmail({ name, email }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Erreur contact:", error);
    return bad("Le message n'a pas pu être envoyé. Réessayez plus tard.", 500);
  }
}
