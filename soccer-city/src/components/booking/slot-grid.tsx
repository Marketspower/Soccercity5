"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Lock, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSlots } from "@/lib/api";
import { cn, toISODate } from "@/lib/utils";
import type { Slot } from "@/lib/types";

/**
 * Grille des créneaux d'une journée (blocs stricts d'1 heure, 8 h → 23 h).
 * — Vert : libre, cliquable
 * — Gris barré : réservé / passé (non cliquable)
 * — Cadenas : bloqué par l'administration
 * La sélection active le bouton « Réserver » du parent.
 */
export function SlotGrid({
  fieldId,
  date,
  selected,
  onSelect,
}: {
  fieldId: string;
  date: Date;
  selected: number | null;
  onSelect: (hour: number | null) => void;
}) {
  const iso = toISODate(date);
  const { data: slots, isLoading } = useQuery({
    queryKey: ["slots", fieldId, iso],
    queryFn: () => fetchSlots(fieldId, date),
  });

  if (isLoading || !slots) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

  const freeCount = slots.filter((s) => s.state === "free").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-pitch" /> Libre ({freeCount})</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-muted-foreground/40" /> Indisponible</span>
        <span className="inline-flex items-center gap-1.5"><Lock className="size-3" /> Bloqué</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="listbox" aria-label="Créneaux disponibles">
        {slots.map((slot: Slot, i) => {
          const isFree = slot.state === "free";
          const isSelected = selected === slot.hour;
          return (
            <motion.button
              key={slot.hour}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={!isFree}
              onClick={() => onSelect(isSelected ? null : slot.hour)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
              className={cn(
                "relative flex h-14 items-center justify-center gap-2 rounded-md border font-display text-sm font-bold tabular-nums transition-all duration-200",
                // Libre : vert, survol lumineux
                isFree && !isSelected &&
                  "border-pitch/40 bg-pitch/10 text-pitch hover:border-pitch hover:bg-pitch/20 hover:shadow-[0_0_18px_-4px_rgba(22,195,106,.5)]",
                // Sélectionné : bleu marque, glow
                isSelected && "border-primary bg-primary text-white shadow-glow-sm scale-[1.03]",
                // Indisponible
                !isFree && "cursor-not-allowed border-border bg-muted/50 text-muted-foreground/50",
                slot.state === "taken" && "line-through decoration-2",
              )}
            >
              {slot.state === "blocked" ? <Lock className="size-3.5" /> : <Clock className="size-3.5 opacity-60" />}
              {slot.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
