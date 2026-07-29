// app/[slug]/page.tsx
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ✅ Forcer le rendu dynamique pour éviter les erreurs de build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageParams {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  try {
    // Vérifier que Supabase est configuré
    if (!isSupabaseConfigured()) {
      return {
        title: 'Page',
        description: 'Page du site Soccer City',
      };
    }

    const { data } = await supabase
      .from('pages')
      .select('title')
      .eq('slug', params.slug)
      .single();

    return {
      title: data?.title || 'Page',
      description: `Page ${data?.title || ''} - Soccer City`,
    };
  } catch (error) {
    console.error('❌ Erreur generateMetadata:', error);
    return {
      title: 'Page',
      description: 'Page du site Soccer City',
    };
  }
}

export default async function DynamicPage({ params }: PageParams) {
  try {
    // Vérifier que Supabase est configuré
    if (!isSupabaseConfigured()) {
      return (
        <div className="container max-w-3xl pt-32 pb-24">
          <p className="speed-eyebrow mb-4">Page</p>
          <h1 className="text-4xl font-bold mb-10">Page</h1>
          <div className="prose prose-invert max-w-none">
            <p>Contenu en cours de chargement...</p>
          </div>
        </div>
      );
    }

    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', params.slug)
      .single();

    // Si erreur ou pas de données, afficher 404
    if (error || !data) {
      console.error('❌ Page non trouvée:', params.slug, error);
      notFound();
    }

    return (
      <div className="container max-w-3xl pt-32 pb-24">
        <p className="speed-eyebrow mb-4">Page</p>
        <h1 className="text-4xl font-bold mb-10">{data.title}</h1>
        <div className="prose prose-invert max-w-none">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: data.content || '<p>Contenu de la page.</p>' 
            }} 
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ Erreur DynamicPage:', error);
    notFound();
  }
}
