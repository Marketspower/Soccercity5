import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ✅ Force le rendu dynamique : sans ça, Next.js génère cette page une seule
// fois au build et la garde en cache — les changements faits dans le CMS
// n'apparaissent qu'après un redéploiement, jamais "en temps réel".
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageParams {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { data } = await supabase
    .from('pages')
    .select('title')
    .eq('slug', params.slug)
    .single();

  return {
    title: data?.title || 'Page',
  };
}

export default async function DynamicPage({ params }: PageParams) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <div className="container max-w-3xl pt-32 pb-24">
      <p className="speed-eyebrow mb-4">Page</p>
      <h1 className="text-4xl font-bold mb-10">{data.title}</h1>
      <div className="prose prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: data.content || '<p>Contenu de la page.</p>' }} />
      </div>
    </div>
  );
}