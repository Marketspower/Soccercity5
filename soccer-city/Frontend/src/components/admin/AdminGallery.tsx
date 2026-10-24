// components/admin/AdminGallery.tsx
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { MEDIA_EVENT_TYPES, type MediaEventType } from "@/lib/types";

/**
 * Galerie photo.
 * @param fixedEventType  si fourni, la galerie ne montre et n'ajoute que les
 *                        photos de ce type d'événement (page admin par type).
 */
export function AdminGallery({ fixedEventType }: { fixedEventType?: MediaEventType } = {}) {
  const { gallery, addGalleryImage, updateGalleryImage, deleteGalleryImage, uploadImage, uploading, syncGallery } =
    useAppStore();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [eventType, setEventType] = useState<string>(fixedEventType ?? "");
  const [filter, setFilter] = useState<string>(fixedEventType ?? "all");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    syncGallery();
  }, [syncGallery]);

  const shown = useMemo(() => {
    if (filter === "all") return gallery;
    if (filter === "none") return gallery.filter((g) => !g.eventType);
    return gallery.filter((g) => g.eventType === filter);
  }, [gallery, filter]);

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setAlt("");
    setEventType(fixedEventType ?? "");
    setError("");
  };

  const pickFile = (f: File) => {
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("Formats acceptés : JPG, PNG, WEBP.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Image trop lourde (5 Mo maximum).");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (event) => setPreviewUrl(event.target?.result as string);
    reader.readAsDataURL(f);
  };

  const save = async () => {
    if (!file) {
      setError("Choisissez d'abord une image.");
      return;
    }
    try {
      const imageUrl = await uploadImage(file, "gallery");
      await addGalleryImage({
        imageUrl,
        alt: alt.trim() || (eventType ? `${eventType} chez Soccer City` : "Soccer City"),
        eventType: (eventType || null) as MediaEventType | null,
      });
      setOpen(false);
      reset();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'envoi de l'image.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {fixedEventType ? `Photos — ${fixedEventType}` : "Galerie"}
          </h2>
          <p className="text-sm text-white/50">
            {shown.length} image(s)
            {fixedEventType
              ? ` · affichées sur la page « ${fixedEventType} »`
              : " · rattachez chaque photo à un type d'événement pour l'afficher sur sa page"}
          </p>
        </div>
        <div className="flex gap-2">
          {!fixedEventType && (
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
              <option value="all">Toutes les photos</option>
              <option value="none">Galerie générale</option>
              {MEDIA_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          )}
          <Button variant="brand" onClick={() => { reset(); setOpen(true); }}>
            <Plus className="size-4" /> Ajouter une image
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <p>Aucune image ici pour l&apos;instant</p>
          <p className="text-sm">Ajoutez votre première image via le bouton ci-dessus</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {shown.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img src={img.imageUrl} alt={img.alt} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                {!fixedEventType && (
                  <Select
                    value={img.eventType ?? ""}
                    onChange={(e) =>
                      updateGalleryImage(img.id, { eventType: (e.target.value || null) as MediaEventType | null })
                    }
                    className="h-8 text-xs"
                  >
                    <option value="">Galerie générale</option>
                    {MEDIA_EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Supprimer cette image ?")) deleteGalleryImage(img.id);
                  }}
                >
                  <Trash2 className="size-4" /> Supprimer
                </Button>
              </div>
              {img.eventType && (
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                  {img.eventType}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une image</DialogTitle>
          </DialogHeader>

          <div
            className={`relative aspect-video rounded-lg overflow-hidden border-2 border-dashed transition-all ${
              isDragging ? "border-primary bg-primary/10" : "border-border"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) pickFile(f);
            }}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Aperçu" className="w-full h-full object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                >
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <button
                type="button"
                className="flex w-full flex-col items-center justify-center h-full p-6 text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-12 text-muted-foreground/50" />
                <span className="mt-2 text-sm text-muted-foreground">Cliquez ou glissez une image</span>
                <span className="text-xs text-muted-foreground/50">JPG, PNG, WEBP (max 5 Mo)</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ""; }}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <Label>Description de l&apos;image (référencement et accessibilité)</Label>
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Ex. : Tournoi corporatif sur le terrain 1" />
          </div>

          {!fixedEventType && (
            <div className="space-y-2">
              <Label>Afficher sur la page de l&apos;événement</Label>
              <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option value="">Galerie générale (page d&apos;accueil)</option>
                {MEDIA_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button variant="brand" className="w-full" onClick={save} disabled={uploading || !file}>
            {uploading ? "Envoi en cours…" : "Ajouter l'image"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
