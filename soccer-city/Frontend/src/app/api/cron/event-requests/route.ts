// app/api/cron/event-requests/route.ts
// Tâche planifiée (Vercel Cron, 1×/jour) : gestion des demandes d'événement
// sans réponse.
//
// Règle (délai adaptatif) :
//   délai total = (date de l'événement − date de la demande) ÷ 2, en jours
//   (minimum 1 jour)
//   • À MI-PARCOURS de ce délai  → rappel courriel au client (+ alerte admin),
//     une seule fois (reminder_sent_at).
//   • Au BOUT du délai (ou si la date de l'événement est passée)
//     → statut « expired » + courriel d'information au client.
//
// Exemple : demande le 1er octobre pour un événement le 21 octobre
//   → délai = 10 jours → rappel le 6 octobre → expiration le 11 octobre.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendEventRequestReminderEmail,
  sendEventRequestExpiredEmail,
  sendAdminPendingRequestEmail,
} from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DAY_MS = 24 * 60 * 60 * 1000;
const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export async function GET(req: NextRequest) {
  // Sécurité : seul Vercel Cron (ou quelqu'un qui connaît CRON_SECRET)
  // peut déclencher cette route.
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: requests, error } = await supabaseAdmin
    .from("private_events")
    .select("id, first_name, last_name, email, date, type, guests, created_at, reminder_sent_at")
    .eq("status", "new");

  if (error) {
    console.error("❌ Cron demandes — lecture:", error);
    return NextResponse.json({ error: "Erreur lecture" }, { status: 500 });
  }

  const today = dateOnly(new Date());
  let reminders = 0;
  let expired = 0;

  for (const r of requests ?? []) {
    const createdDay = dateOnly(new Date(r.created_at));
    const eventDay = dateOnly(new Date(`${r.date}T00:00:00`));

    // Délai total = moitié de l'écart demande → événement (min. 1 jour)
    const gapDays = Math.max(0, Math.round((eventDay.getTime() - createdDay.getTime()) / DAY_MS));
    const delayDays = Math.max(1, Math.floor(gapDays / 2));
    const expiresAt = new Date(createdDay.getTime() + delayDays * DAY_MS);
    const reminderAt = new Date(createdDay.getTime() + Math.max(1, Math.floor(delayDays / 2)) * DAY_MS);

    const clientName = [r.first_name, r.last_name].filter(Boolean).join(" ") || "client";
    const expiresLabel = expiresAt.toLocaleDateString("fr-CA", {
      day: "numeric", month: "long", year: "numeric",
    });

    // ===== Expiration : délai atteint, ou événement déjà passé =====
    if (today.getTime() >= expiresAt.getTime() || today.getTime() > eventDay.getTime()) {
      const { error: upErr } = await supabaseAdmin
        .from("private_events")
        .update({ status: "expired", expires_at: expiresAt.toISOString().slice(0, 10) })
        .eq("id", r.id)
        .eq("status", "new"); // ne jamais écraser une réponse arrivée entre-temps
      if (upErr) { console.error("❌ Expiration:", r.id, upErr); continue; }
      expired++;
      await sendEventRequestExpiredEmail({
        userName: clientName,
        userEmail: r.email,
        eventType: r.type,
        eventDate: r.date,
      });
      continue;
    }

    // ===== Rappel à mi-parcours (une seule fois) =====
    if (!r.reminder_sent_at && today.getTime() >= reminderAt.getTime()) {
      await Promise.allSettled([
        sendEventRequestReminderEmail({
          userName: clientName,
          userEmail: r.email,
          eventType: r.type,
          eventDate: r.date,
          guests: r.guests,
          expiresLabel,
        }),
        sendAdminPendingRequestEmail({
          userName: clientName,
          userEmail: r.email,
          eventType: r.type,
          eventDate: r.date,
          expiresLabel,
        }),
      ]);
      const { error: remErr } = await supabaseAdmin
        .from("private_events")
        .update({
          reminder_sent_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString().slice(0, 10),
        })
        .eq("id", r.id);
      if (remErr) console.error("❌ Marquage rappel:", r.id, remErr);
      else reminders++;
    }
  }

  console.log(`✅ Cron demandes : ${reminders} rappel(s), ${expired} expiration(s)`);
  return NextResponse.json({ ok: true, reminders, expired, checked: requests?.length ?? 0 });
}
