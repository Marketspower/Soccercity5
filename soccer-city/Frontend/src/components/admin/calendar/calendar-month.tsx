// components/admin/calendar/calendar-month.tsx
"use client";

import { useMemo } from "react";
import { BOOKING_TYPES, typeBg } from "@/config/reservation-types";
import {
  bookingDays,
  toISODate,
  type CalendarBooking,
} from "@/lib/calendar-bookings";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_PER_CELL = 3;

interface Props {
  monthDate: Date;
  bookings: CalendarBooking[];
  onSelect: (booking: CalendarBooking) => void;
  onShowDay: (isoDate: string) => void;
}

export function CalendarMonth({ monthDate, bookings, onSelect, onShowDay }: Props) {
  const todayIso = toISODate(new Date());
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      for (const day of bookingDays(b)) {
        const list = map.get(day) ?? [];
        list.push(b);
        map.set(day, list);
      }
    }
    map.forEach((list) => {
      list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    });
    return map;
  }, [bookings]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // lundi = 0
    const start = new Date(year, month, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month]);

  return (
    <div className="overflow-hidden rounded-xl border bg-card/60">
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const iso = toISODate(d);
          const outside = d.getMonth() !== month;
          const isToday = iso === todayIso;
          const dayBookings = byDay.get(iso) ?? [];
          const shown = dayBookings.slice(0, MAX_PER_CELL);
          const hidden = dayBookings.length - shown.length;

          return (
            <div
              key={iso}
              className={[
                "flex min-h-[112px] flex-col gap-1 border-b border-r border-white/5 p-1.5 [&:nth-child(7n)]:border-r-0",
                outside ? "bg-black/20" : "",
                isToday ? "bg-primary/10" : "",
              ].join(" ")}
            >
              <div className="flex justify-end">
                <span
                  className={[
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : outside
                        ? "text-muted-foreground/40"
                        : "text-muted-foreground",
                  ].join(" ")}
                >
                  {d.getDate()}
                </span>
              </div>

              {shown.map((b) => {
                const cfg = BOOKING_TYPES[b.type];
                return (
                  <button
                    key={`${iso}-${b.id}`}
                    type="button"
                    onClick={() => onSelect(b)}
                    title={`${b.client} · ${cfg.label}${b.startTime ? ` · ${b.startTime}` : ""}`}
                    className={[
                      "truncate rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] font-semibold text-white transition-opacity hover:opacity-80",
                      b.status === "cancelled" ? "opacity-40 line-through" : "",
                    ].join(" ")}
                    style={{ backgroundColor: typeBg(b.type), borderLeftColor: cfg.color }}
                  >
                    {b.startTime ? `${b.startTime.slice(0, 5)} · ` : ""}
                    {b.client}
                  </button>
                );
              })}

              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => onShowDay(iso)}
                  className="px-1.5 text-left text-[11px] font-bold text-primary hover:underline"
                >
                  + {hidden} autre{hidden > 1 ? "s" : ""}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
