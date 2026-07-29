// app/[slug]/page.tsx
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ✅ Forcer le rendu dynamique
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ✅ Désactiver la génération statique pour cette route
export const generateStaticParams = async () => {
  return [];
};

interface PageParams {
  params: {
    slug: string;
  };
}

// ✅ Simplifier generateMetadata - PAS d'appel à Supabase
export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  // Retourner des métadonnées simples sans appel à Supabase
  const titles: Record<string, string> = {
    'confidentialite': 'Politique de confidentialité',
    'conditions': "Conditions d'utilisation",
    'mentions-legales': 'Mentions légales',
  };
  
  const title = titles[params.slug] || 'Page';
  
  return {
    title: `${title} | Soccer City`,
    description: `Page ${title} - Soccer City`,
  };
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
