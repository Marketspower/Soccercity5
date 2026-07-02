"use client";

/**
 * Store applicatif (Zustand + persistance localStorage).
 *
 * En mode démo, ce store joue le rôle du backend : il détient les
 * réservations, événements, terrains et créneaux bloqués. La couche
 * d'accès (lib/api.ts) expose des fonctions asynchrones consommées
 * par TanStack Query — remplacer leur corps par des appels Supabase
 * suffit pour passer en production, sans toucher aux composants.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BlockedSlot, Field, PrivateEvent, Reservation, AppNotification } from "./types";
import { FIELDS } from "./data";
import { uid } from "./utils";

interface AppState {
  fields: Field[];
  reservations: Reservation[];
  events: PrivateEvent[];
  blocked: BlockedSlot[];
  notifications: AppNotification[];

  // Terrains
  addField: (f: Omit<Field, "id">) => void;
  updateField: (id: string, patch: Partial<Field>) => void;
  removeField: (id: string) => void;

  // Réservations
  addReservation: (r: Omit<Reservation, "id" | "createdAt" | "status">) => Reservation;
  setReservationStatus: (id: string, status: Reservation["status"]) => void;

  // Événements privés
  addEvent: (e: Omit<PrivateEvent, "id" | "createdAt" | "status">) => void;
  setEventStatus: (id: string, status: PrivateEvent["status"]) => void;

  // Disponibilités
  blockSlot: (fieldId: string, date: string, hour: number, reason: string) => void;
  unblockSlot: (id: string) => void;

  // Notifications
  sendNotification: (n: Omit<AppNotification, "id" | "sentAt">) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      fields: FIELDS,
      reservations: [],
      events: [],
      blocked: [],
      notifications: [],

      addField: (f) => set((s) => ({ fields: [...s.fields, { ...f, id: uid() }] })),
      updateField: (id, patch) =>
        set((s) => ({ fields: s.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      removeField: (id) => set((s) => ({ fields: s.fields.filter((f) => f.id !== id) })),

      addReservation: (r) => {
        const res: Reservation = { ...r, id: uid(), status: "confirmed", createdAt: new Date().toISOString() };
        set((s) => ({ reservations: [res, ...s.reservations] }));
        return res;
      },
      setReservationStatus: (id, status) =>
        set((s) => ({ reservations: s.reservations.map((r) => (r.id === id ? { ...r, status } : r)) })),

      addEvent: (e) =>
        set((s) => ({
          events: [{ ...e, id: uid(), status: "new", createdAt: new Date().toISOString() }, ...s.events],
        })),
      setEventStatus: (id, status) =>
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, status } : e)) })),

      blockSlot: (fieldId, date, hour, reason) =>
        set((s) => ({ blocked: [...s.blocked, { id: uid(), fieldId, date, hour, reason }] })),
      unblockSlot: (id) => set((s) => ({ blocked: s.blocked.filter((b) => b.id !== id) })),

      sendNotification: (n) =>
        set((s) => ({ notifications: [{ ...n, id: uid(), sentAt: new Date().toISOString() }, ...s.notifications] })),
    }),
    { name: "soccer-city-store" }
  )
);
