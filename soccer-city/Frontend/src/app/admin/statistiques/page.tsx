"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminStatsPage() {
  const { stats, loadStats, updateStat } = useAppStore();
  const [editingStat, setEditingStat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  useEffect(() => {
    loadStats();
  }, []);

  const handleEdit = (stat: any) => {
    setEditingStat(stat.key);
    setEditValue(String(stat.value));
  };

  const handleSave = async (key: string) => {
    await updateStat(key, Number(editValue));
    setEditingStat(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">📊 Statistiques</h1>
      <p className="text-sm text-white/50">Modifiez les statistiques affichées sur le site</p>

      <div className="grid gap-4">
        {stats.map((stat) => (
          <div key={stat.key} className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/70">{stat.label}</Label>
                {editingStat === stat.key ? (
                  <div className="flex items-center gap-3 mt-2">
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-32 bg-white/10 border-white/10 text-white"
                    />
                    <Button size="sm" onClick={() => handleSave(stat.key)}>Sauvegarder</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingStat(null)}>Annuler</Button>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-white mt-1">
                    {stat.value}{stat.suffix}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEdit(stat)}>
                Modifier
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}