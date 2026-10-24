// app/api/rating/route.ts
// Enregistre une note (1 à 5) avec limite anti-spam :
// 1 note par adresse IP toutes les 24 h.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : "";
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Note invalide (1 à 5)." }, { status: 400 });
    }
    if (!(await rateLimit(`rating:${clientIp(req)}`, 1, 86400))) {
      return NextResponse.json({ error: "Merci ! Vous avez déjà donné votre note aujourd'hui." }, { status: 429 });
    }
    const { error } = await getSupabaseAdmin().from("ratings").insert({ rating, comment: comment || null });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Erreur note:", error);
    return NextResponse.json({ error: "La note n'a pas pu être enregistrée." }, { status: 500 });
  }
}
