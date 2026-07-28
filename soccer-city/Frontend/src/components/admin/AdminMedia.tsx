// components/admin/AdminMedia.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Play, Video, Music, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";

export function AdminMedia() {
  const { media, events, addMediaItem, deleteMediaItem, syncMedia } = useAppStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    url: "",
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

  const handleSubmit = async () => {
    if (!form.title || !form.url) {
      alert('Le titre et l\'URL sont requis');
      return;
    }
    await addMediaItem({
      title: form.title,
      url: form.url,
      type: form.type,
      thumbnail: form.thumbnail || null,
      duration: form.duration || null,
      description: form.description || null,
      isFeatured: form.isFeatured,
      eventId: form.eventId || null,
    });
    setOpen(false);
    setForm({ title: "", url: "", type: "video", thumbnail: "", duration: "", description: "", isFeatured: false, eventId: "" });
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un média</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Titre du média"
              />
            </div>

            <div className="space-y-2">
              <Label>URL *</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com/video.mp4"
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              >
                <option value="video">Vidéo</option>
                <option value="photo">Photo</option>
                <option value="audio">Audio</option>
              </Select>
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
              disabled={!form.title || !form.url}
            >
              Ajouter le média
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}