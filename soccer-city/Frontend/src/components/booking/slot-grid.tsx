// components/booking/slot-grid.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Lock, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSlots } from "@/lib/api";
import { cn, toISODate } from "@/lib/utils";

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
    queryKey: ["slots", iso], // Supprimer fieldId de la clé
    queryFn: () => fetchSlots(date), // Passer uniquement date
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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {slots.map((slot, i) => {
        const isFree = slot.state === "free";
        const isSelected = selected === slot.hour;
        return (
          <motion.button
            key={slot.hour}
            type="button"
            disabled={!isFree}
            onClick={() => onSelect(isSelected ? null : slot.hour)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className={cn(
              "relative flex h-14 items-center justify-center gap-2 rounded-md border font-bold text-sm tabular-nums transition-all",
              isFree && !isSelected &&
                "border-pitch/40 bg-pitch/10 text-pitch hover:border-pitch hover:bg-pitch/20",
              isSelected && "border-primary bg-primary text-white shadow-glow-sm scale-[1.03]",
              !isFree && "cursor-not-allowed border-border bg-muted/50 text-muted-foreground/50",
              slot.state === "taken" && "line-through decoration-2"
            )}
          >
            {slot.state === "blocked" ? <Lock className="size-3.5" /> : <Clock className="size-3.5 opacity-60" />}
            {slot.label}
          </motion.button>
        );
      })}
    </div>
  );
}