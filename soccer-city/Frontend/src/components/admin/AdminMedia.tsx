// components/admin/AdminMedia.tsx
// Vidéos et médias de l'admin :
//  • plusieurs liens YouTube/Vimeo d'un coup (un par ligne) — titre et vignette
//    récupérés automatiquement ;
//  • plusieurs fichiers à la fois (vidéos, photos, audio) avec progression ;
//    vignette des vidéos capturée automatiquement, photos compressées ;
//  • sélection multiple, déplacement vers un autre événement, ordre par
//    glisser-déposer (ordre de défilement sur le site).
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Check, GripVertical, ImageIcon, Link2, Music, Plus, Star, Trash2, Upload, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { parseVideoUrl } from "@/lib/video";
import { MEDIA_EVENT_TYPES, type MediaEventType, type MediaItem } from "@/lib/types";
import {
  AUDIO_TYPES,
  captureVideoPoster,
  compressImage,
  deleteMediaMany,
  fetchVideoMeta,
  IMAGE_TYPES,
  insertMediaRow,
  MAX_MEDIA_BUCKET,
  MAX_PHOTO_INPUT,
  moveMany,
  moveWithin,
  nextSortOrder,
  parseVideoLinks,
  readDuration,
  reorderWithin,
  runWithLimit,
  saveOrder,
  titleFromFileName,
  uploadWithProgress,
  VIDEO_TYPES,
} from "@/lib/media-tools";
import { BulkBar, DropZone, QueueList, queueKey, useQueue, useSelection, type QueueItem } from "./bulk-tools";

const FILE_ACCEPT = [...VIDEO_TYPES, ...IMAGE_TYPES, ...AUDIO_TYPES].join(",");

const kindOf = (f: File): QueueItem["kind"] | null =>
  VIDEO_TYPES.includes(f.type) ? "video" : IMAGE_TYPES.includes(f.type) ? "photo" : AUDIO_TYPES.includes(f.type) ? "audio" : null;

const checkFile = (f: File): string | undefined => {
  const k = kindOf(f);
  if (!k) return "Format non accepté";
  if (k === "photo" && f.size > MAX_PHOTO_INPUT) return "Photo trop lourde (30 Mo max.)";
  if (k !== "photo" && f.size > MAX_MEDIA_BUCKET) return "Plus de 50 Mo : publiez-la sur YouTube et collez le lien";
  return undefined;
};

/**
 * @param fixedEventType  si fourni, n'affiche/ajoute que les médias de ce type.
 */
export function AdminMedia({ fixedEventType }: { fixedEventType?: MediaEventType } = {}) {
  const { media, updateMediaItem, deleteMediaItem, syncMedia } = useAppStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"links" | "files">("links");
  const [linksText, setLinksText] = useState("");
  const [eventType, setEventType] = useState<string>(fixedEventType ?? "");
  const [filter, setFilter] = useState<string>(fixedEventType ?? "all");
  const [running, setRunning] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const queue = useQueue();

  useEffect(() => {
    syncMedia();
  }, [syncMedia]);

  const shown = useMemo(() => {
    if (filter === "all") return media;
    if (filter === "none") return media.filter((m) => !m.eventType);
    return media.filter((m) => m.eventType === filter);
  }, [media, filter]);
  const shownIds = useMemo(() => shown.map((m) => m.id), [shown]);
  const sel = useSelection(shownIds);

  const links = useMemo(() => parseVideoLinks(linksText), [linksText]);
  const type = (fixedEventType ?? eventType) || null;
  const label = type ?? "Soccer City";

  const finish = async (ok: number, failed: number, what: string) => {
    await syncMedia();
    setRunning(false);
    setMessage({
      ok: failed === 0,
      text: failed === 0 ? `${ok} ${what} ajouté(s).` : `${ok} ${what} ajouté(s), ${failed} en erreur.`,
    });
    if (failed === 0 && ok > 0) setTimeout(() => closeDialog(), 900);
  };

  const closeDialog = () => {
    setOpen(false);
    queue.clear();
    setLinksText("");
  };

  // ---------- Liens YouTube / Vimeo ----------
  const addLinks = async () => {
    if (!links.valid.length) return;
    setRunning(true);
    setMessage(null);
    let order = nextSortOrder(useAppStore.getState().media);
    let ok = 0;
    const errors: string[] = [];
    await runWithLimit(links.valid, 3, async (link) => {
      const position = order++;
      try {
        const meta = await fetchVideoMeta(link);
        await insertMediaRow({
          title: (meta.title || "").slice(0, 200) || `${label} — vidéo`,
          url: link.url,
          type: "video",
          thumbnail: link.thumbnail || meta.thumbnail || null,
          duration: null,
          eventType: type,
          sortOrder: position,
        });
        ok++;
      } catch (e: any) {
        errors.push(`${link.url} : ${e?.message || "erreur"}`);
      }
    });
    if (errors.length) setLinksText(errors.map((x) => x.split(" : ")[0]).join("\n"));
    await finish(ok, errors.length, "vidéo(s)");
  };

  // ---------- Fichiers ----------
  const addFiles = (files: File[]) => {
    setMessage(null);
    const items: QueueItem[] = files.map((file) => {
      const kind = kindOf(file) ?? "video";
      const err = checkFile(file);
      return {
        key: queueKey(),
        file,
        kind,
        preview: kind === "photo" && !err ? URL.createObjectURL(file) : null,
        status: err ? "erreur" : "attente",
        progress: 0,
        error: err,
        title: titleFromFileName(file.name),
      };
    });
    queue.setItems((list) => [...list, ...items]);
    // Vignette des vidéos dans la liste
    items
      .filter((i) => i.kind === "video" && i.status === "attente")
      .forEach(async (i) => {
        const poster = await captureVideoPoster(i.file, 240);
        if (poster) queue.patch(i.key, { preview: URL.createObjectURL(poster) });
      });
  };

  const uploadFiles = async () => {
    const todo = queue.items.filter((i) => (i.status === "attente" || i.status === "erreur") && !checkFile(i.file));
    if (!todo.length) return;
    setRunning(true);
    setMessage(null);
    let order = nextSortOrder(useAppStore.getState().media);
    let ok = 0;
    let n = 0;

    await runWithLimit(todo, 3, async (item) => {
      const position = order++;
      const num = ++n;
      queue.patch(item.key, { status: "preparation", progress: 0, error: undefined });
      try {
        let file = item.file;
        let thumbnail: string | null = null;
        let duration: string | null = null;
        if (item.kind === "photo") {
          file = await compressImage(item.file);
          queue.patch(item.key, { sizeAfter: file.size });
        } else {
          duration = await readDuration(item.file);
          if (item.kind === "video") {
            const poster = await captureVideoPoster(item.file);
            if (poster) thumbnail = await uploadWithProgress("media", "vignettes", poster);
          }
        }
        queue.patch(item.key, { status: "envoi" });
        const url = await uploadWithProgress("media", `${item.kind}s`, file, (p) => queue.patch(item.key, { progress: p }));
        const word = item.kind === "video" ? "vidéo" : item.kind === "photo" ? "photo" : "audio";
        await insertMediaRow({
          title: item.title.trim() || `${label} — ${word} ${num}`,
          url,
          type: item.kind,
          thumbnail,
          duration,
          eventType: type,
          sortOrder: position,
        });
        queue.patch(item.key, { status: "ok", progress: 1 });
        ok++;
      } catch (e: any) {
        queue.patch(item.key, { status: "erreur", error: e?.message || "Envoi impossible" });
      }
    });
    await finish(ok, todo.length - ok, "média(s)");
  };

  // ---------- Actions groupées / ordre ----------
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
      await syncMedia();
      setBulkBusy(false);
    }
  };

  const applyOrder = async (next: MediaItem[]) => {
    const before = useAppStore.getState().media;
    useAppStore.setState({ media: next });
    try {
      await saveOrder("media", next);
      await syncMedia();
    } catch (e: any) {
      useAppStore.setState({ media: before });
      setMessage({
        ok: false,
        text: /sort_order/.test(e?.message || "")
          ? "Exécutez d'abord la migration SQL 20261027_media_ordre.sql pour pouvoir ordonner les vidéos."
          : e?.message || "Ordre non enregistré.",
      });
    }
  };

  const saveTitle = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    setEditing(null);
    if (title) await updateMediaItem(editing.id, { title });
  };

  const icon = (item: MediaItem) =>
    item.type === "video" ? <Video className="size-4" /> : item.type === "audio" ? <Music className="size-4" /> : <ImageIcon className="size-4" />;

  const typeLabel = (item: MediaItem) => {
    const v = parseVideoUrl(item.url);
    if (v?.kind === "youtube") return "YouTube";
    if (v?.kind === "vimeo") return "Vimeo";
    return item.type === "video" ? "Vidéo" : item.type === "audio" ? "Audio" : "Photo";
  };

  const pendingFiles = queue.items.filter((i) => (i.status === "attente" || i.status === "erreur") && !checkFile(i.file)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {fixedEventType ? `Vidéos et médias — ${fixedEventType}` : "Médias"}
          </h2>
          <p className="text-sm text-white/50">
            {shown.length} média(s) · liens YouTube/Vimeo ou fichiers · glissez pour choisir l&apos;ordre
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!fixedEventType && (
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48">
              <option value="all">Tous les médias</option>
              <option value="none">Généraux</option>
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
            <Plus className="size-4" /> Ajouter des vidéos / médias
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
        generalLabel="Général (accueil)"
        onMove={(t) => bulk(() => moveMany("media", sel.ids, t), `${sel.selected.size} média(s) déplacé(s) vers « ${t ?? "Général"} ».`)}
        onDelete={() => {
          if (!window.confirm(`Supprimer définitivement ${sel.selected.size} média(s) ?`)) return;
          bulk(() => deleteMediaMany(sel.ids), `${sel.selected.size} média(s) supprimé(s).`);
        }}
      />

      {shown.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed py-12 text-center text-white/40">
          <p>Aucun média ici pour l&apos;instant</p>
          <p className="text-sm">Ajoutez des liens YouTube ou des fichiers via le bouton ci-dessus</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item, i) => {
            const checked = sel.selected.has(item.id);
            const v = parseVideoUrl(item.url);
            const thumb = item.thumbnail || (v?.kind === "youtube" ? v.thumbnail : null) || (item.type === "photo" ? item.url : null);
            return (
              <div
                key={item.id}
                draggable={editing?.id !== item.id}
                onDragStart={(e) => { setDragId(item.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverId(item.id); } }}
                onDragLeave={() => setOverId((o) => (o === item.id ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== item.id) applyOrder(reorderWithin(media, shownIds, dragId, item.id));
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                className={`rounded-lg border bg-white/5 p-3 transition ${checked ? "border-primary ring-1 ring-primary" : "border-white/10"} ${
                  overId === item.id && dragId !== item.id ? "ring-2 ring-sky-400" : ""
                } ${dragId === item.id ? "opacity-40" : ""}`}
              >
                <div className="relative aspect-video cursor-grab overflow-hidden rounded bg-muted">
                  {thumb ? (
                    <img src={thumb} alt={item.title} className="h-full w-full object-cover" loading="lazy" draggable={false} />
                  ) : item.type === "video" ? (
                    <video src={`${item.url}#t=1`} preload="metadata" muted className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">{icon(item)}</div>
                  )}
                  <button
                    type="button"
                    onClick={() => sel.toggle(item.id)}
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
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {icon(item)}
                  {editing?.id === item.id ? (
                    <input
                      autoFocus
                      value={editing.title}
                      onChange={(e) => setEditing({ id: item.id, title: e.target.value })}
                      onBlur={saveTitle}
                      onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditing(null); }}
                      className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-sm"
                    />
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left font-semibold text-white hover:underline"
                      title="Cliquer pour modifier le titre"
                      onClick={() => setEditing({ id: item.id, title: item.title })}
                    >
                      {item.title}
                    </button>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                  <span>{typeLabel(item)}</span>
                  {item.duration && <span>· {item.duration}</span>}
                  {item.eventType && !fixedEventType && <span>· {item.eventType}</span>}
                </div>

                {!fixedEventType && (
                  <Select
                    value={item.eventType ?? ""}
                    onChange={async (e) => { await moveMany("media", [item.id], e.target.value || null); syncMedia(); }}
                    className="mt-2 h-8 text-xs"
                    aria-label="Afficher sur"
                  >
                    <option value="">Général (accueil)</option>
                    {MEDIA_EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                )}

                <div className="mt-2 flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8" disabled={i === 0}
                    onClick={() => applyOrder(moveWithin(media, shownIds, item.id, -1))} aria-label="Avancer">
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8" disabled={i === shown.length - 1}
                    onClick={() => applyOrder(moveWithin(media, shownIds, item.id, 1))} aria-label="Reculer">
                    <ArrowRight className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={item.isFeatured ? "text-yellow-400" : "text-white/50"}
                    onClick={() => updateMediaItem(item.id, { isFeatured: !item.isFeatured })}
                    title="Mettre en avant sur l'accueil"
                  >
                    <Star className={`size-4 ${item.isFeatured ? "fill-current" : ""}`} /> {item.isFeatured ? "En avant" : "Mettre en avant"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-8 text-red-400 hover:text-red-300"
                    aria-label="Supprimer"
                    onClick={() => { if (window.confirm("Supprimer ce média ?")) deleteMediaItem(item.id); }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (running) return; if (o) setOpen(true); else { closeDialog(); setMessage(null); } }}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter des vidéos / médias{fixedEventType ? ` — ${fixedEventType}` : ""}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={tab === "links" ? "brand" : "outline"} onClick={() => setTab("links")} disabled={running}>
              <Link2 className="size-4" /> Liens YouTube / Vimeo
            </Button>
            <Button type="button" variant={tab === "files" ? "brand" : "outline"} onClick={() => setTab("files")} disabled={running}>
              <Upload className="size-4" /> Fichiers
            </Button>
          </div>

          {!fixedEventType && (
            <div className="space-y-2">
              <Label>Afficher sur</Label>
              <Select value={eventType} onChange={(e) => setEventType(e.target.value)} disabled={running}>
                <option value="">Général (page d&apos;accueil)</option>
                {MEDIA_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>La page « {t} »</option>
                ))}
              </Select>
            </div>
          )}

          {tab === "links" ? (
            <div className="space-y-3">
              <Label>Collez un ou plusieurs liens (un par ligne)</Label>
              <Textarea
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                disabled={running}
                rows={5}
                placeholder={"https://www.youtube.com/watch?v=…\nhttps://youtu.be/…\nhttps://vimeo.com/…"}
              />
              {links.valid.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {links.valid.map((l) => (
                    <div key={l.url} className="relative aspect-video overflow-hidden rounded bg-muted">
                      {l.thumbnail ? (
                        <img src={l.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">Vimeo</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {links.invalid.length > 0 && (
                <p className="text-xs text-destructive">
                  Non reconnu(s), ignoré(s) : {links.invalid.slice(0, 3).join(", ")}{links.invalid.length > 3 ? "…" : ""}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Le titre et la vignette sont récupérés automatiquement ; vous pourrez modifier le titre ensuite.</p>
              {message && <p className={`text-sm ${message.ok ? "text-green-500" : "text-destructive"}`}>{message.text}</p>}
              <Button variant="brand" className="w-full" onClick={addLinks} disabled={running || links.valid.length === 0}>
                {running ? "Ajout en cours…" : links.valid.length ? `Ajouter ${links.valid.length} vidéo(s)` : "Collez au moins un lien"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <DropZone
                accept={FILE_ACCEPT}
                hint="Vidéos MP4/MOV/WEBM (50 Mo max. chacune) · photos · audio — plusieurs à la fois"
                disabled={running}
                compact={queue.items.length > 0}
                onFiles={addFiles}
              />
              <QueueList
                items={queue.items}
                busy={running}
                onRemove={queue.remove}
                onTitle={(key, title) => queue.patch(key, { title })}
              />
              <p className="text-xs text-muted-foreground">
                Astuce : pour les longues vidéos, publiez-les sur YouTube (en « non répertoriée ») et collez le lien — le site reste rapide et le stockage n&apos;est pas consommé.
              </p>
              {message && <p className={`text-sm ${message.ok ? "text-green-500" : "text-destructive"}`}>{message.text}</p>}
              <Button variant="brand" className="w-full" onClick={uploadFiles} disabled={running || pendingFiles === 0}>
                {running ? "Envoi en cours…" : pendingFiles ? `Envoyer ${pendingFiles} fichier(s)` : "Choisissez des fichiers"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
