// app/api/academy-availability/route.ts
// Places restantes par groupe de l'académie (lecture via service_role :
// la table contient des coordonnées personnelles, donc pas de SELECT public).
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ACADEMIE } from "@/config/packages";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("academy_enrollments")
      .select("group_key")
      .eq("status", "confirmed");

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const g of ACADEMIE.groups) counts[g.key] = 0;
    (data || []).forEach((row: { group_key: string }) => {
      counts[row.group_key] = (counts[row.group_key] || 0) + 1;
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("❌ Erreur academy-availability:", error);
    // En cas d'erreur, on ne bloque pas la page : 0 inscrit partout.
    return NextResponse.json({ counts: {} });
  }
}
