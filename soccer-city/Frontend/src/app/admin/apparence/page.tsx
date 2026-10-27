// app/admin/apparence/page.tsx — style du fond du site (A, B, D), image et voile
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, ImagePlus, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { BandSpeedSetting } from "@/components/admin/band-speed-setting";
import {
  BG_SECTIONS,
  bgUrl,
  DEFAULT_BACKGROUND,
  DRAFT_KEY,
  loadSiteBackground,
  MODE_LABELS,
  saveSiteBackground,
  type BgMode,
  type SiteBackground,
} from "@/lib/site-background";

const MODES: BgMode[] = ["none", "fixed", "windows", "sections"];
const PREVIEW_LETTER: Record<BgMode, string> = { none: "aucun", fixed: "A", windows: "B", sections: "D" };

export default function AdminApparence() {
  const { gallery, syncGallery, uploadImage, uploading } = useAppStore();
  const [bg, setBg] = useState<SiteBackground>(DEFAULT_BACKGROUND);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    syncGallery();
    loadSiteBackground().then((b) => { setBg(b); setLoaded(true); });
  }, [syncGallery]);

  // Brouillon partagé avec l'aperçu sur le site (onglet ouvert par les boutons « Aperçu »)
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(bg)); } catch {}
  }, [bg, loaded]);

  const update = (patch: Partial<SiteBackground>) => { setBg((b) => ({ ...b, ...patch })); setMessage(null); };

  const save = async () => {
    try {
      await saveSiteBackground(bg);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setMessage({ ok: true, text: "Enregistré : le fond du site est à jour pour tous les visiteurs." });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Enregistrement impossible." });
    }
  };

  const upload = async (file: File) => {
    try {
      const url = await uploadImage(file, "fonds");
      update({ image: url });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message || "Envoi de l'image impossible." });
    }
  };

  const galleryUrls = gallery.map((g) => g.imageUrl).filter(Boolean);
  const mainPreview = bgUrl(bg.image, "desktop");

  return (
    <div className="space-y-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Apparence du site</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez un style de fond, l&apos;image et l&apos;intensité du voile. Testez chaque style avec
            « Aperçu » avant d&apos;enregistrer : rien ne change pour les visiteurs tant que vous n&apos;enregistrez pas.
          </p>
        </div>
        <Button variant="brand" onClick={save}><Save /> Enregistrer</Button>
      </header>

      {message && (
        <p className={`rounded-md px-4 py-3 text-sm ${message.ok ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
          {message.text}
        </p>
      )}

      {/* ===== Style ===== */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">1. Style de fond</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {MODES.map((m) => {
            const info = MODE_LABELS[m];
            const active = bg.mode === m;
            return (
              <div key={m} className={`rounded-lg border p-4 transition-colors ${active ? "border-primary bg-primary/10" : "bg-card"}`}>
                <button type="button" className="w-full text-left" onClick={() => update({ mode: m })}>
                  <p className="flex items-center gap-2 font-bold">
                    <span className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-primary">{info.letter}</span>
                    {info.title}
                    {active && <Check className="ml-auto size-4 text-primary" />}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{info.text}</p>
                </button>
                <a
                  href={`/?fond=${PREVIEW_LETTER[m]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Aperçu sur le site <ExternalLink className="size-3" />
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Image ===== */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">2. Image principale</h2>
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="relative aspect-video overflow-hidden rounded-lg border bg-cover bg-center" style={{ backgroundImage: `url("${mainPreview}")` }}>
            <div className="absolute inset-0" style={{ background: `rgb(5 6 7 / ${bg.overlay / 100})` }} />
            <div className="relative flex h-full flex-col items-center justify-center p-4 text-center">
              <p className="font-display text-lg font-bold italic text-white">TEXTE DU SITE</p>
              <p className="text-xs text-white/80">Lisibilité avec ce voile</p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {bg.image ? "Image personnalisée." : "Photo actuelle du terrain (par défaut)."} Sur téléphone, une version plus légère est chargée automatiquement.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <ImagePlus /> {uploading ? "Envoi…" : "Envoyer une image"}
              </Button>
              {bg.image && (
                <Button variant="outline" size="sm" onClick={() => update({ image: "" })}>
                  <RotateCcw /> Photo du terrain par défaut
                </Button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </div>
            {galleryUrls.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">Ou choisissez une photo de la galerie :</p>
                <div className="flex flex-wrap gap-2">
                  {galleryUrls.slice(0, 16).map((u) => (
                    <button key={u} type="button" onClick={() => update({ image: u })}
                      className={`size-16 overflow-hidden rounded-md border-2 ${bg.image === u ? "border-primary" : "border-transparent"}`}>
                      <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===== Voile ===== */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">3. Intensité du voile</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">Image très visible</span>
          <input type="range" min={0} max={90} step={5} value={bg.overlay}
            onChange={(e) => update({ overlay: Number(e.target.value) })} className="w-64 accent-[hsl(var(--primary))]" />
          <span className="text-xs text-muted-foreground">Texte très lisible</span>
          <span className="w-12 text-right font-bold tabular-nums">{bg.overlay} %</span>
        </div>
        <p className="text-xs text-muted-foreground">Conseil : entre 60 et 75 % pour garder les textes bien lisibles.</p>
      </section>

      {/* ===== D : image par section ===== */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">4. Images par section <span className="text-sm font-normal text-muted-foreground">(style D seulement)</span></h2>
        <p className="text-sm text-muted-foreground">
          Sans choix, chaque section prend automatiquement une photo de la galerie (sinon l&apos;image principale).
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {BG_SECTIONS.map((s) => (
            <div key={s.id} className="space-y-1.5">
              <Label>{s.label}</Label>
              <Select value={bg.sections[s.id] ?? ""} onChange={(e) => update({ sections: { ...bg.sections, [s.id]: e.target.value } })}>
                <option value="">Automatique</option>
                <option value="__main__">Image principale</option>
                {galleryUrls.map((u, i) => (
                  <option key={u} value={u}>Photo de la galerie n° {i + 1}</option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Bandes défilantes ===== */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">5. Photos et vidéos qui défilent</h2>
        <p className="text-sm text-muted-foreground">
          Galerie de l&apos;accueil et pages d&apos;événement. Le défilement se met en pause au survol ; un clic ouvre la photo ou la vidéo en plein écran.
        </p>
        <BandSpeedSetting />
      </section>

      <p className="text-xs text-muted-foreground">
        Les visiteurs qui ont activé « Réduire les animations » sur leur appareil voient une image statique, sans effet de défilement.
      </p>
    </div>
  );
}
