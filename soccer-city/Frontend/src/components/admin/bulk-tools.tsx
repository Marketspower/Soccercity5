// components/admin/bulk-tools.tsx
// Éléments partagés par la Galerie et les Médias de l'admin :
// file d'envoi (vignettes + progression), sélection multiple, barre d'actions.
"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Film, Loader2, Music, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { MEDIA_EVENT_TYPES } from "@/lib/types";
import { formatSize } from "@/lib/media-tools";

export type QueueStatus = "attente" | "preparation" | "envoi" | "ok" | "erreur";

export interface QueueItem {
  key: string;
  file: File;
  kind: "photo" | "video" | "audio";
  preview: string | null;
  status: QueueStatus;
  progress: number;
  error?: string;
  sizeAfter?: number;
  title: string;
}

let counter = 0;
export const queueKey = () => `q${Date.now().toString(36)}${(counter++).toString(36)}`;

/** File d'envoi : ajout, mise à jour d'un élément, nettoyage des aperçus. */
export function useQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);

  const patch = useCallback((key: string, p: Partial<QueueItem>) => {
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...p } : it)));
  }, []);

  const remove = useCallback((key: string) => {
    setItems((list) => {
      const it = list.find((x) => x.key === key);
      if (it?.preview) URL.revokeObjectURL(it.preview);
      return list.filter((x) => x.key !== key);
    });
  }, []);

  const clear = useCallback(() => {
    setItems((list) => {
      list.forEach((it) => it.preview && URL.revokeObjectURL(it.preview));
      return [];
    });
  }, []);

  useEffect(() => () => clear(), [clear]);

  return { items, setItems, patch, remove, clear };
}

const STATUS_LABEL: Record<QueueStatus, string> = {
  attente: "En attente",
  preparation: "Préparation…",
  envoi: "Envoi…",
  ok: "Ajouté",
  erreur: "Erreur",
};

export function QueueList({
  items,
  busy,
  onRemove,
  onTitle,
}: {
  items: QueueItem[];
  busy: boolean;
  onRemove: (key: string) => void;
  onTitle?: (key: string, title: string) => void;
}) {
  if (items.length === 0) return null;
  const done = items.filter((i) => i.status === "ok").length;
  const failed = items.filter((i) => i.status === "erreur").length;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {items.length} fichier(s){done ? ` · ${done} ajouté(s)` : ""}{failed ? ` · ${failed} en erreur` : ""}
      </p>
      <ul className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
        {items.map((it) => (
          <li key={it.key} className="flex items-center gap-3 rounded-md border bg-muted/30 p-2">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
              {it.preview ? (
                <img src={it.preview} alt="" className="h-full w-full object-cover" />
              ) : it.kind === "audio" ? (
                <Music className="size-5 text-muted-foreground" />
              ) : (
                <Film className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              {onTitle && it.kind !== "photo" && it.status !== "ok" ? (
                <input
                  value={it.title}
                  onChange={(e) => onTitle(it.key, e.target.value)}
                  disabled={busy}
                  placeholder="Titre (facultatif)"
                  className="w-full rounded border bg-background px-2 py-1 text-xs"
                />
              ) : (
                <p className="truncate text-xs font-medium">{it.title || it.file.name}</p>
              )}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {it.status === "ok" && <CheckCircle2 className="size-3.5 text-green-500" />}
                {it.status === "erreur" && <AlertCircle className="size-3.5 text-destructive" />}
                {(it.status === "preparation" || it.status === "envoi") && <Loader2 className="size-3.5 animate-spin" />}
                <span className={it.status === "erreur" ? "text-destructive" : ""}>
                  {it.status === "erreur" ? it.error || STATUS_LABEL.erreur : STATUS_LABEL[it.status]}
                </span>
                <span className="ml-auto tabular-nums">
                  {formatSize(it.file.size)}
                  {it.sizeAfter && it.sizeAfter < it.file.size ? ` → ${formatSize(it.sizeAfter)}` : ""}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded bg-muted">
                <div
                  className={`h-full transition-all ${it.status === "erreur" ? "bg-destructive" : it.status === "ok" ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${Math.round((it.status === "ok" ? 1 : it.progress) * 100)}%` }}
                />
              </div>
            </div>
            {(!busy || it.status === "ok" || it.status === "erreur") && (
              <button
                type="button"
                onClick={() => onRemove(it.key)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Retirer de la liste"
              >
                <X className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sélection multiple d'éléments (par id). */
export function useSelection(visibleIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Retire de la sélection les éléments qui ne sont plus visibles (supprimés, filtre)
  const key = visibleIds.join(",");
  useEffect(() => {
    setSelected((s) => {
      const vis = new Set(visibleIds);
      const next = new Set(Array.from(s).filter((id) => vis.has(id)));
      return next.size === s.size ? s : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const all = () => setSelected(new Set(visibleIds));
  const none = () => setSelected(new Set());
  return { selected, toggle, all, none, ids: Array.from(selected) };
}

export function BulkBar({
  count,
  total,
  busy,
  onAll,
  onNone,
  onMove,
  onDelete,
  generalLabel,
}: {
  count: number;
  total: number;
  busy: boolean;
  onAll: () => void;
  onNone: () => void;
  onMove: (eventType: string | null) => void;
  onDelete: () => void;
  generalLabel: string;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-card/95 p-3 shadow-lg backdrop-blur">
      <span className="text-sm font-semibold">{count} sélectionné(s)</span>
      {count < total ? (
        <Button variant="ghost" size="sm" onClick={onAll} disabled={busy}>Tout sélectionner ({total})</Button>
      ) : null}
      <Button variant="ghost" size="sm" onClick={onNone} disabled={busy}>Annuler</Button>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Select
          value=""
          disabled={busy}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onMove(v === "__general__" ? null : v);
          }}
          className="h-9 w-56 text-sm"
          aria-label="Déplacer vers"
        >
          <option value="">Déplacer vers…</option>
          <option value="__general__">{generalLabel}</option>
          {MEDIA_EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Supprimer
        </Button>
      </div>
    </div>
  );
}

/** Zone de dépôt (cliquer ou glisser plusieurs fichiers). */
export function DropZone({
  accept,
  hint,
  disabled,
  onFiles,
  compact,
}: {
  accept: string;
  hint: string;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center transition-colors ${
        compact ? "p-4" : "p-8"
      } ${over ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"} ${disabled ? "pointer-events-none opacity-50" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length) onFiles(files);
      }}
    >
      <span className="text-sm font-medium">Cliquez ou glissez plusieurs fichiers ici</span>
      <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
      <input
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </label>
  );
}
