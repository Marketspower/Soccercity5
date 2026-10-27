// components/admin/AdminGallery.tsx
// Galerie photo de l'admin :
//  • ajout de plusieurs photos à la fois (clic ou glisser-déposer), compressées
//    automatiquement (1920 px, WebP) avant l'envoi, 3 envois en parallèle ;
//  • sélection multiple : supprimer ou déplacer vers un autre événement ;
//  • glisser-déposer (ou flèches) pour choisir l'ordre de défilement sur le site.
"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { MEDIA_EVENT_TYPES, type GalleryImage, type MediaEventType } from "@/lib/types";
import {
  compressImage,
  deleteGalleryMany,
  IMAGE_TYPES,
  insertGalleryRow,
  MAX_IMAGE_BUCKET,
  MAX_PHOTO_INPUT,
  moveMany,
  moveWithin,
  nextSortOrder,
  reorderWithin,
  runWithLimit,
  saveOrder,
  uploadWithProgress,
} from "@/lib/media-tools";
import { BulkBar, DropZone, QueueList, queueKey, useQueue, useSelection, type QueueItem } from "./bulk-tools";

/**
 * @param fixedEventType  si fourni, la galerie ne montre et n'ajoute que les
 *                        photos de ce type d'événement (page admin par type).
 */
export function AdminGallery({ fixedEventType }: { fixedEventType?: MediaEventType } = {}) {
  const { gallery, deleteGalleryImage, syncGallery } = useAppStore();
  const [open, setOpen] = useState(false);
  const [alt, setAlt] = useState("");
  const [eventType, setEventType] = useState<string>(fixedEventType ?? "");
  const [filter, setFilter] = useState<string>(fixedEventType ?? "all");
  const [running, setRunning] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const queue = useQueue();

  useEffect(() => {
    syncGallery();
  }, [syncGallery]);

  const shown = useMemo(() => {
    if (filter === "all") return gallery;
    if (filter === "none") return gallery.filter((g) => !g.eventType);
    return gallery.filter((g) => g.eventType === filter);
  }, [gallery, filter]);
  const shownIds = useMemo(() => shown.map((g) => g.id), [shown]);
  const sel = useSelection(shownIds);

  // ---------- Ajout en lot ----------
  const addFiles = (files: File[]) => {
    setMessage(null);
    const items: QueueItem[] = files.map((file) => {
      const okType = IMAGE_TYPES.includes(file.type);
      const tooBig = file.size > MAX_PHOTO_INPUT;
      return {
        key: queueKey(),
        file,
        kind: "photo",
        preview: okType ? URL.createObjectURL(file) : null,
        status: okType && !tooBig ? "attente" : "erreur",
        progress: 0,
        error: !okType ? "Format non accepté (JPG, PNG ou WEBP)" : tooBig ? "Photo trop lourde (30 Mo max.)" : undefined,
        title: file.name,
      };
    });
    queue.setItems((list) => [...list, ...items]);
  };

  const startUpload = async () => {
    const todo = queue.items.filter((i) => i.status === "attente" || i.status === "erreur");
    const valid = todo.filter((i) => IMAGE_TYPES.includes(i.file.type) && i.file.size <= MAX_PHOTO_INPUT);
    if (!valid.length) return;
    setRunning(true);
    const type = (fixedEventType ?? eventType) || null;
    const altText = alt.trim() || (type ? `${type} chez Soccer City` : "Soccer City");
    let order = nextSortOrder(useAppStore.getState().gallery);
    let ok = 0;

    await runWithLimit(valid, 3, async (item) => {
      queue.patch(item.key, { status: "preparation", progress: 0, error: undefined });
      try {
        const file = await compressImage(item.file);
        if (file.size > MAX_IMAGE_BUCKET) throw new Error("Photo encore trop lourde après compression (5 Mo max.)");
        queue.patch(item.key, { status: "envoi", sizeAfter: file.size });
        const url = await uploadWithProgress("images", "gallery", file, (p) => queue.patch(item.key, { progress: p }));
        await insertGalleryRow({ imageUrl: url, alt: altText, eventType: type, sortOrder: order++ });
        queue.patch(item.key, { status: "ok", progress: 1 });
        ok++;
      } catch (e: any) {
        queue.patch(item.key, { status: "erreur", error: e?.message || "Envoi impossible" });
      }
    });

    await syncGallery();
    setRunning(false);
    const failed = valid.length - ok;
    setMessage({
      ok: failed === 0,
      text: failed === 0 ? `${ok} photo(s) ajoutée(s).` : `${ok} photo(s) ajoutée(s), ${failed} en erreur (voir la liste).`,
    });
    if (failed === 0) {
      setTimeout(() => { setOpen(false); queue.clear(); setAlt(""); }, 900);
    }
  };

  // ---------- Actions groupées ----------
  const bulk = async (fn: () => Promise<void>, done: string) => {
    setBulkBusy(true);
    setMessage(null);
    try {
      await fn();
      sel.none();
      setMessage({ ok: true, text: done });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Action impossible." });
    } finally {
      await syncGallery();
      setBulkBusy(false);
    }
  };

  // ---------- Ordre ----------
  const applyOrder = async (next: GalleryImage[]) => {
    const before = useAppStore.getState().gallery;
    useAppStore.setState({ gallery: next }); // affichage immédiat
    try {
      await saveOrder("gallery", next);
      await syncGallery();
    } catch (e: any) {
      useAppStore.setState({ gallery: before });
      setMessage({ ok: false, text: e?.message || "Ordre non enregistré." });
    }
  };

  const pending = queue.items.filter(
    (i) => (i.status === "attente" || i.status === "erreur") && IMAGE_TYPES.includes(i.file.type) && i.file.size <= MAX_PHOTO_INPUT
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {fixedEventType ? `Photos — ${fixedEventType}` : "Galerie"}
          </h2>
          <p className="text-sm text-white/50">
            {shown.length} photo(s) · glissez les vignettes pour choisir l&apos;ordre de défilement
            {fixedEventType ? ` sur la page « ${fixedEventType} »` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!fixedEventType && (
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
              <option value="all">Toutes les photos</option>
              <option value="none">Galerie générale</option>
              {MEDIA_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          )}
          {shown.length > 0 && (
            <Button variant="outline" onClick={() => (sel.selected.size ? sel.none() : sel.all())}>
              <Check className="size-4" /> {sel.selected.size ? "Désélectionner" : "Sélectionner tout"}
            </Button>
          )}
          <Button variant="brand" onClick={() => { setMessage(null); setOpen(true); }}>
            <Plus className="size-4" /> Ajouter des photos
          </Button>
        </div>
      </div>

      {message && !open && (
        <p className={`rounded-md px-4 py-2 text-sm ${message.ok ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
          {message.text}
        </p>
      )}

      <BulkBar
        count={sel.selected.size}
        total={shown.length}
        busy={bulkBusy}
        onAll={sel.all}
        onNone={sel.none}
        generalLabel="Galerie générale (accueil)"
        onMove={(t) =>
          bulk(() => moveMany("gallery", sel.ids, t), `${sel.selected.size} photo(s) déplacée(s) vers « ${t ?? "Galerie générale"} ».`)
        }
        onDelete={() => {
          if (!window.confirm(`Supprimer définitivement ${sel.selected.size} photo(s) ?`)) return;
          bulk(() => deleteGalleryMany(sel.ids), `${sel.selected.size} photo(s) supprimée(s).`);
        }}
      />

      {shown.length === 0 ? (
        <DropZone
          accept={IMAGE_TYPES.join(",")}
          hint="JPG, PNG, WEBP — plusieurs à la fois, compressées automatiquement"
          onFiles={(files) => { addFiles(files); setOpen(true); }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((img, i) => {
            const checked = sel.selected.has(img.id);
            return (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => { setDragId(img.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverId(img.id); } }}
                onDragLeave={() => setOverId((o) => (o === img.id ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== img.id) applyOrder(reorderWithin(gallery, shownIds, dragId, img.id));
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                className={`group relative aspect-square overflow-hidden rounded-lg bg-muted ring-offset-2 ring-offset-background transition ${
                  checked ? "ring-2 ring-primary" : ""
                } ${overId === img.id && dragId !== img.id ? "ring-2 ring-sky-400" : ""} ${dragId === img.id ? "opacity-40" : ""}`}
              >
                <img src={img.imageUrl} alt={img.alt} className="h-full w-full cursor-grab object-cover" loading="lazy" draggable={false} />

                {/* Case à cocher */}
                <button
                  type="button"
                  onClick={() => sel.toggle(img.id)}
                  aria-pressed={checked}
                  aria-label={checked ? "Désélectionner" : "Sélectionner"}
                  className={`absolute left-2 top-2 flex size-7 items-center justify-center rounded-md border-2 transition ${
                    checked ? "border-primary bg-primary text-white" : "border-white/80 bg-black/40 text-transparent hover:text-white/70"
                  }`}
                >
                  <Check className="size-4" />
                </button>

                <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                  <GripVertical className="size-3" /> {i + 1}
                </span>

                {/* Actions au survol */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/85 to-transparent p-2 pt-8 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                  {!fixedEventType && (
                    <Select
                      value={img.eventType ?? ""}
                      onChange={async (e) => {
                        await moveMany("gallery", [img.id], e.target.value || null);
                        syncGallery();
                      }}
                      className="h-8 text-xs"
                      aria-label="Afficher sur"
                    >
                      <option value="">Galerie générale</option>
                      {MEDIA_EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Select>
                  )}
                  <div className="flex items-center gap-1">
                    <Button variant="glass" size="icon" className="size-8" disabled={i === 0}
                      onClick={() => applyOrder(moveWithin(gallery, shownIds, img.id, -1))} aria-label="Avancer">
                      <ArrowLeft className="size-4" />
                    </Button>
                    <Button variant="glass" size="icon" className="size-8" disabled={i === shown.length - 1}
                      onClick={() => applyOrder(moveWithin(gallery, shownIds, img.id, 1))} aria-label="Reculer">
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="ml-auto size-8"
                      aria-label="Supprimer"
                      onClick={() => { if (window.confirm("Supprimer cette photo ?")) deleteGalleryImage(img.id); }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {img.eventType && !fixedEventType && (
                  <div className="absolute left-11 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">{img.eventType}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (running) return;
          setOpen(o);
          if (!o) { queue.clear(); setMessage(null); }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter des photos{fixedEventType ? ` — ${fixedEventType}` : ""}</DialogTitle>
          </DialogHeader>

          <DropZone
            accept={IMAGE_TYPES.join(",")}
            hint="JPG, PNG, WEBP · sélectionnez-en autant que vous voulez · réduites automatiquement à 1920 px"
            disabled={running}
            compact={queue.items.length > 0}
            onFiles={addFiles}
          />

          <QueueList items={queue.items} busy={running} onRemove={queue.remove} />

          {!fixedEventType && (
            <div className="space-y-2">
              <Label>Afficher ces photos sur</Label>
              <Select value={eventType} onChange={(e) => setEventType(e.target.value)} disabled={running}>
                <option value="">Galerie générale (page d&apos;accueil)</option>
                {MEDIA_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>La page « {t} »</option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description commune (référencement, facultatif)</Label>
            <Input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              disabled={running}
              placeholder={`Par défaut : « ${(fixedEventType ?? eventType) || "Soccer City"}${(fixedEventType ?? eventType) ? " chez Soccer City" : ""} »`}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.ok ? "text-green-500" : "text-destructive"}`}>{message.text}</p>
          )}

          <Button variant="brand" className="w-full" onClick={startUpload} disabled={running || pending === 0}>
            {running ? "Envoi en cours…" : pending ? `Envoyer ${pending} photo(s)` : "Choisissez des photos"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
