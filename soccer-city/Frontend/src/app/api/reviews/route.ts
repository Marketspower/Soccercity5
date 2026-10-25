// app/api/reviews/route.ts
// Dépôt d'un avis client. L'avis est enregistré « en attente » : il ne
// s'affiche sur le site qu'après approbation dans Admin → Avis.
// Protections : champ piège, limite par IP, longueur, lien de vérification.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { cleanText, isEmail } from "@/lib/server/validation";
import { sendAdminNewReviewEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.website) return NextResponse.json({ ok: true }); // robot

    const author = cleanText(body.author, 60);
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 1500) : "";
    const rating = Number(body.rating);
    const email = cleanText(body.email, 200).toLowerCase();
    const token = typeof body.token === "string" ? body.token.slice(0, 100) : "";

    if (author.length < 2) return bad("Indiquez votre prénom.");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad("Choisissez une note de 1 à 5 étoiles.");
    if (text.length < 10) return bad("Dites-nous-en un peu plus (10 caractères minimum).");
    if (email && !isEmail(email)) return bad("Adresse courriel invalide.");
    if (/https?:\/\/|www\./i.test(text)) return bad("Les liens ne sont pas acceptés dans les avis.");

    if (!(await rateLimit(`review:${clientIp(req)}`, 3, 86400))) {
      return bad("Merci ! Vous avez déjà laissé un avis récemment.", 429);
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Lien reçu par courriel après la visite → avis « client vérifié »
    let reservationId: string | null = null;
    if (token) {
      const { data: resa } = await supabaseAdmin
        .from("reservations")
        .select("id, user_email")
        .eq("review_token", token)
        .maybeSingle();
      if (resa) {
        reservationId = resa.id;
        const { count } = await supabaseAdmin
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("reservation_id", resa.id);
        if ((count ?? 0) > 0) return bad("Un avis a déjà été laissé pour cette réservation. Merci !", 409);
      }
    }

    const { error } = await supabaseAdmin.from("reviews").insert({
      author,
      rating,
      text,
      email: email || null,
      approved: false,
      verified: !!reservationId,
      reservation_id: reservationId,
    });
    if (error) throw error;

    await sendAdminNewReviewEmail({ author, rating, text, verified: !!reservationId }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Erreur avis:", error);
    return bad("L'avis n'a pas pu être enregistré. Réessayez plus tard.", 500);
  }
}
