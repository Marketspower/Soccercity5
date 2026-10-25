import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ConsentButton } from "@/components/legal/consent-button";

// Pages gérées dans Admin → Pages CMS (ex. /confidentialite, /conditions).
// Rendu dynamique : une modification dans le CMS est visible immédiatement.
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageParams {
  params: { slug: string };
}

async function loadPage(slug: string) {
  const { data } = await supabase.from("pages").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const data = await loadPage(params.slug);
  return { title: data?.title || "Page" };
}

export default async function DynamicPage({ params }: PageParams) {
  const data = await loadPage(params.slug);
  if (!data) notFound();

  const updated = data.updated_at
    ? new Date(data.updated_at).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="container max-w-3xl pt-32 pb-24">
      <div className="mb-6">
        <Link href="/" className="text-sm text-primary hover:underline">← Retour au site</Link>
      </div>
      <h1 className="text-4xl font-bold">{data.title}</h1>
      {updated && <p className="mt-3 text-sm text-muted-foreground">Dernière mise à jour : {updated}</p>}
      {/* Contenu HTML saisi par l'administrateur dans le CMS */}
      <div className="cms-content mt-10" dangerouslySetInnerHTML={{ __html: data.content || "" }} />
      {params.slug === "confidentialite" && (
        <div className="mt-8"><ConsentButton /></div>
      )}
    </div>
  );
}
