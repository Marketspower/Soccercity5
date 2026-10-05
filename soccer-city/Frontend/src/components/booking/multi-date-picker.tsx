// components/booking/multi-date-picker.tsx
// Mode « Dates au choix » : sélection de plusieurs jours NON consécutifs
// (ex. les vendredis 3, 10, 17 octobre + 7 novembre), avec le même horaire
// chaque jour. Navigation libre d'un mois à l'autre.
"use client";
import { useEffect, useMemo, useState } from "react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  format, isBefore, startOfToday, getDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchBookedSpans, type BookedSpan } from "@/lib/api";
import {
  generateTimeOptions, timeToMinutes, computeDurationHours, formatDuration,
} from "@/lib/time-utils";

const OPENING = "08:00";
const CLOSING = "23:00";
const STEP_MINUTES = 15;
export const MAX_DATES = 30; // limite (contrainte technique côté paiement)

export interface MultiDatesValue {
  dates: string[]; // ISO "yyyy-MM-dd", triées
  startTime: string | null; // même horaire appliqué à chaque date
  endTime: string | null;
}

/** "21:00:00" → "21:00" (la base renvoie parfois les secondes) */
const hm = (t: string) => t.slice(0, 5);

/** Portion occupée par un span (possiblement multi-jours) sur un jour donné, ou null. */
function spanOnDay(span: BookedSpan, day: string): { start: string; end: string } | null {
  if (day < span.date || day > span.endDate) return null;
  const start = day === span.date ? hm(span.startTime) : "00:00";
  const end = day === span.endDate ? hm(span.endTime) : "24:00";
  return { start, end };
}

export function MultiDatePicker({
  pricePerHour,
  value,
  onChange,
  onConflictsChange,
}: {
  pricePerHour: number;
  value: MultiDatesValue;
  onChange: (v: MultiDatesValue) => void;
  /** Remonte le nombre de dates en conflit au parent (pour bloquer Continuer). */
  onConflictsChange?: (count: number) => void;
}) {
  const [month, setMonth] = useState(() => new Date());
  const [bookedSpans, setBookedSpans] = useState<BookedSpan[]>([]);

  const today = startOfToday();
  const sorted = useMemo(() => [...value.dates].sort(), [value.dates]);

  // Plages occupées entre la première et la dernière date sélectionnée
  useEffect(() => {
    if (sorted.length === 0) return;
    fetchBookedSpans(sorted[0], sorted[sorted.length - 1]).then(setBookedSpans);
  }, [sorted.join(",")]);

  const timeOptions = useMemo(
    () => generateTimeOptions(OPENING, CLOSING, STEP_MINUTES),
    []
  );
  const endOptions = useMemo(
    () =>
      value.startTime
        ? timeOptions.filter((t) => timeToMinutes(t) > timeToMinutes(value.startTime!))
        : timeOptions,
    [timeOptions, value.startTime]
  );

  const toggleDate = (iso: string) => {
    const has = value.dates.includes(iso);
    if (!has && value.dates.length >= MAX_DATES) return;
    onChange({
      ...value,
      dates: has ? value.dates.filter((d) => d !== iso) : [...value.dates, iso].sort(),
    });
  };

  // Dates sélectionnées qui chevauchent une réservation/un blocage existant
  const conflictDates = useMemo(() => {
    if (!value.startTime || !value.endTime) return [];
    const s = timeToMinutes(value.startTime);
    const e = timeToMinutes(value.endTime);
    return sorted.filter((d) =>
      bookedSpans.some((span) => {
        const part = spanOnDay(span, d);
        if (!part) return false;
        const ps = timeToMinutes(part.start);
        const pe = part.end === "24:00" ? 24 * 60 : timeToMinutes(part.end);
        return s < pe && e > ps;
      })
    );
  }, [sorted, bookedSpans, value.startTime, value.endTime]);

  // Informe le parent dès que les conflits changent
  useEffect(() => {
    onConflictsChange?.(conflictDates.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conflictDates.length]);

  const hoursPerDay =
    value.startTime && value.endTime
      ? computeDurationHours(value.startTime, value.endTime)
      : 0;
  const price =
    hoursPerDay > 0
      ? Math.round(hoursPerDay * pricePerHour * sorted.length * 100) / 100
      : 0;

  // ----- rendu du calendrier -----
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstDayOffset = (getDay(startOfMonth(month)) + 6) % 7; // lundi = 0

  return (
    <div className="space-y-5">
      {/* Calendrier multi-sélection */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="rounded-full border p-2 hover:bg-secondary"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-semibold capitalize">
            {format(month, "MMMM yyyy", { locale: fr })}
          </p>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-full border p-2 hover:bg-secondary"
            aria-label="Mois suivant"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const disabled = isBefore(day, today);
            const selected = value.dates.includes(iso);
            const conflict = conflictDates.includes(iso);
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => toggleDate(iso)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-md text-sm transition-colors",
                  disabled && "cursor-not-allowed text-muted-foreground/30",
                  !disabled && !selected && "hover:bg-primary/20",
                  selected && !conflict && "bg-primary font-bold text-white",
                  selected && conflict && "bg-destructive font-bold text-white"
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Cliquez sur les jours pour les ajouter ou les retirer — changez de mois
          librement, la sélection est conservée.
        </p>
      </div>

      {/* Dates sélectionnées */}
      {sorted.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sorted.map((d) => (
            <span
              key={d}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                conflictDates.includes(d)
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-primary/40 bg-primary/10"
              )}
            >
              {format(new Date(`${d}T00:00:00`), "EEE d MMM", { locale: fr })}
              <button
                type="button"
                onClick={() => toggleDate(d)}
                aria-label={`Retirer ${d}`}
                className="hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {sorted.length >= MAX_DATES && (
            <span className="text-xs text-muted-foreground">
              Maximum {MAX_DATES} dates par réservation.
            </span>
          )}
        </div>
      )}

      {/* Horaire commun à toutes les dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Heure de début (chaque jour)
          </label>
          <select
            value={value.startTime ?? ""}
            onChange={(e) =>
              onChange({ ...value, startTime: e.target.value || null, endTime: null })
            }
            className="w-full rounded-md border bg-card px-3 py-2 outline-none focus:border-primary"
          >
            <option value="">-- Choisir --</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Heure de fin (chaque jour)
          </label>
          <select
            value={value.endTime ?? ""}
            onChange={(e) => onChange({ ...value, endTime: e.target.value || null })}
            disabled={!value.startTime}
            className="w-full rounded-md border bg-card px-3 py-2 outline-none focus:border-primary disabled:opacity-40"
          >
            <option value="">-- Choisir --</option>
            {endOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Conflits */}
      {conflictDates.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p>
            ⚠️ {conflictDates.length} date(s) en rouge chevauche(nt) une réservation
            existante sur cet horaire :{" "}
            {conflictDates
              .map((d) => format(new Date(`${d}T00:00:00`), "d MMM", { locale: fr }))
              .join(", ")}
            .
          </p>
          <button
            type="button"
            onClick={() =>
              onChange({ ...value, dates: value.dates.filter((d) => !conflictDates.includes(d)) })
            }
            className="mt-2 font-semibold underline"
          >
            Retirer ces dates
          </button>
        </div>
      )}

      {/* Récapitulatif */}
      {sorted.length > 0 && hoursPerDay > 0 && (
        <div className="rounded-md border bg-card p-4 text-sm">
          <p>
            <b>{sorted.length} jour{sorted.length > 1 ? "s" : ""}</b> ×{" "}
            {formatDuration(value.startTime!, value.endTime!)} ({value.startTime} –{" "}
            {value.endTime})
          </p>
          <p className="mt-1 font-bold text-primary">Prix : {price.toFixed(2)} $</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Le même créneau horaire est réservé pour chacune des dates sélectionnées.
          </p>
        </div>
      )}
    </div>
  );
}
