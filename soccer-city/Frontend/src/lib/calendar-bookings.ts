// lib/calendar-bookings.ts
// Fusionne les réservations de terrain (Reservation) et les événements privés
// (PrivateEvent) en un type unifié pour le calendrier/liste admin.

import type { PrivateEvent, Reservation, ReservationStatus } from "@/lib/types";
import type { BookingTypeKey } from "@/config/reservation-types";

export interface CalendarBooking {
  /** Identifiant unique côté UI (préfixé pour éviter les collisions entre tables). */
  id: string;
  /** Table d'origine — détermine l'action de statut à appeler. */
  source: "reservation" | "event";
  /** Id réel dans la table d'origine. */
  refId: string;
  date: string;             // YYYY-MM-DD
  endDate: string | null;   // multi-jours si renseigné et ≠ date
  startTime: string | null; // null pour un événement (journée)
  endTime: string | null;
  client: string;
  phone: string;
  email: string;
  company: string | null;
  type: BookingTypeKey;
  /** Statut unifié : new→pending, accepted→confirmed, declined→cancelled. */
  status: ReservationStatus;
  price: number | null;
  taxGst: number | null;
  taxQst: number | null;
  total: number | null;
  guests: number | null;
  message: string | null;
  createdAt: string;
}

const EVENT_TO_UNIFIED: Record<PrivateEvent["status"], ReservationStatus> = {
  new: "pending",
  accepted: "confirmed",
  declined: "cancelled",
};

export const UNIFIED_TO_EVENT: Record<ReservationStatus, PrivateEvent["status"]> = {
  pending: "new",
  confirmed: "accepted",
  cancelled: "declined",
};

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
};

export function buildCalendarBookings(
  reservations: Reservation[],
  events: PrivateEvent[]
): CalendarBooking[] {
  const fromReservations: CalendarBooking[] = reservations.map((r) => ({
    id: `res-${r.id}`,
    source: "reservation",
    refId: r.id,
    date: r.date,
    endDate: r.endDate && r.endDate !== r.date ? r.endDate : null,
    startTime: r.startTime,
    endTime: r.endTime,
    client: r.userName,
    phone: r.userPhone,
    email: r.userEmail,
    company: null,
    type: "Terrain",
    status: r.status,
    price: r.price,
    taxGst: r.taxGst ?? null,
    taxQst: r.taxQst ?? null,
    total: r.total ?? null,
    guests: null,
    message: null,
    createdAt: r.createdAt,
  }));

  const fromEvents: CalendarBooking[] = events.map((e) => ({
    id: `evt-${e.id}`,
    source: "event",
    refId: e.id,
    date: e.date,
    endDate: null,
    startTime: null,
    endTime: null,
    client: `${e.firstName} ${e.lastName}`.trim(),
    phone: e.phone,
    email: e.email,
    company: e.company ?? null,
    type: e.type,
    status: EVENT_TO_UNIFIED[e.status],
    price: null,
    taxGst: null,
    taxQst: null,
    total: null,
    guests: e.guests,
    message: e.message || null,
    createdAt: e.createdAt,
  }));

  return [...fromReservations, ...fromEvents];
}

export function isMultiDay(b: CalendarBooking): boolean {
  return !!b.endDate && b.endDate !== b.date;
}

/** "YYYY-MM-DD" → Date locale (évite le décalage UTC de new Date("YYYY-MM-DD")). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Jours couverts par la réservation (multi-jours étalé, plafonné à 31 jours). */
export function bookingDays(b: CalendarBooking): string[] {
  if (!isMultiDay(b)) return [b.date];
  const days: string[] = [];
  const cursor = parseISODate(b.date);
  const end = parseISODate(b.endDate as string);
  while (cursor.getTime() <= end.getTime() && days.length < 31) {
    days.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.length ? days : [b.date];
}

/** Libellé horaire : créneau pour un terrain, "Journée" pour un événement. */
export function timeLabel(b: CalendarBooking): string {
  if (!b.startTime) return "Journée";
  if (isMultiDay(b)) return `${b.startTime} → ${b.endTime}`;
  return `${b.startTime} – ${b.endTime}`;
}
