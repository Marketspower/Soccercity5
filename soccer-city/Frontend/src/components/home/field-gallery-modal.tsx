// components/home/field-gallery-modal.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Images } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { Field } from "@/lib/types";

export function FieldGalleryTrigger({ field }: { field: Field }) {
  const { fieldMedia } = useAppStore();
  const [open, setOpen] = useState(false);
  const items = fieldMedia
    .filter((m) => m.fieldId === field.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <Images className="size-4" />
        Voir les photos & vidéos ({items.length})
      </button>
      {open && <FieldGalleryModal field={field} items={items} onClose={() => setOpen(false)} />}
    </>
  );
}

function FieldGalleryModal({
  field,
  items,
  onClose,
}: {
  field: Field;
  items: { id: string; url: string; type: "image" | "video" }[];
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + items.length) % items.length),
    [items.length]
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % items.length),
    [items.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [prev, next, onClose]);

  const current = items[index];

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          key={index}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-h-[85vh] w-full max-w-4xl"
          onClick={(e) => e.stopPropagation()}
        >
          {current.type === "image" ? (
            <img
              src={current.url}
              alt={field.name}
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
          ) : (
            <video
              src={current.url}
              controls
              autoPlay
              className="max-h-[85vh] w-full rounded-lg"
            />
          )}
          <p className="mt-3 text-center text-sm text-white/70">
            {field.name} — {index + 1} / {items.length}
          </p>
        </motion.div>

        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-5 top-5 rounded-full glass p-3 text-white transition-transform hover:scale-110"
        >
          <X className="size-5" />
        </button>
        {items.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Précédent"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full glass p-3 text-white transition-transform hover:scale-110 sm:left-6"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Suivant"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full glass p-3 text-white transition-transform hover:scale-110 sm:right-6"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}