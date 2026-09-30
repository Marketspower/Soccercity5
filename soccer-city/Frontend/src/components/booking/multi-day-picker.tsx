// components/booking/multi-day-picker.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { DateCalendar } from "@/components/ui/date-calendar";
import { fetchBookedSpans, type BookedSpan } from "@/lib/api";
import {
  generateTimeOptions,
  computeSpanHours,
  formatSpanDuration,
  spansOverlap,
} from "@/lib/time-utils";

const OPENING = "08:00";
const CLOSING = "23:00";
const STEP_MINUTES = 15;

export interface MultiDayValue {
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
}

export function MultiDayPicker({
  pricePerHour,
  value,
  onChange,
}: {
  pricePerHour: number;
  value: MultiDayValue;
  onChange: (v: MultiDayValue) => void;
}) {
  const [bookedSpans, setBookedSpans] = useState<BookedSpan[]>([]);

  useEffect(() => {
    if (!value.startDate || !value.endDate) return;
    fetchBookedSpans(value.startDate, value.endDate).then(setBookedSpans);
  }, [value.startDate, value.endDate]);

  const timeOptions = useMemo(() => generateTimeOptions(OPENING, CLOSING, STEP_MINUTES), []);

  const durationHours =
    value.startDate && value.startTime && value.endDate && value.endTime
      ? computeSpanHours(value.startDate, value.startTime, value.endDate, value.endTime)
      : 0;

  const price = Math.round(durationHours * pricePerHour * 100) / 100;

  const conflict =
    durationHours > 0 &&
    bookedSpans.some((b) =>
      spansOverlap(
        value.startDate!, value.startTime!, value.endDate!, value.endTime!,
        b.date, b.startTime, b.endDate, b.endTime
      )
    );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Date de début
          </label>
          <DateCalendar
            value={value.startDate ?? ""}
            onChange={(iso) => onChange({ ...value, startDate: iso })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Heure de début
          </label>
          <select
            value={value.startTime ?? ""}
            onChange={(e) => onChange({ ...value, startTime: e.target.value || null })}
            disabled={!value.startDate}
            className="w-full rounded-md border bg-card px-3 py-2 outline-none focus:border-primary disabled:opacity-40"
          >
            <option value="">-- Choisir --</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Date de fin
          </label>
          <DateCalendar
            value={value.endDate ?? ""}
            onChange={(iso) => onChange({ ...value, endDate: iso })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
            Heure de fin
          </label>
          <select
            value={value.endTime ?? ""}
            onChange={(e) => onChange({ ...value, endTime: e.target.value || null })}
            disabled={!value.endDate}
            className="w-full rounded-md border bg-card px-3 py-2 outline-none focus:border-primary disabled:opacity-40"
          >
            <option value="">-- Choisir --</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {durationHours > 0 && (
        <div className="rounded-md border bg-card p-4 text-sm">
          <p>Durée totale : {formatSpanDuration(durationHours)}</p>
          <p className="mt-1 font-bold text-primary">Prix : {price.toFixed(2)} $</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Le terrain est réservé en continu (y compris la nuit) sur toute la période.
          </p>
        </div>
      )}

      {durationHours < 0 && (
        <p className="text-sm text-destructive">
          La date/heure de fin doit être après la date/heure de début.
        </p>
      )}

      {conflict && (
        <p className="text-sm text-destructive">
          ⚠️ Cette période chevauche une réservation existante. Choisissez d'autres dates.
        </p>
      )}
    </div>
  );
}