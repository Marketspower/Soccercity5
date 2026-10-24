// app/api/admin/event-requests/[id]/route.ts
// Réponse de l'admin à une demande d'événement :
//   • accept  → fixe prix + horaire, envoie au client un courriel + SMS
//               avec un lien de paiement sécurisé (qui n'expire pas).
//   • decline → statut « declined » + courriel + SMS au client.
//   • resend  → renvoie le courriel d'acceptation (même lien).
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/server/admin-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { findConflicts } from "@/lib/server/availability";
import { checkDaySlot, isUuid, loadOpeningHours } from "@/lib/server/validation";
import { computeTaxes, loadTaxSettings } from "@/lib/taxes";
import { sendEventRequestAcceptedEmail, sendEventRequestDeclinedEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

function payUrl(req: NextRequest, id: string, token: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
  return `${base}/api/event-request/pay?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return bad(auth.error, auth.status);

  const id = params.id;
  if (!isUuid(id)) return bad("Identifiant invalide.");

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const supabaseAdmin = getSupabaseAdmin();

  const { data: ev, error } = await supabaseAdmin
    .from("private_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return bad("Lecture impossible.", 500);
  if (!ev) return bad("Demande introuvable.", 404);

  const clientName = [ev.first_name, ev.last_name].filter(Boolean).join(" ") || "client";

  // ===================== REFUSER =====================
  if (action === "decline") {
    if (ev.status === "paid") return bad("Cette demande est déjà payée : remboursez-la depuis Stripe.");
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1500) : "";
    const { error: upErr } = await supabaseAdmin
      .from("private_events")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
        admin_message: reason || null,
        payment_token: null,
      })
      .eq("id", id);
    if (upErr) return bad("Mise à jour impossible.", 500);

    await Promise.allSettled([
      sendEventRequestDeclinedEmail({
        userName: clientName, userEmail: ev.email, eventType: ev.type, eventDate: ev.date, reason,
      }),
      sendSMS(ev.phone, `Soccer City : nous ne pouvons malheureusement pas accueillir votre ${ev.type} le ${ev.date}. Détails envoyés par courriel.`),
    ]);
    return NextResponse.json({ ok: true, status: "declined" });
  }

  // ===================== ACCEPTER / RENVOYER =====================
  if (action === "accept" || action === "resend") {
    if (ev.status === "paid") return bad("Cette demande est déjà payée.");

    let price = Number(ev.quoted_price);
    let startTime = ev.start_time as string;
    let endTime = ev.end_time as string;
    let token = ev.payment_token as string | null;
    let adminMessage = ev.admin_message as string | null;

    if (action === "accept") {
      price = Math.round(Number(body.price) * 100) / 100;
      startTime = String(body.startTime || "");
      endTime = String(body.endTime || "");
      adminMessage = typeof body.message === "string" ? body.message.trim().slice(0, 1500) || null : null;

      if (!(price > 0) || price > 100000) return bad("Prix invalide (sous-total avant taxes).");
      // Même horizon que le formulaire de demande (18 mois)
      const slotErr = checkDaySlot(ev.date, startTime, endTime, await loadOpeningHours(), 540);
      if (slotErr) return bad(slotErr);

      const conflicts = await findConflicts(
        [{ date: ev.date, startTime, endDate: ev.date, endTime }],
        null
      );
      if (conflicts.length) {
        return bad("Ce créneau est déjà occupé (réservation ou blocage). Choisissez un autre horaire.", 409);
      }

      token = token || randomBytes(24).toString("base64url");
      const { error: upErr } = await supabaseAdmin
        .from("private_events")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          quoted_price: price,
          start_time: startTime,
          end_time: endTime,
          admin_message: adminMessage,
          payment_token: token,
          payment_reminder_sent_at: null,
        })
        .eq("id", id);
      if (upErr) return bad("Mise à jour impossible. Avez-vous exécuté la migration SQL ?", 500);
    } else {
      if (ev.status !== "accepted" || !token || !(price > 0)) {
        return bad("Seule une demande acceptée peut recevoir un nouveau lien.");
      }
    }

    const taxes = computeTaxes(price, await loadTaxSettings());
    const link = payUrl(req, id, token!);
    const [mail] = await Promise.allSettled([
      sendEventRequestAcceptedEmail({
        userName: clientName, userEmail: ev.email, eventType: ev.type, eventDate: ev.date,
        startTime, endTime, subtotal: taxes.subtotal, gst: taxes.gst, qst: taxes.qst, total: taxes.total,
        payUrl: link, adminMessage,
      }),
      sendSMS(ev.phone, `Soccer City : votre ${ev.type} du ${ev.date} est accepté ! Total ${taxes.total.toFixed(2)} $. Payez ici pour confirmer la date : ${link}`),
    ]);

    const emailSent = mail.status === "fulfilled" && mail.value === true;
    return NextResponse.json({ ok: true, status: "accepted", payUrl: link, emailSent });
  }

  return bad("Action inconnue.");
}
