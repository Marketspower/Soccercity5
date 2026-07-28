// components/home/gallery.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { useAppStore } from "@/lib/store";

export function Gallery() {
  const { gallery, loadGallery } = useAppStore();
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    loadGallery();
  }, []);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(() => setIndex((i) => (i === null ? null : (i + gallery.length - 1) % gallery.length)), [gallery.length]);
  const next = useCallback(() => setIndex((i) => (i === null ? null : (i + 1) % gallery.length)), [gallery.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, prev, next]);

  if (gallery.length === 0) return null;

  return (
    <section id="galerie" className="container py-24 md:py-32">
      <Reveal className="mb-14 max-w-2xl">
        <p className="speed-eyebrow mb-4">Galerie</p>
        <h2 className="display text-4xl sm:text-5xl">
          L&apos;ambiance <span className="text-primary">Soccer City</span>
        </h2>
      </Reveal>

      <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>button]:mb-4">
        {gallery.map((img, i) => (
          <motion.button
            key={img.id}
            type="button"
            onClick={() => setIndex(i)}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: (i % 4) * 0.07 }}
            className="group relative block w-full overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Agrandir : ${img.alt}`}
          >
            <img
              src={img.imageUrl}
              alt={img.alt}
              className="w-full transition-transform duration-700 ease-out group-hover:scale-110"
            />
            {img.event && (
              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                {img.event.type} - {img.event.firstName} {img.event.lastName}
              </div>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-primary/0 opacity-0 backdrop-blur-0 transition-all duration-300 group-hover:bg-primary/20 group-hover:opacity-100">
              <ZoomIn className="size-8 text-white drop-shadow" />
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {index !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={close}
          >
            <motion.div
              key={index}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-h-[85vh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={gallery[index].imageUrl}
                alt={gallery[index].alt}
                className="max-h-[85vh] w-full rounded-lg object-contain"
              />
              <p className="mt-3 text-center text-sm text-white/70">
                {gallery[index].alt} — {index + 1} / {gallery.length}
              </p>
            </motion.div>

            <button onClick={close} aria-label="Fermer" className="absolute right-5 top-5 rounded-full glass p-3 text-white transition-transform hover:scale-110">
              <X className="size-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Précédent" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full glass p-3 text-white transition-transform hover:scale-110 sm:left-6">
              <ChevronLeft className="size-6" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Suivant" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full glass p-3 text-white transition-transform hover:scale-110 sm:right-6">
              <ChevronRight className="size-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}