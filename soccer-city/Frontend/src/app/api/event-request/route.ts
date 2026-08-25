// app/api/event-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendEventRequestConfirmationEmail,
  sendEventRequestAdminNotificationEmail,
} from "@/lib/email";
import { sendSMS, sendAdminSMS } from "@/lib/sms";

// ⚠️ Client Supabase avec la clé service_role : contourne RLS.
// Usage strictement côté serveur.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, company, phone, email, date, guests, type, message } = body;

    if (!firstName || !lastName || !phone || !email || !date || !guests || !type || !message) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // 1. Enregistrer la demande en base
    const { data: eventRow, error: insertError } = await supabaseAdmin
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
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Notifications — courriel + SMS, client et admin.
    // On ne fait jamais échouer la requête si une notification rate : la
    // demande est déjà enregistrée, c'est ce qui compte le plus.
    const emailParams = { firstName, lastName, company, phone, email, date, guests, type, message };

    await Promise.allSettled([
      sendEventRequestConfirmationEmail(emailParams),
      sendEventRequestAdminNotificationEmail(emailParams),
      sendSMS(
        phone,
        `Soccer City : votre demande d'événement (${type}, ${date}) a bien été reçue. Nous vous recontactons sous 24h.`
      ),
      sendAdminSMS(
        `Nouvelle demande d'événement : ${firstName} ${lastName} — ${type} le ${date} (${guests} pers.). Tél: ${phone}`
      ),
    ]);

    return NextResponse.json({ id: eventRow.id });
  } catch (error: any) {
    console.error("❌ Erreur traitement demande d'événement:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}