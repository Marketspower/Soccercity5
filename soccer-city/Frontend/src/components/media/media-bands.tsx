// components/media/media-bands.tsx
// Bandes défilantes de photos et vidéos (sens opposés), plein écran au clic.
//  • Vitesse réglée dans Admin → Apparence (lente / normale / rapide).
//  • Pause au survol, au focus clavier et quand le plein écran est ouvert.
//  • « Réduire les animations » activé → rangée fixe que l'on fait défiler à la main.
//  • Images optimisées (WebP, taille adaptée) et chargées au besoin.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { VideoPlayer } from "@/components/media/video-player";
import { parseVideoUrl } from "@/lib/video";
import { loadBandSpeed, optimizedUrl, SECONDS_PER_ITEM, type BandSpeed } from "@/lib/media-bands";

export interface BandItem {
  id: string;
  kind: "photo" | "video";
  /** Photo : adresse de l'image · Vidéo : lien YouTube/Vimeo ou fichier */
  src: string;
  alt: string;
  poster?: string | null;
}

export interface BandRow {
  items: BandItem[];
  /** true = défile vers la droite */
  reverse?: boolean;
}

const MIN_PER_LOOP = 8;

function posterOf(item: BandItem): string | null {
  if (item.kind === "photo") return item.src;
  if (item.poster) return item.poster;
  const v = parseVideoUrl(item.src);
  return v?.kind === "youtube" ? v.thumbnail : null;
}

function Tile({
  item,
  size,
  hidden,
  onOpen,
}: {
  item: BandItem;
  size: "sm" | "md";
  hidden?: boolean;
  onOpen: () => void;
}) {
  const poster = posterOf(item);
  const dims =
    item.kind === "video"
      ? size === "sm" ? "h-36 sm:h-40 aspect-video" : "h-40 sm:h-52 md:h-56 aspect-video"
      : size === "sm" ? "h-36 sm:h-44 aspect-[4/3]" : "h-44 sm:h-56 md:h-64 aspect-[4/3]";
  return (
    <div className="shrink-0 pr-3 sm:pr-4">
      <button
        type="button"
        onClick={onOpen}
        tabIndex={hidden ? -1 : 0}
        aria-hidden={hidden || undefined}
        aria-label={item.kind === "video" ? `Lire la vidéo : ${item.alt}` : `Agrandir : ${item.alt}`}
        className={`group/tile relative block overflow-hidden rounded-xl bg-muted shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${dims}`}
      >
        {poster ? (
          <img
            src={optimizedUrl(poster, 640)}
            alt={hidden ? "" : item.alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/tile:scale-105"
          />
        ) : (
          <video
            src={`${item.src}#t=1`}
            preload="metadata"
            muted
            playsInline
            className="pointer-events-none h-full w-full object-cover"
          />
        )}
        {item.kind === "video" && (
          <>
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary/90 text-white shadow-lg transition-transform group-hover/tile:scale-110">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
            <span className="absolute inset-x-3 bottom-2 truncate text-left text-xs font-semibold text-white">{item.alt}</span>
          </>
        )}
      </button>
    </div>
  );
}

export function MediaBands({
  rows,
  size = "md",
  className = "",
}: {
  rows: BandRow[];
  size?: "sm" | "md";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [speed, setSpeed] = useState<BandSpeed>("normale");
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    loadBandSpeed().then(setSpeed);
  }, []);

  const visibleRows = rows.filter((r) => r.items.length > 0);

  // Liste unique pour le plein écran (dans l'ordre des bandes)
  const all = useMemo(() => {
    const seen = new Set<string>();
    const list: BandItem[] = [];
    visibleRows.forEach((r) => r.items.forEach((it) => {
      if (!seen.has(it.id)) { seen.add(it.id); list.push(it); }
    }));
    return list;
  }, [visibleRows]);

  const openItem = (id: string) => setOpen(all.findIndex((x) => x.id === id));

  if (visibleRows.length === 0) return null;

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {visibleRows.map((row, r) => {
        if (reduce) {
          return (
            <div key={r} className="flex snap-x overflow-x-auto pb-2 [scrollbar-width:thin]">
              {row.items.map((it) => (
                <div key={it.id} className="snap-start">
                  <Tile item={it} size={size} onOpen={() => openItem(it.id)} />
                </div>
              ))}
            </div>
          );
        }
        // Répète la liste pour remplir la largeur, puis la double pour une boucle sans à-coup
        const loop: BandItem[] = [];
        while (loop.length < MIN_PER_LOOP) loop.push(...row.items);
        const duration = loop.length * SECONDS_PER_ITEM[speed];
        return (
          <div
            key={r}
            className="group relative overflow-hidden"
            style={{
              maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
            }}
          >
            <div
              className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
              style={{
                animationDuration: `${duration}s`,
                animationDirection: row.reverse ? "reverse" : "normal",
                animationPlayState: open !== null ? "paused" : undefined,
              }}
            >
              {[0, 1].map((copy) =>
                loop.map((it, k) => (
                  <Tile
                    key={`${copy}-${k}-${it.id}`}
                    item={it}
                    size={size}
                    hidden={copy === 1 || k >= row.items.length}
                    onOpen={() => openItem(it.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}

      {open !== null && open >= 0 && (
        <Lightbox items={all} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: BandItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index];
  const count = items.length;
  const prev = useCallback(() => onIndex((index + count - 1) % count), [index, count, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % count), [index, count, onIndex]);
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, prev, next]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.alt}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
      }}
    >
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        {item.kind === "photo" ? (
          <img
            key={item.id}
            src={optimizedUrl(item.src, 1920, 80)}
            alt={item.alt}
            className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
          />
        ) : (
          <div key={item.id} className="mx-auto w-full max-w-4xl">
            <VideoPlayer url={item.src} title={item.alt} poster={item.poster} />
          </div>
        )}
        <p className="mt-3 text-center text-sm text-white/70">
          {item.alt} — {index + 1} / {count}
        </p>
      </div>

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Précédent"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:left-5"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Suivant"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:right-5"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
    </div>
  );
}
