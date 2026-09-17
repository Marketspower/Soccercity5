// app/admin/reservations/page.tsx
// Module Calendrier des réservations (cahier des charges v1.0)
// Vue calendrier mensuel + vue liste, filtres cumulables, fiche détail.
// Fusionne les réservations de terrain et les événements privés (visualisation
// et gestion des statuts uniquement — la création se fait côté site client).
"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { BOOKING_TYPES, BOOKING_TYPE_KEYS, type BookingTypeKey } from "@/config/reservation-types";
import {
  buildCalendarBookings,
  parseISODate,
  UNIFIED_TO_EVENT,
  type CalendarBooking,
} from "@/lib/calendar-bookings";
import { CalendarMonth } from "@/components/admin/calendar/calendar-month";
import { BookingList } from "@/components/admin/calendar/booking-list";
import { BookingDrawer } from "@/components/admin/calendar/booking-drawer";
import type { ReservationStatus } from "@/lib/types";

type ViewMode = "calendar" | "list";

export default function AdminReservations() {
  const {
    reservations,
    events,
    setReservationStatus,
    setEventStatus,
    loadInitialData,
    isInitialized,
  } = useAppStore();

  // Sécurité : si la page est ouverte directement, on charge les données.
  useEffect(() => {
    if (!isInitialized) loadInitialData();
  }, [isInitialized, loadInitialData]);

  /* ===== État des filtres / vues ===== */
  const [view, setView] = useState<ViewMode>("calendar");
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ReservationStatus>("");
  const [activeTypes, setActiveTypes] = useState<Set<BookingTypeKey>>(
    () => new Set(BOOKING_TYPE_KEYS)
  );
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ===== Données unifiées + filtrage ===== */
  const allBookings = useMemo(
    () => buildCalendarBookings(reservations, events),
    [reservations, events]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return allBookings.filter((b) => {
      if (!activeTypes.has(b.type)) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      if (dayFilter && b.date !== dayFilter && b.endDate !== dayFilter) {
        // multi-jours : garder si le jour filtré est couvert
        if (!b.endDate || dayFilter < b.date || dayFilter > b.endDate) return false;
      }
      if (!q) return true;
      return (
        b.client.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        (qDigits.length > 0 && b.phone.replace(/\D/g, "").includes(qDigits))
      );
    });
  }, [allBookings, activeTypes, statusFilter, dayFilter, query]);

  const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
  const monthBookings = useMemo(
    () => filtered.filter((b) => b.date.startsWith(monthKey) || (b.endDate ?? "").startsWith(monthKey)),
    [filtered, monthKey]
  );

  const listBookings = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        a.date === b.date
          ? (a.startTime ?? "").localeCompare(b.startTime ?? "")
          : a.date.localeCompare(b.date)
      ),
    [filtered]
  );

  const typeCounts = useMemo(() => {
    const counts = new Map<BookingTypeKey, number>();
    for (const b of allBookings) {
      if (b.date.startsWith(monthKey)) counts.set(b.type, (counts.get(b.type) ?? 0) + 1);
    }
    return counts;
  }, [allBookings, monthKey]);

  const selected = selectedId ? allBookings.find((b) => b.id === selectedId) ?? null : null;

  /* ===== Actions ===== */
  const handleSetStatus = async (b: CalendarBooking, status: ReservationStatus) => {
    if (b.source === "reservation") {
      await setReservationStatus(b.refId, status);
    } else {
      await setEventStatus(b.refId, UNIFIED_TO_EVENT[status]);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("");
    setActiveTypes(new Set(BOOKING_TYPE_KEYS));
    setDayFilter(null);
  };

  const toggleType = (key: BookingTypeKey) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const goMonth = (delta: number) =>
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  const goToday = () => {
    const now = new Date();
    setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  /* ===== Raccourcis clavier : ← → mois, T aujourd'hui ===== */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, select, textarea")) return;
      if (view !== "calendar" || selectedId) return;
      if (e.key === "ArrowLeft")
        setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
      if (e.key === "ArrowRight")
        setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
      if (e.key === "t" || e.key === "T") {
        const now = new Date();
        setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, selectedId]);

  const shownCount = view === "calendar" ? monthBookings.length : listBookings.length;

  return (
    <div className="space-y-5 p-6">
      {/* ===== Entête ===== */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Réservations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {shownCount} réservation(s) {view === "calendar" ? "ce mois-ci" : "affichée(s)"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {view === "calendar" && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => goMonth(-1)} title="Mois précédent (←)">
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[150px] text-center text-sm font-bold capitalize">
                {monthDate.toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}
              </span>
              <Button variant="outline" size="icon" onClick={() => goMonth(1)} title="Mois suivant (→)">
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="ghost" onClick={goToday} title="Raccourci : T">
                Aujourd&apos;hui
              </Button>
            </div>
          )}

          <div className="flex overflow-hidden rounded-lg border">
            <button
              type="button"
              onClick={() => {
                setDayFilter(null);
                setView("calendar");
              }}
              className={[
                "flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors",
                view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <CalendarDays className="size-4" /> Calendrier
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={[
                "flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors",
                view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <List className="size-4" /> Liste
            </button>
          </div>
        </div>
      </header>

      {/* ===== Barre d'outils ===== */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border bg-card/60 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un client, un téléphone, un courriel…"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="w-44"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmée</option>
          <option value="cancelled">Annulée</option>
        </Select>
        <Button variant="ghost" onClick={resetFilters}>
          <RotateCcw className="mr-1.5 size-4" /> Réinitialiser
        </Button>
      </div>

      {/* ===== Légende cliquable (filtre par type, compteur du mois) ===== */}
      <div className="flex flex-wrap gap-2">
        {BOOKING_TYPE_KEYS.map((key) => {
          const cfg = BOOKING_TYPES[key];
          const on = activeTypes.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleType(key)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                on ? "" : "opacity-40 line-through",
              ].join(" ")}
              style={
                on
                  ? { backgroundColor: `${cfg.color}1f`, borderColor: `${cfg.color}66`, color: cfg.color }
                  : undefined
              }
              title={`${on ? "Masquer" : "Afficher"} : ${cfg.label}`}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.icon} {cfg.label}
              <span className="rounded-full bg-white/10 px-1.5 text-[10px]">
                {typeCounts.get(key) ?? 0}
              </span>
            </button>
          );
        })}

        {dayFilter && (
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
            Jour :{" "}
            {parseISODate(dayFilter).toLocaleDateString("fr-CA", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            <button type="button" onClick={() => setDayFilter(null)} title="Retirer le filtre jour">
              <X className="size-3.5" />
            </button>
          </span>
        )}
      </div>

      {/* ===== Vues ===== */}
      {view === "calendar" ? (
        <CalendarMonth
          monthDate={monthDate}
          bookings={monthBookings}
          onSelect={(b) => setSelectedId(b.id)}
          onShowDay={(iso) => {
            setDayFilter(iso);
            setView("list");
          }}
        />
      ) : (
        <BookingList
          bookings={listBookings}
          onSelect={(b) => setSelectedId(b.id)}
          onSetStatus={handleSetStatus}
        />
      )}

      {/* ===== Fiche détail ===== */}
      <BookingDrawer
        booking={selected}
        onClose={() => setSelectedId(null)}
        onSetStatus={handleSetStatus}
      />
    </div>
  );
}
