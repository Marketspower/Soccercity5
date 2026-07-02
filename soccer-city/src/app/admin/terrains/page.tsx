"use client";

import Image from "next/image";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { formatCAD } from "@/lib/utils";
import type { Field, TurfType } from "@/lib/types";

const TURFS: TurfType[] = ["Gazon synthétique 5G", "Gazon synthétique hybride", "Gazon naturel"];
const EMPTY: Omit<Field, "id"> = {
  name: "", slug: "", image: "/fields/field-1.svg", dimensions: "40 × 20 m",
  turf: "Gazon synthétique 5G", lighting: true, lockerRooms: 2, parking: true,
  players: "5 vs 5", pricePerHour: 90, indoor: true, active: true,
};

/** Gestion des terrains : ajout, modification, activation, suppression. */
export default function AdminFields() {
  const { fields, addField, updateField, removeField } = useAppStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Field, "id">>(EMPTY);

  const startCreate = () => { setEditingId(null); setDraft(EMPTY); setOpen(true); };
  const startEdit = (f: Field) => { setEditingId(f.id); setDraft({ ...f }); setOpen(true); };

  const save = () => {
    if (!draft.name.trim()) return;
    const payload = { ...draft, slug: draft.name.toLowerCase().replace(/\s+/g, "-") };
    if (editingId) updateField(editingId, payload);
    else addField(payload);
    setOpen(false);
  };

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl">Terrains</h1>
          <p className="mt-1 text-sm text-muted-foreground">{fields.length} terrains · gérez la fiche, le tarif et la disponibilité générale.</p>
        </div>
        <Button variant="brand" onClick={startCreate}><Plus /> Ajouter un terrain</Button>
      </header>

      <ul className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <li key={f.id} className="overflow-hidden rounded-lg border bg-card">
            <div className="relative aspect-[16/7]">
              <Image src={f.image} alt={f.name} fill sizes="480px" className="object-cover" />
              {!f.active && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Badge variant="destructive">Désactivé</Badge>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.dimensions} · {f.players} · {formatCAD(f.pricePerHour)}/h</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Switch
                  checked={f.active}
                  onCheckedChange={(v) => updateField(f.id, { active: v })}
                  aria-label={`${f.active ? "Désactiver" : "Activer"} ${f.name}`}
                />
                <Button variant="ghost" size="icon" aria-label={`Modifier ${f.name}`} onClick={() => startEdit(f)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer ${f.name}`}
                  onClick={() => window.confirm(`Supprimer définitivement « ${f.name} » ?`) && removeField(f.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* ── Dialog création / édition ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le terrain" : "Nouveau terrain"}</DialogTitle>
            <DialogDescription>Les changements sont visibles immédiatement sur le site.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="f-name">Nom</Label>
              <Input id="f-name" value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Terrain Alpha" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-dim">Dimensions</Label>
              <Input id="f-dim" value={draft.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="40 × 20 m" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-players">Format</Label>
              <Input id="f-players" value={draft.players} onChange={(e) => set("players", e.target.value)} placeholder="5 vs 5" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-turf">Surface</Label>
              <Select id="f-turf" value={draft.turf} onChange={(e) => set("turf", e.target.value as TurfType)}>
                {TURFS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-price">Prix / heure (CAD)</Label>
              <Input id="f-price" type="number" min={0} value={draft.pricePerHour} onChange={(e) => set("pricePerHour", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-lockers">Vestiaires</Label>
              <Input id="f-lockers" type="number" min={0} value={draft.lockerRooms} onChange={(e) => set("lockerRooms", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-image">Image (URL)</Label>
              <Input id="f-image" value={draft.image} onChange={(e) => set("image", e.target.value)} placeholder="/fields/field-1.svg" />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm"><span>Éclairage</span><Switch checked={draft.lighting} onCheckedChange={(v) => set("lighting", v)} /></div>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm"><span>Parking</span><Switch checked={draft.parking} onCheckedChange={(v) => set("parking", v)} /></div>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm"><span>Intérieur</span><Switch checked={draft.indoor} onCheckedChange={(v) => set("indoor", v)} /></div>
            <div className="flex items-center justify-between rounded-md border p-3 text-sm"><span>Actif</span><Switch checked={draft.active} onCheckedChange={(v) => set("active", v)} /></div>
          </div>

          <Button variant="brand" onClick={save} disabled={!draft.name.trim()}>
            {editingId ? "Enregistrer les modifications" : "Créer le terrain"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
