// components/admin/AdminGallery.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Plus, Trash2, Upload, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";

export function AdminGallery() {
  const { gallery, events, addGalleryImage, deleteGalleryImage, uploadImage, uploading, syncGallery } = useAppStore();
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [eventId, setEventId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    syncGallery();
  }, []);

  const handleImageSelect = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const imageUrl = await uploadImage(file, 'gallery');
      await addGalleryImage({
        imageUrl,
        alt: alt || 'Image de la galerie',
        eventId: eventId || null
      });
      setOpen(false);
      setPreviewUrl(null);
      setAlt("");
      setEventId("");
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload de l\'image');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleImageSelect(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Galerie</h2>
          <p className="text-sm text-white/50">
            {gallery.length} images · Gérez les images des terrains et événements
          </p>
        </div>
        <Button variant="brand" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Ajouter une image
        </Button>
      </div>

      {gallery.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <p>Aucune image dans la galerie</p>
          <p className="text-sm">Ajoutez votre première image via le bouton ci-dessus</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img
                src={img.imageUrl}
                alt={img.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteGalleryImage(img.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {img.event && (
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                  {img.event.type}
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs text-white/60">
                #{img.sortOrder}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une image</DialogTitle>
          </DialogHeader>

          <div
            className={`relative aspect-square rounded-lg overflow-hidden border-2 border-dashed transition-all ${
              isDragging ? 'border-primary bg-primary/10' : 'border-border'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Aperçu" className="w-full h-full object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setPreviewUrl(null)}
                >
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Upload className="size-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Cliquez ou glissez une image
                </p>
                <p className="text-xs text-muted-foreground/50">
                  JPG, PNG, WEBP (max 5MB)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Parcourir
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label>Texte alternatif</Label>
            <Input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Description de l'image"
            />
          </div>

          <div className="space-y-2">
            <Label>Événement associé (optionnel)</Label>
            <Select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">Aucun événement</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} - {e.type}
                </option>
              ))}
            </Select>
          </div>

          <Button
            variant="brand"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Upload en cours...' : 'Ajouter l\'image'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}