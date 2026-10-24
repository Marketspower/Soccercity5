// components/admin/AdminMedia.tsx
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, Trash2, Upload, X, Video, Music, ImageIcon, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { parseVideoUrl } from "@/lib/video";
import { MEDIA_EVENT_TYPES, type MediaEventType } from "@/lib/types";

const ACCEPT_BY_TYPE: Record<string, string> = {
  video: "video/mp4,video/webm,video/quicktime",
  audio: "audio/mpeg,audio/wav,audio/ogg",
  photo: "image/jpeg,image/png,image/webp",
};

const HINT_BY_TYPE: Record<string, string> = {
  video: "MP4, WEBM, MOV (max 50 Mo) — pour les longues vidéos, préférez un lien YouTube",
  audio: "MP3, WAV, OGG (max 50 Mo)",
  photo: "JPG, PNG, WEBP (max 50 Mo)",
};

const EMPTY_FORM = {
  title: "",
  type: "video" as "video" | "photo" | "audio",
  source: "link" as "link" | "file",
  link: "",
  thumbnail: "",
  duration: "",
  description: "",
  isFeatured: false,
  eventType: "" as string,
};

/**
 * Médias (vidéos, photos, audio).
 * @param fixedEventType  si fourni, n'affiche/ajoute que les médias de ce type.
 */
export function AdminMedia({ fixedEventType }: { fixedEventType?: MediaEventType } = {}) {
  const { media, addMediaItem, updateMediaItem, deleteMediaItem, syncMedia, uploadImage, uploading } = useAppStore();
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [filter, setFilter] = useState<string>(fixedEventType ?? "all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, eventType: fixedEventType ?? "" });

  useEffect(() => {
    syncMedia();
  }, [syncMedia]);

  const shown = useMemo(() => {
    if (filter === "all") return media;
    if (filter === "none") return media.filter((m) => !m.eventType);
    return media.filter((m) => m.eventType === filter);
  }, [media, filter]);

  const linkInfo = form.source === "link" ? parseVideoUrl(form.link) : null;
  const linkValid = !!linkInfo && linkInfo.kind !== "file";

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, eventType: fixedEventType ?? "" });
    setUploadedUrl("");
    setPreviewUrl("");
    setError("");
  };

  const handleFileSelect = async (file: File) => {
    setError("");
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const url = await uploadImage(file, `${form.type}s`, "media");
      setUploadedUrl(url);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi du fichier");
      setPreviewUrl("");
    }
  };

  const removeFile = () => {
    setUploadedUrl("");
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    setError("");
    const url = form.source === "link" ? form.link.trim() : uploadedUrl;
    if (!form.title.trim()) return setError("Le titre est requis.");
    if (form.source === "link" && !linkValid) return setError("Collez un lien YouTube ou Vimeo valide.");
    if (form.source === "file" && !uploadedUrl) return setError("Envoyez d'abord le fichier.");

    const autoThumb = linkInfo && linkInfo.kind === "youtube" ? linkInfo.thumbnail : null;
    setSaving(true);
    try {
      await addMediaItem({
        title: form.title.trim(),
        url,
        type: form.source === "link" ? "video" : form.type,
        thumbnail: form.thumbnail.trim() || autoThumb,
        duration: form.duration || null,
        description: form.description || null,
        isFeatured: form.isFeatured,
        eventType: (form.eventType || null) as MediaEventType | null,
      });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="size-4" />;
      case "audio": return <Music className="size-4" />;
      default: return <ImageIcon className="size-4" />;
    }
  };

  const getTypeLabel = (type: string, url: string) => {
    const v = parseVideoUrl(url);
    if (v?.kind === "youtube") return "Vidéo YouTube";
    if (v?.kind === "vimeo") return "Vidéo Vimeo";
    switch (type) {
      case "video": return "Vidéo";
      case "audio": return "Audio";
      default: return "Photo";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {fixedEventType ? `Vidéos et médias — ${fixedEventType}` : "Médias"}
          </h2>
          <p className="text-sm text-white/50">{shown.length} média(s) · vidéos (fichier ou YouTube/Vimeo), photos, audio</p>
        </div>
        <div className="flex gap-2">
          {!fixedEventType && (
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
              <option value="all">Tous les médias</option>
              <option value="none">Généraux</option>
              {MEDIA_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          )}
          <Button variant="brand" onClick={() => { resetForm(); setOpen(true); }}>
            <Plus className="size-4" /> Ajouter un média
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <p>Aucun média ici pour l&apos;instant</p>
          <p className="text-sm">Ajoutez votre premier média via le bouton ci-dessus</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((item) => (
            <div key={item.id} className="group bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getIcon(item.type)}
                  <p className="font-semibold text-white">{item.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (window.confirm("Supprimer ce média ?")) deleteMediaItem(item.id); }}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {item.thumbnail && (
                <div className="mt-2 rounded overflow-hidden aspect-video bg-muted">
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
                <span>{getTypeLabel(item.type, item.url)}</span>
                {item.duration && <span>· {item.duration}</span>}
                {item.isFeatured && (
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">★ Mis en avant</span>
                )}
              </div>
              {!fixedEventType && (
                <Select
                  value={item.eventType ?? ""}
                  onChange={(e) => updateMediaItem(item.id, { eventType: (e.target.value || null) as MediaEventType | null })}
                  className="mt-2 h-8 text-xs"
                >
                  <option value="">Général (accueil)</option>
                  {MEDIA_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
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
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={form.source === "link" ? "brand" : "outline"}
                onClick={() => { setForm({ ...form, source: "link", type: "video" }); removeFile(); }}
              >
                <Link2 className="size-4" /> Lien YouTube / Vimeo
              </Button>
              <Button
                type="button"
                variant={form.source === "file" ? "brand" : "outline"}
                onClick={() => setForm({ ...form, source: "file" })}
              >
                <Upload className="size-4" /> Envoyer un fichier
              </Button>
            </div>

            {form.source === "link" ? (
              <div className="space-y-2">
                <Label>Lien de la vidéo *</Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=…"
                />
                {form.link && !linkValid && (
                  <p className="text-xs text-destructive">Lien non reconnu : utilisez un lien YouTube ou Vimeo.</p>
                )}
                {linkInfo && linkInfo.kind !== "file" && (
                  <div className="aspect-video overflow-hidden rounded-lg bg-black">
                    <iframe
                      src={linkInfo.embedUrl}
                      title="Aperçu"
                      className="h-full w-full"
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onChange={(e) => { setForm({ ...form, type: e.target.value as any }); removeFile(); }}
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
                      isDragging ? "border-primary bg-primary/10" : "border-border"
                    } ${previewUrl ? "" : "aspect-video"}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const f = e.dataTransfer.files[0];
                      if (f) handleFileSelect(f);
                    }}
                  >
                    {previewUrl ? (
                      <div className="relative">
                        {form.type === "photo" && <img src={previewUrl} alt="Aperçu" className="w-full aspect-video object-cover" />}
                        {form.type === "video" && <video src={previewUrl} controls className="w-full aspect-video object-cover" />}
                        {form.type === "audio" && (
                          <div className="p-6"><audio src={previewUrl} controls className="w-full" /></div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <p className="text-white text-sm">Envoi en cours…</p>
                          </div>
                        )}
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={removeFile}>
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex w-full flex-col items-center justify-center h-full p-6 text-center"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="size-12 text-muted-foreground/50" />
                        <span className="mt-2 text-sm text-muted-foreground">Cliquez ou glissez un fichier</span>
                        <span className="text-xs text-muted-foreground/50">{HINT_BY_TYPE[form.type]}</span>
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT_BY_TYPE[form.type]}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                      className="hidden"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. : Finale du tournoi d'été" />
            </div>

            {!fixedEventType && (
              <div className="space-y-2">
                <Label>Afficher sur la page de l&apos;événement</Label>
                <Select value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
                  <option value="">Général (page d&apos;accueil)</option>
                  {MEDIA_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Vignette (URL, facultatif)</Label>
              <Input
                value={form.thumbnail}
                onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                placeholder={linkInfo?.kind === "youtube" ? "Automatique pour YouTube" : "https://…/apercu.jpg"}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Durée</Label>
                <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="2:30" />
              </div>
              <div className="flex items-end justify-between gap-2 pb-2">
                <Label>Mis en avant (accueil)</Label>
                <Switch checked={form.isFeatured} onCheckedChange={(checked) => setForm({ ...form, isFeatured: checked })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description du média" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button variant="brand" className="w-full" onClick={handleSubmit} disabled={uploading || saving}>
              {uploading ? "Envoi en cours…" : saving ? "Enregistrement…" : "Ajouter le média"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
