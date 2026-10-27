// lib/media-bands.ts
// Vitesse des bandes défilantes de photos/vidéos (Admin → Apparence,
// table settings, clé « media_bands »).
import { supabase } from "./supabase";

export type BandSpeed = "lente" | "normale" | "rapide";

export const BAND_SPEEDS: { value: BandSpeed; label: string }[] = [
  { value: "lente", label: "Lente" },
  { value: "normale", label: "Normale" },
  { value: "rapide", label: "Rapide" },
];

/** Secondes pour qu'une vignette traverse sa propre largeur (vitesse constante, quel que soit le nombre de photos). */
export const SECONDS_PER_ITEM: Record<BandSpeed, number> = { lente: 9, normale: 6, rapide: 3.5 };

const normalize = (raw: any): BandSpeed => {
  let v = raw;
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { v = { speed: v }; }
  }
  const s = v?.speed;
  return s === "lente" || s === "rapide" ? s : "normale";
};

let cache: Promise<BandSpeed> | null = null;

export function loadBandSpeed(force = false): Promise<BandSpeed> {
  if (!cache || force) {
    cache = (async () => {
      try {
        const { data } = await supabase.from("settings").select("value").eq("key", "media_bands").maybeSingle();
        return normalize(data?.value);
      } catch {
        return "normale" as BandSpeed;
      }
    })();
  }
  return cache;
}

export async function saveBandSpeed(speed: BandSpeed): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .upsert([{ key: "media_bands", value: { speed } }], { onConflict: "key" });
  if (error) throw error;
  cache = Promise.resolve(speed);
}

/**
 * Adresse optimisée (WebP, taille adaptée) pour les images Supabase ou locales ;
 * les autres adresses (ex. vignettes YouTube) sont renvoyées telles quelles.
 */
export function optimizedUrl(src: string, width: 384 | 640 | 828 | 1080 | 1920, quality = 70): string {
  if (!src) return src;
  const local = src.startsWith("/") && !src.startsWith("/_next/");
  const supa = /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//.test(src);
  if (!local && !supa) return src;
  if (/\.(gif|svg)(\?|$)/i.test(src)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
