// lib/api.ts
"use client";

import { supabase } from "./supabase";
import { useAppStore } from "./store";
import { toISODate } from "./utils";
import type { EventType, GalleryImage, MediaItem } from "./types";

// ============================================
// CRÉNEAUX OCCUPÉS — lecture via la vue busy_slots (aucune donnée client)
// ============================================

interface BusyRow {
  field_id?: string | null;
  date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
}

/**
 * Plages occupées (réservations + blocages) qui touchent [fromDate, toDate].
 * @param fieldId  terrain concerné : seules ses réservations et celles qui
 *                 privatisent le complexe (field_id vide) comptent.
 *                 Sans fieldId : toutes les réservations (événements, anniversaires).
 */
async function fetchBusyRows(fromDate: string, toDate: string, fieldId?: string | null): Promise<BusyRow[]> {
  const base = () =>
    supabase
      .from("busy_slots")
      .select("*")
      .lte("date", toDate)
      .gte("end_date", fromDate);

  let reservations: BusyRow[] = [];
  const filtered = fieldId ? base().or(`field_id.eq.${fieldId},field_id.is.null`) : base();
  const { data, error } = await filtered;
  if (error && fieldId) {
    // Ancienne vue sans field_id (migration SQL non exécutée) : repli prudent.
    const { data: all, error: err2 } = await base();
    if (err2) console.error("❌ Erreur créneaux occupés:", err2);
    reservations = (all || []) as BusyRow[];
  } else {
    if (error) console.error("❌ Erreur créneaux occupés:", error);
    reservations = (data || []) as BusyRow[];
  }

  const lower = new Date(`${fromDate}T12:00:00Z`);
  lower.setUTCDate(lower.getUTCDate() - 62);
  const { data: blockedData, error: blockedError } = await supabase
    .from("availability")
    .select("*")
    .lte("date", toDate)
    .gte("date", lower.toISOString().slice(0, 10));
  if (blockedError) console.error("❌ Erreur blocages:", blockedError);

  const blocked = ((blockedData || []) as any[])
    .filter((b) => b.blocked !== false)
    .filter((b) => !fieldId || !b.field_id || b.field_id === fieldId)
    .map((b) => ({ date: b.date, end_date: b.end_date || b.date, start_time: b.start_time, end_time: b.end_time }))
    .filter((b) => b.end_date >= fromDate);

  return [...reservations, ...blocked];
}

const hhmm = (t: string) => String(t).slice(0, 5);

/** Plages occupées sur UNE journée (une réservation de plusieurs jours est découpée). */
export async function fetchBookedRanges(
  date: Date,
  fieldId?: string | null
): Promise<{ startTime: string; endTime: string }[]> {
  const iso = toISODate(date);
  const rows = await fetchBusyRows(iso, iso, fieldId);
  return rows.map((r) => ({
    startTime: r.date < iso ? "00:00" : hhmm(r.start_time),
    endTime: (r.end_date || r.date) > iso ? "24:00" : hhmm(r.end_time),
  }));
}

// ============================================
// CRÉNEAUX HORAIRES (grille de réservation)
// ============================================

export type SlotState = "free" | "taken" | "blocked";

export interface Slot {
  hour: number;
  label: string;
  state: SlotState;
}

const OPENING_HOUR = 8;   // 8 h
const CLOSING_HOUR = 23;  // dernier créneau : 22 h – 23 h

export async function fetchSlots(date: Date, fieldId?: string | null): Promise<Slot[]> {
  const ranges = await fetchBookedRanges(date, fieldId);
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const taken = ranges.map((r) => ({ start: toMinutes(r.startTime), end: toMinutes(r.endTime) }));

  const slots: Slot[] = [];
  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
    const start = hour * 60;
    const end = start + 60;
    const busy = taken.some((r) => r.start < end && r.end > start);
    slots.push({ hour, label: `${hour} h – ${hour + 1} h`, state: busy ? "taken" : "free" });
  }
  return slots;
}

// ============================================
// Plages réservées/bloquées sur plusieurs jours
// ============================================

export interface BookedSpan {
  date: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export async function fetchBookedSpans(
  fromDate: string,
  toDate: string,
  fieldId?: string | null
): Promise<BookedSpan[]> {
  const rows = await fetchBusyRows(fromDate, toDate, fieldId);
  return rows.map((r) => ({
    date: r.date,
    startTime: hhmm(r.start_time),
    endDate: r.end_date || r.date,
    endTime: hhmm(r.end_time),
  }));
}

// Les clients réservent UNIQUEMENT via le paiement Stripe (/api/checkout) :
// plus aucune création de réservation directe depuis le navigateur.

// ============================================
// ÉVÉNEMENTS PRIVÉS
// ============================================

// ✅ Passe maintenant par une route API serveur : insertion via service_role
// (plus fiable que le client) + déclenche courriels et SMS (client + admin).
export async function createPrivateEvent(input: {
  firstName: string;
  lastName: string;
  company?: string;
  phone: string;
  email: string;
  date: string;
  guests: number;
  type: EventType;
  message: string;
  /** Champ piège anti-robot (doit rester vide). */
  website?: string;
}) {
  const res = await fetch("/api/event-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi de la demande");

  return data;
}

// ============================================
// GALLERY API
// ============================================

export async function addGalleryImage(data: {
  imageUrl: string;
  alt: string;
  eventId?: string | null;
}): Promise<GalleryImage> {
  const result = await useAppStore.getState().addGalleryImage(data);
  return result;
}

export async function updateGalleryImage(
  id: string,
  data: Partial<GalleryImage>
): Promise<GalleryImage> {
  const result = await useAppStore.getState().updateGalleryImage(id, data);
  return result;
}

export async function deleteGalleryImage(id: string): Promise<void> {
  await useAppStore.getState().deleteGalleryImage(id);
}

export async function reorderGalleryImages(ids: string[]): Promise<GalleryImage[]> {
  const result = await useAppStore.getState().reorderGalleryImages(ids);
  return result;
}

// ============================================
// MEDIA API
// ============================================

export async function addMediaItem(data: {
  title: string;
  url: string;
  type: 'video' | 'photo' | 'audio';
  thumbnail?: string;
  duration?: string;
  description?: string;
  isFeatured?: boolean;
  eventId?: string | null;
}): Promise<MediaItem> {
  const result = await useAppStore.getState().addMediaItem(data);
  return result;
}

export async function updateMediaItem(
  id: string,
  data: Partial<MediaItem>
): Promise<MediaItem> {
  const result = await useAppStore.getState().updateMediaItem(id, data);
  return result;
}

export async function deleteMediaItem(id: string): Promise<void> {
  await useAppStore.getState().deleteMediaItem(id);
}