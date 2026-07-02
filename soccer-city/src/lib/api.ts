"use client";

/**
 * Couche d'accès aux données, consommée via TanStack Query.
 * ➜ Point de branchement Supabase : remplacer le corps de ces
 *   fonctions par les requêtes `supabase.from(...)` équivalentes.
 */

import { isBefore, isToday, startOfDay } from "date-fns";
import { useAppStore } from "./store";
import { HOURS, seededRandom, slotLabel, toISODate } from "./utils";
import type { Slot } from "./types";

/** Petite latence simulée pour des transitions réalistes. */
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/**
 * Calcule les créneaux d'une journée pour un terrain.
 * Un créneau est indisponible s'il est : réservé, bloqué par l'admin,
 * passé, ou pris dans le « planning existant » simulé (déterministe).
 */
export async function fetchSlots(fieldId: string, date: Date): Promise<Slot[]> {
  await delay();
  const { reservations, blocked } = useAppStore.getState();
  const iso = toISODate(date);
  const now = new Date();

  // Occupation simulée stable (≈ 35 % des créneaux), identique à chaque rendu.
  const rand = seededRandom(`${fieldId}-${iso}`);
  const simulatedTaken = new Set(HOURS.filter(() => rand() < 0.35));

  return HOURS.map((hour) => {
    const isPast =
      isBefore(startOfDay(date), startOfDay(now)) || (isToday(date) && hour <= now.getHours());
    const isReserved = reservations.some(
      (r) => r.fieldId === fieldId && r.date === iso && r.hour === hour && r.status !== "cancelled"
    );
    const isBlocked = blocked.some((b) => b.fieldId === fieldId && b.date === iso && b.hour === hour);

    let state: Slot["state"] = "free";
    if (isPast) state = "past";
    else if (isBlocked) state = "blocked";
    else if (isReserved || simulatedTaken.has(hour)) state = "taken";

    return { hour, label: slotLabel(hour), state };
  });
}

export async function createReservation(input: {
  fieldId: string;
  date: string;
  hour: number;
  price: number;
  userName: string;
  userEmail: string;
  userPhone: string;
}) {
  await delay(500);
  return useAppStore.getState().addReservation(input);
}

export async function createPrivateEvent(input: Parameters<ReturnType<typeof useAppStore.getState>["addEvent"]>[0]) {
  await delay(600);
  useAppStore.getState().addEvent(input);
  return { ok: true };
}
