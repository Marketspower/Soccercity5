// lib/site-background.ts
// Réglages du fond du site, modifiables dans Admin → Apparence
// (table settings, clé « site_background »).
import { supabase } from "./supabase";

/** none = site actuel · fixed = A · windows = B · sections = D */
export type BgMode = "none" | "fixed" | "windows" | "sections";

export interface SiteBackground {
  mode: BgMode;
  /** Image principale (vide = photo actuelle du terrain) */
  image: string;
  /** Intensité du voile sombre, de 0 à 90 (%) */
  overlay: number;
  /** Style D : image par section (id de section → URL) */
  sections: Record<string, string>;
}

export const DEFAULT_IMAGE = "/images/fond-terrain.webp";
export const DEFAULT_IMAGE_MOBILE = "/images/fond-terrain-mobile.webp";

export const DEFAULT_BACKGROUND: SiteBackground = {
  mode: "none",
  image: "",
  overlay: 70,
  sections: {},
};

/** Sections de l'accueil qui peuvent recevoir leur propre image (style D) */
export const BG_SECTIONS: { id: string; label: string }[] = [
  { id: "apropos", label: "À propos" },
  { id: "terrains", label: "Terrains" },
  { id: "tarifs", label: "Tarifs" },
  { id: "services", label: "Services" },
  { id: "galerie", label: "Galerie" },
  { id: "avis", label: "Avis" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
];

export const MODE_LABELS: Record<BgMode, { letter: string; title: string; text: string }> = {
  none: { letter: "—", title: "Site actuel", text: "Aucune image de fond fixe." },
  fixed: { letter: "A", title: "Image fixe derrière tout le site", text: "Le contenu défile par-dessus une image immobile ; les cartes deviennent translucides." },
  windows: { letter: "B", title: "Fenêtres sur l'image", text: "Sections opaques, séparées par des bandes transparentes qui laissent voir l'image fixe." },
  sections: { letter: "D", title: "Une image par section", text: "Chaque section a sa propre image fixe, révélée au défilement." },
};

const clamp = (n: number) => Math.max(0, Math.min(90, Math.round(Number(n) || 0)));

export function normalizeBackground(raw: unknown): SiteBackground {
  let v: any = raw;
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { v = {}; }
  }
  v = v && typeof v === "object" ? v : {};
  const mode: BgMode = ["none", "fixed", "windows", "sections"].includes(v.mode) ? v.mode : "none";
  return {
    mode,
    image: typeof v.image === "string" ? v.image : "",
    overlay: v.overlay === undefined ? DEFAULT_BACKGROUND.overlay : clamp(v.overlay),
    sections: v.sections && typeof v.sections === "object" ? v.sections : {},
  };
}

export async function loadSiteBackground(): Promise<SiteBackground> {
  try {
    const { data } = await supabase.from("settings").select("value").eq("key", "site_background").maybeSingle();
    return normalizeBackground(data?.value);
  } catch {
    return { ...DEFAULT_BACKGROUND };
  }
}

export async function saveSiteBackground(bg: SiteBackground): Promise<void> {
  const { error } = await supabase
    .from("settings")
    .upsert([{ key: "site_background", value: { ...bg, overlay: clamp(bg.overlay) } }], { onConflict: "key" });
  if (error) throw error;
}

/**
 * URL optimisée de l'image : fichiers déjà allégés pour la photo par défaut,
 * sinon passage par l'optimiseur d'images de Next.js (WebP, taille adaptée).
 */
export function bgUrl(image: string, target: "desktop" | "mobile"): string {
  if (!image) return target === "mobile" ? DEFAULT_IMAGE_MOBILE : DEFAULT_IMAGE;
  if (image.startsWith("/images/")) return image;
  const w = target === "mobile" ? 828 : 1920;
  return `/_next/image?url=${encodeURIComponent(image)}&w=${w}&q=${target === "mobile" ? 60 : 72}`;
}

/** Aperçu : ?fond=A|B|D|aucun dans l'adresse */
export const PREVIEW_PARAM: Record<string, BgMode> = { a: "fixed", b: "windows", d: "sections", aucun: "none" };
export const DRAFT_KEY = "sc5-fond-brouillon";
