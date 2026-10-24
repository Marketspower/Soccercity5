// app/api/reservation-status/route.ts
// Utilisé par la page « merci » : vérifie auprès de Stripe que le paiement
// est bien passé, et indique si la réservation est enregistrée.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_missing", {
  apiVersion: "2026-07-29.dahlia",
});

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ status: "unknown" }, { status: 400 });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ status: "unpaid" });
    }
    const { data: payment } = await getSupabaseAdmin()
      .from("payments")
      .select("status")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    const m = session.metadata || {};
    const status =
      payment?.status === "paid" ? "confirmed"
      : payment?.status === "refunded" ? "refunded"
      : payment?.status === "failed" ? "failed"
      : "processing";

    // Uniquement un récapitulatif non sensible (pas de courriel ni de téléphone).
    return NextResponse.json({
      status,
      summary: {
        what: m.fieldName || m.type || m.groupLabel || "Réservation",
        date: m.dates ? JSON.parse(m.dates).join(", ") : m.date || "",
        startTime: m.startTime || "",
        endTime: m.endTime || "",
        amountPaid: (session.amount_total || 0) / 100,
        balanceDue: Number(m.balanceDue || 0),
        currency: (session.currency || "cad").toUpperCase(),
        firstName: String(m.userName || "").split(" ")[0],
      },
    });
  } catch (error) {
    console.error("❌ reservation-status:", error);
    return NextResponse.json({ status: "unknown" }, { status: 500 });
  }
}
