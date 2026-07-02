"use client";

import { addDays, isSameDay, startOfToday } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Bande de dates défilante — les 14 prochains jours. */
export function DatePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i));

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]" role="tablist" aria-label="Choisir une date">
      {days.map((d, i) => {
        const active = isSameDay(d, value);
        return (
          <motion.button
            key={d.toISOString()}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(d)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              "flex min-w-[76px] shrink-0 flex-col items-center rounded-md border px-3 py-3 transition-all duration-200",
              active
                ? "border-primary bg-primary text-white shadow-glow-sm"
                : "bg-card hover:border-primary/50 hover:-translate-y-0.5"
            )}
          >
            <span className={cn("text-[10px] font-semibold uppercase tracking-widest", active ? "text-white/80" : "text-muted-foreground")}>
              {i === 0 ? "Auj." : format(d, "EEE", { locale: fr })}
            </span>
            <span className="font-display text-2xl font-extrabold italic tabular-nums">{format(d, "d")}</span>
            <span className={cn("text-[10px] uppercase tracking-wider", active ? "text-white/80" : "text-muted-foreground")}>
              {format(d, "MMM", { locale: fr })}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
