// components/ui/date-calendar.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  format, isBefore, isSameDay, startOfToday, getDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateCalendarProps {
  value: string; // format "yyyy-MM-dd" ou ""
  onChange: (iso: string) => void;
  placeholder?: string;
  error?: boolean;
}

export function DateCalendar({ value, onChange, placeholder = "Choisir une date", error }: DateCalendarProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value ? new Date(`${value}T00:00:00`) : new Date()));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const today = startOfToday();
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  // Décalage pour que la semaine commence le lundi (getDay renvoie 0 pour dimanche)
  const firstDayOffset = (getDay(startOfMonth(month)) + 6) % 7;
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-card px-4 py-2 text-left text-sm outline-none transition-colors",
          error ? "border-destructive" : "focus:border-primary"
        )}
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value && selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: fr }) : placeholder}
        </span>
        <CalendarIcon className="size-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 rounded-lg border bg-card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="rounded p-1 hover:bg-secondary"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-semibold capitalize">
              {format(month, "MMMM yyyy", { locale: fr })}
            </p>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="rounded p-1 hover:bg-secondary"
              aria-label="Mois suivant"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {days.map((day) => {
              const disabled = isBefore(day, today);
              const selected = selectedDate && isSameDay(day, selectedDate);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(format(day, "yyyy-MM-dd"));
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                    disabled && "cursor-not-allowed text-muted-foreground/30",
                    !disabled && !selected && "hover:bg-primary/20",
                    selected && "bg-primary font-bold text-white"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}