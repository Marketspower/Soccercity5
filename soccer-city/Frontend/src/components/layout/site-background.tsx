// components/layout/site-background.tsx
// Fond du site (styles A, B, D) — réglé dans Admin → Apparence.
// • Compatible iPhone : pas de « background-attachment: fixed » (ignoré par
//   Safari iOS) mais un calque en position fixe.
// • Image allégée sur mobile (fichier plus petit).
// • « Réduire les animations » activé sur l'appareil → image statique.
// Aperçu sans rien enregistrer : ajouter ?fond=A, ?fond=B, ?fond=D ou ?fond=aucun.
"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  bgUrl,
  DEFAULT_BACKGROUND,
  DRAFT_KEY,
  loadSiteBackground,
  MODE_LABELS,
  normalizeBackground,
  PREVIEW_PARAM,
  type SiteBackground as Bg,
} from "@/lib/site-background";

const PREVIEW_KEY = "sc5-fond-apercu";

export function SiteBackground() {
  const pathname = usePathname();
  const params = useSearchParams();
  const gallery = useAppStore((s) => s.gallery);
  const [saved, setSaved] = useState<Bg | null>(null);
  const [preview, setPreview] = useState<Bg | null>(null);

  // Réglages enregistrés
  useEffect(() => {
    loadSiteBackground().then(setSaved);
  }, []);

  // Aperçu demandé par l'adresse (garde le choix pendant la visite)
  useEffect(() => {
    const p = params.get("fond");
    try {
      if (p !== null) {
        const mode = PREVIEW_PARAM[p.toLowerCase()];
        if (mode) sessionStorage.setItem(PREVIEW_KEY, mode);
        else sessionStorage.removeItem(PREVIEW_KEY);
      }
      const mode = sessionStorage.getItem(PREVIEW_KEY);
      if (!mode) return setPreview(null);
      // Brouillon de la page Apparence (image + voile pas encore enregistrés), sinon réglages enregistrés
      const draftRaw = localStorage.getItem(DRAFT_KEY);
      const base = draftRaw ? normalizeBackground(draftRaw) : saved ?? DEFAULT_BACKGROUND;
      setPreview({ ...base, mode: mode as Bg["mode"] });
    } catch {
      setPreview(null);
    }
  }, [params, saved]);

  const bg = preview ?? saved;
  const isAdmin = pathname?.startsWith("/admin");
  const mode = !bg || isAdmin ? "none" : bg.mode;

  // Applique le style à toute la page
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "none" || !bg) {
      delete root.dataset.bg;
      return;
    }
    root.dataset.bg = mode;
    root.style.setProperty("--bg-desktop", `url("${bgUrl(bg.image, "desktop")}")`);
    root.style.setProperty("--bg-mobile", `url("${bgUrl(bg.image, "mobile")}")`);
    root.style.setProperty("--bg-overlay", String((bg.overlay ?? 70) / 100));
    return () => { delete root.dataset.bg; };
  }, [mode, bg]);

  // Style D : un calque d'image dans chaque section de l'accueil
  useEffect(() => {
    if (mode !== "sections" || !bg) return;
    const main = document.querySelector("main");
    if (!main) return;
    const galleryUrls = gallery.map((g) => g.imageUrl).filter(Boolean);

    const apply = () => {
      const sections = Array.from(main.querySelectorAll<HTMLElement>("section[id]"));
      sections.forEach((section, i) => {
        // Image choisie dans l'admin, sinon une photo de la galerie, sinon l'image principale
        const pick = bg.sections[section.id];
        const chosen =
          pick === "__main__" ? bg.image : pick || galleryUrls[i % Math.max(1, galleryUrls.length)] || bg.image;
        let layer = section.querySelector<HTMLElement>(":scope > .site-bg-section-layer");
        if (!layer) {
          layer = document.createElement("div");
          layer.className = "site-bg-section-layer";
          layer.setAttribute("aria-hidden", "true");
          section.prepend(layer);
        }
        layer.style.setProperty("--section-bg-desktop", `url("${bgUrl(chosen, "desktop")}")`);
        layer.style.setProperty("--section-bg-mobile", `url("${bgUrl(chosen, "mobile")}")`);
      });
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(main, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      main.querySelectorAll(".site-bg-section-layer").forEach((el) => el.remove());
    };
  }, [mode, bg, gallery, pathname]);

  if (mode === "none" || !bg) return null;

  return (
    <>
      {mode !== "sections" && (
        <div className="site-bg-layer" aria-hidden="true">
          <div className="site-bg-overlay" />
        </div>
      )}
      {preview && (
        <div className="fixed bottom-3 left-3 z-[70] flex items-center gap-2 rounded-full border bg-card/95 px-4 py-2 text-xs shadow-lg backdrop-blur">
          <span>
            Aperçu du style <b>{MODE_LABELS[preview.mode].letter}</b> — {MODE_LABELS[preview.mode].title}
          </span>
          <button
            type="button"
            className="font-semibold text-primary underline"
            onClick={() => {
              try { sessionStorage.removeItem(PREVIEW_KEY); } catch {}
              setPreview(null);
            }}
          >
            Quitter
          </button>
        </div>
      )}
    </>
  );
}
