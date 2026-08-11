// components/admin/AdminMedia.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Upload, X, Video, Music, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";

const ACCEPT_BY_TYPE: Record<string, string> = {
  video: "video/mp4,video/webm,video/quicktime",
  audio: "audio/mpeg,audio/wav,audio/ogg",
  photo: "image/jpeg,image/png,image/webp",
};

const HINT_BY_TYPE: Record<string, string> = {
  video: "MP4, WEBM, MOV (max 50MB)",
  audio: "MP3, WAV, OGG (max 50MB)",
  photo: "JPG, PNG, WEBP (max 50MB)",
};

export function AdminMedia() {
  const { media, events, addMediaItem, deleteMediaItem, syncMedia, uploadImage, uploading } = useAppStore();
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    type: "video" as "video" | "photo" | "audio",
    thumbnail: "",
    duration: "",
    description: "",
    isFeatured: false,
    eventId: "",
  });

  useEffect(() => {
    syncMedia();
  }, []);

  const resetForm = () => {
    setForm({ title: "", type: "video", thumbnail: "", duration: "", description: "", isFeatured: false, eventId: "" });
    setUploadedUrl("");
    setPreviewUrl("");
  };

  const handleFileSelect = async (file: File) => {
    // Aperçu local immédiat
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const url = await uploadImage(file, `${form.type}s`, 'media');
      setUploadedUrl(url);
    } catch (error: any) {
      alert(error.message || "Erreur lors de l'upload du fichier");
      setPreviewUrl("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFileSelect(file);
  };

  const removeFile = () => {
    setUploadedUrl("");
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!form.title || !uploadedUrl) {
      alert('Le titre et le fichier sont requis');
      return;
    }
    await addMediaItem({
      title: form.title,
      url: uploadedUrl,
      type: form.type,
      thumbnail: form.thumbnail || null,
      duration: form.duration || null,
      description: form.description || null,
      isFeatured: form.isFeatured,
      eventId: form.eventId || null,
    });
    setOpen(false);
    resetForm();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="size-4" />;
      case "audio": return <Music className="size-4" />;
      default: return <ImageIcon className="size-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video": return "Vidéo";
      case "audio": return "Audio";
      default: return "Photo";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Médias</h2>
          <p className="text-sm text-white/50">
            {media.length} médias · Vidéos, photos et audio
          </p>
        </div>
        <Button variant="brand" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Ajouter un média
        </Button>
      </div>

      {media.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <p>Aucun média</p>
          <p className="text-sm">Ajoutez votre premier média via le bouton ci-dessus</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {media.map((item) => (
            <div key={item.id} className="group bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(item.type)}
                  <p className="font-semibold text-white">{item.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMediaItem(item.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {item.thumbnail && (
                <div className="mt-2 rounded overflow-hidden aspect-video bg-muted">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
                <span>{getTypeLabel(item.type)}</span>
                {item.duration && <span>· {item.duration}</span>}
                {item.isFeatured && (
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                    ★ Mis en avant
                  </span>
                )}
              </div>
              {item.event && (
                <p className="mt-1 text-xs text-white/30">
                  {item.event.firstName} {item.event.lastName}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un média</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onChange={(e) => {
                  // Changer de type réinitialise le fichier déjà sélectionné
                  // (l'extension acceptée change selon le type)
                  setForm({ ...form, type: e.target.value as any });
                  removeFile();
                }}
              >
                <option value="video">Vidéo</option>
                <option value="photo">Photo</option>
                <option value="audio">Audio</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fichier *</Label>
              <div
                className={`relative rounded-lg overflow-hidden border-2 border-dashed transition-all ${
                  isDragging ? 'border-primary bg-primary/10' : 'border-border'
                } ${previewUrl ? '' : 'aspect-video'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {previewUrl ? (
                  <div className="relative">
                    {form.type === "photo" && (
                      <img src={previewUrl} alt="Aperçu" className="w-full aspect-video object-cover" />
                    )}
                    {form.type === "video" && (
                      <video src={previewUrl} controls className="w-full aspect-video object-cover" />
                    )}
                    {form.type === "audio" && (
                      <div className="p-6">
                        <audio src={previewUrl} controls className="w-full" />
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <p className="text-white text-sm">Upload en cours...</p>
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeFile}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Upload className="size-12 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Cliquez ou glissez un fichier
                    </p>
                    <p className="text-xs text-muted-foreground/50">
                      {HINT_BY_TYPE[form.type]}
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
                  accept={ACCEPT_BY_TYPE[form.type]}
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading || !!previewUrl}
                  style={{ pointerEvents: previewUrl ? 'none' : 'auto' }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titre du média"
              />
            </div>

            <div className="space-y-2">
              <Label>Vignette (URL)</Label>
              <Input
                value={form.thumbnail}
                onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                placeholder="https://example.com/thumbnail.jpg"
              />
              <p className="text-xs text-white/30">Optionnel - Image d'aperçu</p>
            </div>

            <div className="space-y-2">
              <Label>Durée</Label>
              <Input
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="2:30"
              />
              <p className="text-xs text-white/30">Optionnel</p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description du média"
              />
            </div>

            <div className="space-y-2">
              <Label>Événement associé</Label>
              <Select
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              >
                <option value="">Aucun événement</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} - {e.type}
                  </option>
                ))}
              </Select>
              {events.length === 0 && (
                <p className="text-xs text-white/30">
                  Aucune demande d'événement n'a encore été soumise sur le site.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label>Mis en avant</Label>
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(checked) => setForm({ ...form, isFeatured: checked })}
              />
            </div>

            <Button
              variant="brand"
              className="w-full"
              onClick={handleSubmit}
              disabled={!form.title || !uploadedUrl || uploading}
            >
              {uploading ? 'Upload en cours...' : 'Ajouter le média'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
