// components/booking/time-range-picker.tsx
"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBookedRanges } from "@/lib/api";
import { toISODate } from "@/lib/utils";
import {
  generateTimeOptions,
  rangesOverlap,
  timeToMinutes,
  computeDurationHours,
  formatDuration,
} from "@/lib/time-utils";

const OPENING = "08:00";
const CLOSING = "23:00";
const STEP_MINUTES = 15;
const MIN_DURATION_MINUTES = 30;

export interface TimeRangeValue {
  startTime: string | null;
  endTime: string | null;
}

export function TimeRangePicker({
  date,
  pricePerHour,
  value,
  onChange,
}: {
  date: Date;
  pricePerHour: number;
  value: TimeRangeValue;
  onChange: (v: TimeRangeValue) => void;
}) {
  const iso = toISODate(date);

  const { data: bookedRanges, isLoading } = useQuery({
    queryKey: ["booked-ranges", iso],
    queryFn: () => fetchBookedRanges(date),
  });

  const startOptions = useMemo(
    () => generateTimeOptions(OPENING, CLOSING, STEP_MINUTES),
    []
  );

  const endOptions = useMemo(() => {
    if (!value.startTime) return [];
    const minEnd = timeToMinutes(value.startTime) + MIN_DURATION_MINUTES;
    return generateTimeOptions(OPENING, CLOSING, STEP_MINUTES).filter(
      (t) => timeToMinutes(t) >= minEnd
    );
  }, [value.startTime]);

  const conflict =
    !!value.startTime && !!value.endTime && !!bookedRanges &&
    bookedRanges.some((r) =>
      rangesOverlap(value.startTime!, value.endTime!, r.startTime, r.endTime)
    );

  const durationHours =
    value.startTime && value.endTime
      ? computeDurationHours(value.startTime, value.endTime)
      : 0;

  const price = Math.round(durationHours * pricePerHour * 100) / 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Heure de début
          </label>
          <select
            value={value.startTime ?? ""}
            onChange={(e) => {
              const startTime = e.target.value || null;
              onChange({ startTime, endTime: null });
            }}
            className="w-full rounded-md border bg-card px-3 py-2 outline-none focus:border-primary"
          >
            <option value="">-- Choisir --</option>
            {startOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Heure de fin
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

      {value.startTime && value.endTime && (
        <div className="rounded-md border bg-card p-4 text-sm">
          <p>Durée : {formatDuration(value.startTime, value.endTime)}</p>
          <p className="mt-1 font-bold text-primary">Prix : {price.toFixed(2)} $</p>
        </div>
      )}

      {conflict && (
        <p className="text-sm text-destructive">
          ⚠️ Ce créneau chevauche une réservation existante. Choisissez un autre horaire.
        </p>
      )}

      {isLoading && (
        <p className="text-xs text-muted-foreground">Vérification des disponibilités…</p>
      )}
    </div>
  );
}