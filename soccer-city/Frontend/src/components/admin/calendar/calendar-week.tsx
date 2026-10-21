// components/admin/calendar/calendar-week.tsx
// Vue SEMAINE avec grille horaire, façon Google Agenda :
// - 7 colonnes (lundi → dimanche), lignes de 30 minutes de 08:00 à 23:00
// - les réservations sont positionnées à leur heure, hauteur = durée
// - double-clic sur une case vide → création pré-remplie (date + heure)
// - glisser-déposer d'une réservation vers un autre jour/heure pour la
//   déplacer (durée conservée) — multi-jours et demandes d'événements exclues
"use client";

import { useMemo, useState } from "react";
import { BOOKING_TYPES, typeBg } from "@/config/reservation-types";
import { timeToMinutes, minutesToTime } from "@/lib/time-utils";
import {
  bookingDays,
  isMultiDay,
  toISODate,
  type CalendarBooking,
} from "@/lib/calendar-bookings";

const OPENING_MIN = 8 * 60;   // 08:00
const CLOSING_MIN = 23 * 60;  // 23:00
const SLOT_MIN = 30;          // granularité du drop / double-clic
const SLOT_PX = 26;           // hauteur d'une ligne de 30 min
const PX_PER_MIN = SLOT_PX / SLOT_MIN;

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Lundi de la semaine contenant d. */
export function weekStartOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

interface Props {
  weekStart: Date; // lundi
  bookings: CalendarBooking[];
  onSelect: (booking: CalendarBooking) => void;
  /** Double-clic sur une case vide : créer à (date, heure). */
  onCreateAt?: (isoDate: string, startTime: string) => void;
  /** Dépôt d'une réservation glissée : nouveau jour + nouvelle heure de début. */
  onMove?: (booking: CalendarBooking, isoDate: string, startTime: string) => void;
}

const hm = (t: string) => t.slice(0, 5);

export function CalendarWeek({ weekStart, bookings, onSelect, onCreateAt, onMove }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null); // "iso|minutes"

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart]
  );
  const todayIso = toISODate(new Date());

  // Réservations par jour (une entrée par jour couvert)
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      for (const day of bookingDays(b)) {
        const list = map.get(day) ?? [];
        list.push(b);
        map.set(day, list);
      }
    }
    return map;
  }, [bookings]);

  const slots = useMemo(() => {
    const out: number[] = [];
    for (let m = OPENING_MIN; m < CLOSING_MIN; m += SLOT_MIN) out.push(m);
    return out;
  }, []);

  const gridHeight = (CLOSING_MIN - OPENING_MIN) * PX_PER_MIN;

  // Position verticale d'une réservation sur un jour donné
  const blockGeometry = (b: CalendarBooking, iso: string) => {
    const multi = isMultiDay(b);
    const startStr = !b.startTime ? null : multi && iso !== b.date ? "08:00" : hm(b.startTime);
    const endStr = !b.endTime ? null : multi && iso !== (b.endDate ?? b.date) ? "23:00" : hm(b.endTime);
    const start = startStr ? Math.max(timeToMinutes(startStr), OPENING_MIN) : OPENING_MIN;
    const end = endStr ? Math.min(timeToMinutes(endStr), CLOSING_MIN) : CLOSING_MIN;
    return {
      top: (start - OPENING_MIN) * PX_PER_MIN,
      height: Math.max((end - start) * PX_PER_MIN, 18),
    };
  };

  const canDrag = (b: CalendarBooking) =>
    !!onMove && b.source === "reservation" && !isMultiDay(b) && !!b.startTime && !!b.endTime;

  const handleDrop = (iso: string, minutes: number) => {
    setDropTarget(null);
    if (!dragId || !onMove) return;
    const b = bookings.find((x) => x.id === dragId);
    setDragId(null);
    if (!b || !canDrag(b)) return;
    const duration = timeToMinutes(hm(b.endTime!)) - timeToMinutes(hm(b.startTime!));
    const start = Math.min(minutes, CLOSING_MIN - Math.max(duration, SLOT_MIN));
    onMove(b, iso, minutesToTime(start));
  };

  return (
    <div className="overflow-x-auto rounded-xl border bg-card/60">
      <div className="min-w-[860px]">
        {/* ===== Entête des jours ===== */}
        <div className="grid border-b" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div />
          {days.map((d, i) => {
            const iso = toISODate(d);
            const isToday = iso === todayIso;
            return (
              <div key={iso} className="border-l border-white/5 py-2 text-center">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {WEEKDAYS[i]}
                </p>
                <p
                  className={[
                    "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                    isToday ? "bg-primary text-primary-foreground" : "",
                  ].join(" ")}
                >
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        {/* ===== Grille horaire ===== */}
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          {/* Colonne des heures */}
          <div className="relative" style={{ height: gridHeight }}>
            {slots.map(
              (m) =>
                m % 60 === 0 && (
                  <span
                    key={m}
                    className="absolute right-1.5 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground"
                    style={{ top: (m - OPENING_MIN) * PX_PER_MIN }}
                  >
                    {minutesToTime(m)}
                  </span>
                )
            )}
          </div>

          {/* Une colonne par jour */}
          {days.map((d) => {
            const iso = toISODate(d);
            const dayBookings = byDay.get(iso) ?? [];
            return (
              <div
                key={iso}
                className={[
                  "relative border-l border-white/5",
                  iso === todayIso ? "bg-primary/5" : "",
                ].join(" ")}
                style={{ height: gridHeight }}
              >
                {/* Cases de 30 min : lignes + cibles de drop + double-clic */}
                {slots.map((m) => {
                  const key = `${iso}|${m}`;
                  return (
                    <div
                      key={key}
                      onDoubleClick={() => onCreateAt?.(iso, minutesToTime(m))}
                      onDragOver={(e) => {
                        if (!dragId) return;
                        e.preventDefault();
                        setDropTarget(key);
                      }}
                      onDragLeave={() => setDropTarget((t) => (t === key ? null : t))}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(iso, m);
                      }}
                      title={onCreateAt ? "Double-clic : ajouter une réservation" : undefined}
                      className={[
                        "absolute inset-x-0",
                        m % 60 === 0 ? "border-t border-white/10" : "border-t border-dashed border-white/5",
                        dropTarget === key ? "bg-primary/25" : "",
                      ].join(" ")}
                      style={{ top: (m - OPENING_MIN) * PX_PER_MIN, height: SLOT_PX }}
                    />
                  );
                })}

                {/* Blocs de réservation */}
                {dayBookings.map((b) => {
                  const { top, height } = blockGeometry(b, iso);
                  const cfg = BOOKING_TYPES[b.type];
                  const draggable = canDrag(b);
                  return (
                    <button
                      key={`${iso}-${b.id}`}
                      type="button"
                      draggable={draggable}
                      onDragStart={(e) => {
                        setDragId(b.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropTarget(null);
                      }}
                      onClick={() => onSelect(b)}
                      title={[
                        b.client,
                        cfg.label,
                        b.startTime ? `${hm(b.startTime)} – ${hm(b.endTime ?? "")}` : "Journée",
                        draggable ? "(glisser pour déplacer)" : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      className={[
                        "absolute inset-x-0.5 z-10 overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] font-semibold text-white transition-opacity",
                        draggable ? "cursor-grab active:cursor-grabbing" : "",
                        b.status === "cancelled" ? "opacity-40 line-through" : "hover:opacity-85",
                        dragId === b.id ? "opacity-40" : "",
                      ].join(" ")}
                      style={{
                        top,
                        height,
                        backgroundColor: typeBg(b.type),
                        borderLeftColor: cfg.color,
                      }}
                    >
                      <span className="block truncate">
                        {(b.balanceDue ?? 0) > 0 ? "🟠 " : ""}
                        {b.client}
                      </span>
                      {height >= 34 && (
                        <span className="block truncate text-[10px] font-normal opacity-80">
                          {b.startTime ? `${hm(b.startTime)} – ${hm(b.endTime ?? "")}` : "Journée"} · {cfg.icon} {cfg.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t border-white/5 px-3 py-2 text-[11px] text-muted-foreground">
        💡 Double-clic sur une case vide : nouvelle réservation à cette heure · Glissez un
        bloc vers un autre jour/heure pour le déplacer (durée conservée).
      </p>
    </div>
  );
}
