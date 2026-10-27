// lib/media-tools.ts
// Outils pour l'ajout de photos/vidéos en lot dans l'admin :
// compression des photos dans le navigateur, vignette des vidéos,
// envoi avec progression, file d'envoi limitée à 3 fichiers à la fois.
import { supabase } from "./supabase";
import { parseVideoUrl } from "./video";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg"];

/** Taille maximale d'une photo AVANT compression (elle est réduite ensuite). */
export const MAX_PHOTO_INPUT = 30 * 1024 * 1024;
/** Limites du stockage Supabase par compartiment. */
export const MAX_IMAGE_BUCKET = 5 * 1024 * 1024;
export const MAX_MEDIA_BUCKET = 50 * 1024 * 1024;

export const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;

/** Nom de fichier lisible → titre par défaut (« finale-ete_2026.mp4 » → « Finale ete 2026 »). */
export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!base || /^(img|dsc|pxl|vid|mov)\s?\d+/i.test(base) || /^\d+$/.test(base)) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

async function loadBitmap(file: Blob): Promise<{ img: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { img: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* repli sur <img> ci-dessous */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image illisible"));
      el.src = url;
    });
    return { img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/**
 * Réduit une photo à 1920 px maximum (côté le plus long) et la convertit en WebP
 * (JPEG si le navigateur ne sait pas produire du WebP). Une photo de téléphone
 * de 4 à 8 Mo passe ainsi à environ 200–400 Ko, sans perte visible à l'écran.
 */
export async function compressImage(file: File, maxDim = 1920, quality = 0.82): Promise<File> {
  const { img, width, height, close } = await loadBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    let blob = await canvasToBlob(canvas, "image/webp", quality);
    let type = "image/webp";
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
      type = "image/jpeg";
      ext = "jpg";
    }
    if (!blob) return file;
    // Déjà petite et pas redimensionnée : on garde l'original s'il est plus léger
    if (scale === 1 && blob.size >= file.size && IMAGE_TYPES.includes(file.type)) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
    return new File([blob], name, { type });
  } finally {
    close();
  }
}

/** Capture une image de la vidéo (vers 1 s) pour servir de vignette. */
export function captureVideoPoster(file: File, maxDim = 960): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let done = false;
    const finish = (result: File | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), 8000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    };
    video.onseeked = async () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        let blob = await canvasToBlob(canvas, "image/webp", 0.75);
        if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", 0.75);
        if (!blob) return finish(null);
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        finish(new File([blob], `vignette.${ext}`, { type: blob.type }));
      } catch {
        finish(null);
      }
    };
    video.src = url;
  });
}

/** Durée d'une vidéo/audio au format m:ss (ou null). */
export function readDuration(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith("audio") ? "audio" : "video");
    const timer = setTimeout(() => { URL.revokeObjectURL(url); resolve(null); }, 6000);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      const s = Math.round(el.duration);
      resolve(Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : null);
    };
    el.onerror = () => { clearTimeout(timer); URL.revokeObjectURL(url); resolve(null); };
    el.src = url;
  });
}

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Envoie un fichier dans Supabase Storage en indiquant la progression (0 → 1).
 * Retourne l'adresse publique du fichier.
 */
export async function uploadWithProgress(
  bucket: "images" | "media",
  folder: string,
  file: File,
  onProgress?: (ratio: number) => void
): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée : reconnectez-vous.");

  if (!SUPABASE_URL || typeof XMLHttpRequest === "undefined") {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) throw error;
  } else {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", SUPABASE_KEY);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("cache-control", "max-age=31536000");
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        let msg = `Envoi refusé (${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.message) msg = body.message;
        } catch {}
        if (xhr.status === 413 || /exceeded|too large/i.test(msg)) msg = "Fichier trop volumineux pour le stockage.";
        if (xhr.status === 403 || /row-level security/i.test(msg)) msg = "Accès refusé : compte administrateur requis.";
        reject(new Error(msg));
      };
      xhr.onerror = () => reject(new Error("Connexion interrompue pendant l'envoi."));
      xhr.send(file);
    });
  }
  onProgress?.(1);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Exécute des tâches avec au plus `limit` en parallèle ; une erreur n'arrête pas les autres. */
export async function runWithLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        await worker(item);
      } catch {
        /* l'erreur est gérée dans le worker */
      }
    }
  });
  await Promise.all(runners);
}

export interface VideoLink {
  url: string;
  kind: "youtube" | "vimeo";
  title: string;
  thumbnail: string | null;
}

/** Lit plusieurs liens (un par ligne, ou séparés par des espaces) et garde les vidéos reconnues. */
export function parseVideoLinks(text: string): { valid: VideoLink[]; invalid: string[] } {
  const parts = text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  const valid: VideoLink[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const v = parseVideoUrl(p);
    if (!v || v.kind === "file") { invalid.push(p); continue; }
    const key = `${v.kind}:${v.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push({ url: p, kind: v.kind, title: "", thumbnail: v.kind === "youtube" ? v.thumbnail : null });
  }
  return { valid, invalid };
}

/** Titre (et vignette Vimeo) d'une vidéo via oEmbed ; silencieux en cas d'échec. */
export async function fetchVideoMeta(link: VideoLink): Promise<{ title?: string; thumbnail?: string | null }> {
  const endpoint =
    link.kind === "youtube"
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link.url)}`
      : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(link.url)}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(endpoint, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return {};
    const j = await res.json();
    return { title: typeof j.title === "string" ? j.title : undefined, thumbnail: j.thumbnail_url ?? undefined };
  } catch {
    return {};
  }
}

/**
 * Déplace `fromId` à la place de `toId` dans la sous-liste visible, puis
 * reporte ce nouvel ordre dans la liste complète (les éléments masqués par
 * le filtre gardent leur place). Retourne la liste complète réordonnée.
 */
export function reorderWithin<T extends { id: string }>(all: T[], visibleIds: string[], fromId: string, toId: string): T[] {
  if (fromId === toId) return all;
  const visible = visibleIds.slice();
  const from = visible.indexOf(fromId);
  const to = visible.indexOf(toId);
  if (from < 0 || to < 0) return all;
  visible.splice(from, 1);
  visible.splice(to, 0, fromId);
  const byId = new Map(all.map((x) => [x.id, x]));
  const visibleSet = new Set(visibleIds);
  let k = 0;
  return all.map((x) => (visibleSet.has(x.id) ? byId.get(visible[k++])! : x));
}

/** Déplace un élément d'un cran (flèches, utile sur téléphone). */
export function moveWithin<T extends { id: string }>(all: T[], visibleIds: string[], id: string, delta: -1 | 1): T[] {
  const i = visibleIds.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= visibleIds.length) return all;
  return reorderWithin(all, visibleIds, id, visibleIds[j]);
}

/** Enregistre sort_order pour une table (seulement les lignes qui changent). */
export async function saveOrder(
  table: "gallery" | "media",
  ordered: { id: string; sortOrder?: number }[]
): Promise<void> {
  const changes = ordered
    .map((x, index) => ({ id: x.id, index, old: x.sortOrder }))
    .filter((x) => x.old !== x.index);
  const results = await Promise.all(
    changes.map((c) => supabase.from(table).update({ sort_order: c.index }).eq("id", c.id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Prochaine position (à la fin) pour un nouvel élément. */
export const nextSortOrder = (items: { sortOrder?: number }[]) =>
  items.reduce((m, x) => Math.max(m, x.sortOrder ?? 0), -1) + 1;

/** Ajoute une photo dans la galerie (sans recharger toute la liste). */
export async function insertGalleryRow(row: {
  imageUrl: string;
  alt: string;
  eventType: string | null;
  sortOrder: number;
}): Promise<void> {
  const { error } = await supabase.from("gallery").insert([
    { image_url: row.imageUrl, alt: row.alt, event_type: row.eventType, sort_order: row.sortOrder },
  ]);
  if (error) throw error;
}

/** Ajoute un média (sans recharger toute la liste). */
export async function insertMediaRow(row: {
  title: string;
  url: string;
  type: "video" | "photo" | "audio";
  thumbnail: string | null;
  duration: string | null;
  eventType: string | null;
  sortOrder: number;
}): Promise<void> {
  const base = {
    title: row.title,
    url: row.url,
    type: row.type,
    thumbnail: row.thumbnail,
    duration: row.duration,
    is_featured: false,
    event_type: row.eventType,
  };
  let { error } = await supabase.from("media").insert([{ ...base, sort_order: row.sortOrder }]);
  if (error && /sort_order/.test(error.message || "")) {
    ({ error } = await supabase.from("media").insert([base]));
  }
  if (error) throw error;
}

/** Chemin dans le stockage à partir de l'adresse publique (null si fichier externe). */
function storagePath(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split("?")[0]) : null;
}

/** Supprime plusieurs photos de la galerie (fichiers compris). */
export async function deleteGalleryMany(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { data } = await supabase.from("gallery").select("image_url").in("id", ids);
  const paths = (data || []).map((r: any) => storagePath(r.image_url, "images")).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from("images").remove(paths);
  const { error } = await supabase.from("gallery").delete().in("id", ids);
  if (error) throw error;
}

/** Supprime plusieurs médias (fichiers et vignettes compris). */
export async function deleteMediaMany(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { data } = await supabase.from("media").select("url, thumbnail").in("id", ids);
  const paths = (data || [])
    .flatMap((r: any) => [r.url, r.thumbnail])
    .map((u) => storagePath(u, "media"))
    .filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from("media").remove(paths);
  const { error } = await supabase.from("media").delete().in("id", ids);
  if (error) throw error;
}

/** Change le type d'événement de plusieurs éléments (null = général). */
export async function moveMany(table: "gallery" | "media", ids: string[], eventType: string | null): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.from(table).update({ event_type: eventType }).in("id", ids);
  if (error) throw error;
}
