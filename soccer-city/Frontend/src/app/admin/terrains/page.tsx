// app/admin/terrains/page.tsx
"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { Pencil, Plus, Trash2, ImageIcon, X, Upload } from "lucide-react";
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
import { FieldMediaManager } from "@/components/admin/FieldMediaManager";

const TURFS: TurfType[] = ["Gazon synthétique 5G", "Gazon synthétique hybride", "Gazon naturel"];
const EMPTY: Omit<Field, "id" | "created_at"> = {
  name: "", 
  slug: "", 
  image: "", 
  dimensions: "40 × 20 m",
  turf: "Gazon synthétique 5G", 
  lighting: true, 
  lockerRooms: 2, 
  parking: true,
  players: "5 vs 5", 
  pricePerHour: 90, 
  indoor: true, 
  active: true,
};

export default function AdminFields() {
  const { fields, addField, updateField, removeField, uploadImage, uploading } = useAppStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Field, "id" | "created_at">>(EMPTY);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCreate = () => { 
    setEditingId(null); 
    setDraft(EMPTY); 
    setPreviewUrl(null);
    setOpen(true); 
  };
  
  const startEdit = (f: Field) => { 
    setEditingId(f.id); 
    setDraft({ ...f }); 
    setPreviewUrl(f.image);
    setOpen(true); 
  };

  const handleImageSelect = async (file: File) => {
    if (!file) return;

    // Afficher un aperçu
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const imageUrl = await uploadImage(file, 'fields');
      setDraft(prev => ({ ...prev, image: imageUrl }));
    } catch (error: any) {
      alert(error.message || 'Erreur lors de l\'upload de l\'image');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const removeImage = () => {
    setPreviewUrl(null);
    setDraft(prev => ({ ...prev, image: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleImageSelect(file);
    }
  };

  // ✅ Fonction save avec validation et conversion de types
  const save = async () => {
    if (!draft.name.trim()) {
      alert('Le nom du terrain est requis');
      return;
    }

    // ✅ Nettoyer et convertir les données
    const payload = {
      name: draft.name.trim(),
      slug: draft.name.toLowerCase().replace(/\s+/g, '-'),
      image: draft.image || '',
      dimensions: draft.dimensions || '40 × 20 m',
      turf: draft.turf || 'Gazon synthétique 5G',
      lighting: draft.lighting ?? true,
      lockerRooms: Number(draft.lockerRooms) || 2,
      parking: draft.parking ?? true,
      players: draft.players || '5 vs 5',
      pricePerHour: Number(draft.pricePerHour) || 90,
      indoor: draft.indoor ?? false,
      active: draft.active ?? true,
    };

    try {
      if (editingId) {
        await updateField(editingId, payload);
      } else {
        await addField(payload);
      }
      setOpen(false);
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du terrain');
    }
  };

  const setValue = <K extends keyof Omit<Field, "id" | "created_at">>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestion des terrains</h1>
          <p className="text-sm text-muted-foreground">
            {fields.length} terrains · Ajoutez, modifiez ou supprimez vos terrains
          </p>
        </div>
        <Button variant="brand" onClick={startCreate}>
          <Plus className="size-4" /> Ajouter un terrain
        </Button>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.id} className="group overflow-hidden rounded-xl border bg-card transition-all hover:shadow-glow-sm">
            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
              {f.image ? (
                <Image 
                  src={f.image} 
                  alt={f.name} 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="size-12 text-muted-foreground/30" />
                </div>
              )}
              {!f.active && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Badge variant="destructive" className="text-lg">Désactivé</Badge>
                </div>
              )}
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="font-bold text-lg text-white">
                  {formatCAD(f.pricePerHour)}
                  <span className="text-xs font-normal text-white/70 ml-1">/h</span>
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-xl">{f.name}</h3>
                  <p className="text-sm text-muted-foreground">{f.dimensions} · {f.players}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={f.active}
                    onCheckedChange={(v: boolean) => updateField(f.id, { active: v })}
                    aria-label={`${f.active ? 'Désactiver' : 'Activer'} ${f.name}`}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => startEdit(f)}
                    className="hover:bg-primary/10"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={async () => {
                      if (confirm(`Supprimer définitivement « ${f.name} » ?`)) {
                        try {
                          await removeField(f.id);
                        } catch (error: any) {
                          alert(error.message || 'Erreur lors de la suppression du terrain');
                        }
                      }
                    }}
                    className="hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-secondary/50 px-2 py-1 text-center">
                  <span className="text-muted-foreground">Surface</span>
                  <p className="font-medium">{f.turf}</p>
                </div>
                <div className="rounded bg-secondary/50 px-2 py-1 text-center">
                  <span className="text-muted-foreground">Vestiaires</span>
                  <p className="font-medium">{f.lockerRooms}</p>
                </div>
                <div className="rounded bg-secondary/50 px-2 py-1 text-center">
                  <span className="text-muted-foreground">Éclairage</span>
                  <p className="font-medium">{f.lighting ? '✅' : '❌'}</p>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <FieldMediaManager fieldId={f.id} fieldName={f.name} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le terrain" : "Nouveau terrain"}</DialogTitle>
            <DialogDescription>
              Tous les changements sont visibles immédiatement sur le site.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Upload d'image */}
            <div className="space-y-2">
              <Label>Image du terrain</Label>
              <div
                className={`relative aspect-[16/9] rounded-lg overflow-hidden border-2 border-dashed transition-all ${
                  isDragging 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border bg-secondary/20'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {previewUrl ? (
                  <>
                    <Image 
                      src={previewUrl} 
                      alt="Aperçu" 
                      fill 
                      className="object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="size-4" />
                    </Button>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto" />
                          <p className="mt-2 text-white text-sm">Upload en cours...</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <ImageIcon className="size-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Cliquez ou glissez une image
                    </p>
                    <p className="text-xs text-muted-foreground/50">
                      JPG, PNG, WEBP ou SVG (max 5MB)
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="size-4 mr-2" />
                      Parcourir
                    </Button>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="f-name">Nom du terrain</Label>
                <Input 
                  id="f-name" 
                  value={draft.name} 
                  onChange={(e) => setValue("name", e.target.value)} 
                  placeholder="Terrain Alpha" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="f-dim">Dimensions</Label>
                <Input 
                  id="f-dim" 
                  value={draft.dimensions} 
                  onChange={(e) => setValue("dimensions", e.target.value)} 
                  placeholder="40 × 20 m" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="f-players">Format</Label>
                <Input 
                  id="f-players" 
                  value={draft.players} 
                  onChange={(e) => setValue("players", e.target.value)} 
                  placeholder="5 vs 5" 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="f-turf">Surface</Label>
                <Select 
                  id="f-turf" 
                  value={draft.turf} 
                  onChange={(e) => setValue("turf", e.target.value as TurfType)}
                >
                  {TURFS.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="f-price">Prix / heure (CAD)</Label>
                <Input 
                  id="f-price" 
                  type="number" 
                  min={0} 
                  step={5}
                  value={draft.pricePerHour} 
                  onChange={(e) => setValue("pricePerHour", Number(e.target.value))} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="f-lockers">Vestiaires</Label>
                <Input 
                  id="f-lockers" 
                  type="number" 
                  min={0} 
                  value={draft.lockerRooms} 
                  onChange={(e) => setValue("lockerRooms", Number(e.target.value))} 
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Éclairage LED</span>
                <Switch checked={draft.lighting} onCheckedChange={(v: boolean) => setValue("lighting", v)} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Parking gratuit</span>
                <Switch checked={draft.parking} onCheckedChange={(v: boolean) => setValue("parking", v)} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Terrain intérieur</span>
                <Switch checked={draft.indoor} onCheckedChange={(v: boolean) => setValue("indoor", v)} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Terrain actif</span>
                <Switch checked={draft.active} onCheckedChange={(v: boolean) => setValue("active", v)} />
              </div>
            </div>

            <Button 
              variant="brand" 
              onClick={save} 
              disabled={!draft.name.trim() || uploading} 
              className="w-full"
            >
              {uploading ? "Upload en cours..." : editingId ? "Enregistrer les modifications" : "Créer le terrain"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}