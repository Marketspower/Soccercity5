"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function AdminPages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Page | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Erreur chargement pages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!slug || !title) {
      alert('Le slug et le titre sont obligatoires');
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        // Mise à jour
        const { error } = await supabase
          .from('pages')
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        
        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase
          .from('pages')
          .insert([{ slug, title, content }]);
        
        if (error) throw error;
      }

      resetForm();
      await loadPages();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (page: Page) => {
    setEditing(page);
    setSlug(page.slug);
    setTitle(page.title);
    setContent(page.content || '');
  };

  const resetForm = () => {
    setEditing(null);
    setSlug('');
    setTitle('');
    setContent('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette page ?')) return;
    
    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await loadPages();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return <div className="text-white/60">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">📄 Gestion des pages</h1>
      <p className="text-sm text-white/50">Créez et gérez les pages du site (Confidentialité, Conditions...)</p>

      {/* Formulaire */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {editing ? 'Modifier la page' : 'Nouvelle page'}
        </h2>
        <div className="grid gap-4">
          <div>
            <Label className="text-white/70">Slug (URL)</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="confidentialite"
              className="bg-white/10 border-white/10 text-white"
            />
            <p className="text-xs text-white/30 mt-1">Ex: /confidentialite, /conditions</p>
          </div>
          <div>
            <Label className="text-white/70">Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Politique de confidentialité"
              className="bg-white/10 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-white/70">Contenu (HTML)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="<h2>Titre</h2><p>Votre contenu...</p>"
              className="min-h-[200px] bg-white/10 border-white/10 text-white"
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Sauvegarde...' : editing ? 'Mettre à jour' : 'Créer la page'}
            </Button>
            {editing && (
              <Button variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des pages */}
      <div className="space-y-3">
        {pages.map((page) => (
          <div key={page.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{page.title}</p>
              <p className="text-sm text-white/40">/{page.slug}</p>
              <p className="text-xs text-white/30">
                Mis à jour le {new Date(page.updated_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href={`/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Voir
              </a>
              <Button variant="outline" size="sm" onClick={() => handleEdit(page)}>
                Modifier
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(page.id)}>
                Supprimer
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}