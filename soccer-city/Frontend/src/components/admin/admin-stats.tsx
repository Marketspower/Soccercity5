"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminStats() {
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
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Statistiques</h2>
      
      <div className="grid gap-4">
        {stats.map((stat) => (
          <div key={stat.key} className="flex items-center justify-between border p-4 rounded-lg">
            <div>
              <p className="font-semibold">{stat.label}</p>
              {editingStat === stat.key ? (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-32"
                  />
                  <Button size="sm" onClick={() => handleSave(stat.key)}>Sauvegarder</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingStat(null)}>Annuler</Button>
                </div>
              ) : (
                <p className="text-2xl font-bold text-primary">
                  {stat.value}{stat.suffix}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => handleEdit(stat)}>
              Modifier
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}