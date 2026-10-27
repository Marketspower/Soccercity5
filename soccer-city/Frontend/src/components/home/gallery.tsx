// components/home/gallery.tsx
// Galerie de l'accueil : photos en deux bandes qui défilent en sens opposés,
// plein écran au clic. Ordre = celui choisi dans Admin → Galerie.
"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { MediaBands, type BandItem } from "@/components/media/media-bands";
import { useAppStore } from "@/lib/store";

export function Gallery() {
  const { gallery, syncGallery } = useAppStore();
  const [loading, setLoading] = useState(gallery.length === 0);

  useEffect(() => {
    syncGallery().finally(() => setLoading(false));
  }, [syncGallery]);

  if (loading && gallery.length === 0) {
    return (
      <section id="galerie" className="py-24 md:py-32" aria-busy="true">
        <div className="container space-y-4">
          <div className="mx-auto h-10 w-64 animate-pulse rounded bg-muted" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-56 w-72 shrink-0 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (gallery.length === 0) return null;

  // Photos générales d'abord, puis celles des événements
  const ordered = [...gallery.filter((g) => !g.eventType), ...gallery.filter((g) => g.eventType)];
  const items: BandItem[] = ordered.map((g) => ({
    id: g.id,
    kind: "photo",
    src: g.imageUrl,
    alt: g.alt || (g.eventType ? `${g.eventType} chez Soccer City` : "Soccer City"),
  }));
  // À partir de 6 photos : deux bandes (une photo sur deux), en sens opposés
  const rows =
    items.length >= 6
      ? [{ items: items.filter((_, i) => i % 2 === 0) }, { items: items.filter((_, i) => i % 2 === 1), reverse: true }]
      : [{ items }];

  return (
    <section id="galerie" className="py-24 md:py-32">
      <Reveal className="container mx-auto mb-12 max-w-2xl text-center">
        <p className="speed-eyebrow mb-4 justify-center">Notre galerie</p>
        <h2 className="display text-4xl sm:text-5xl">Moments <span className="text-primary">capturés</span></h2>
        <p className="mt-3 text-sm text-muted-foreground">Touchez une photo pour l&apos;agrandir.</p>
      </Reveal>
      <MediaBands rows={rows} />
    </section>
  );
}
