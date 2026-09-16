// components/admin/admin-stats.tsx
"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function AdminStats() {
  const { stats, loadStats, updateStat, isLoading } = useAppStore();
  const [editingStat, setEditingStat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const handleEdit = (stat: any) => {
    setEditingStat(stat.key);
    setEditValue(String(stat.value));
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await updateStat(key, Number(editValue));
      setEditingStat(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleCancel = () => {
    setEditingStat(null);
    setEditValue("");
  };

  // Si en cours de chargement
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Statistiques</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="ml-2 text-white/60">Chargement des statistiques...</span>
        </div>
      </div>
    );
  }

  // Si pas de stats
  if (!stats || stats.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Statistiques</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/40">Aucune statistique disponible.</p>
          <p className="text-sm text-white/20 mt-1">Les statistiques seront ajoutées automatiquement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Statistiques</h2>
          <p className="text-sm text-white/50">Gérez les statistiques affichées sur le site</p>
        </div>
        <div className="text-xs text-white/30">
          {stats.length} statistiques
        </div>
      </div>
      
      <div className="grid gap-4">
        {stats.map((stat) => (
          <div key={stat.key} className="bg-white/5 border border-white/10 rounded-xl p-5 transition-all hover:border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-white/70 text-sm font-medium">
                  {stat.label}
                </Label>
                {editingStat === stat.key ? (
                  <div className="flex items-center gap-3 mt-2">
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-32 bg-white/10 border-white/10 text-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(stat.key);
                        if (e.key === 'Escape') handleCancel();
                      }}
                    />
                    <Button 
                      size="sm" 
                      onClick={() => handleSave(stat.key)}
                      disabled={saving === stat.key}
                    >
                      {saving === stat.key ? (
                        <>
                          <Loader2 className="size-3 mr-1 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        'Sauvegarder'
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCancel}
                      disabled={saving === stat.key}
                    >
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-white mt-1">
                    {stat.value}{stat.suffix}
                  </p>
                )}
              </div>
              {editingStat !== stat.key && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEdit(stat)}
                  className="ml-4"
                >
                  Modifier
                </Button>
              )}
            </div>
            {editingStat !== stat.key && (
              <p className="text-xs text-white/30 mt-2">
                Dernière mise à jour : {new Date(stat.updated_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}