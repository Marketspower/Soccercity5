// app/[slug]/page.tsx
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ✅ Ajouter cette ligne pour forcer le rendu dynamique
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageParams {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  try {
    const { data } = await supabase
      .from('pages')
      .select('title')
      .eq('slug', params.slug)
      .single();

    return {
      title: data?.title || 'Page',
    };
  } catch (error) {
    return {
      title: 'Page',
    };
  }
}

export default async function DynamicPage({ params }: PageParams) {
  try {
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
  } catch (error) {
    notFound();
  }
}
