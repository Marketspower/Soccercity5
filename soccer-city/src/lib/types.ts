/**
 * Types du domaine Soccer City.
 * Miroir 1:1 du schéma SQL (voir /supabase/schema.sql) pour un
 * branchement Supabase sans refactoring.
 */

export type Role = "client" | "admin";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  createdAt: string;
}

export type TurfType = "Gazon synthétique 5G" | "Gazon synthétique hybride" | "Gazon naturel";

export interface Field {
  id: string;
  name: string;
  slug: string;
  image: string;
  dimensions: string; // ex: "40 × 20 m"
  turf: TurfType;
  lighting: boolean;
  lockerRooms: number;
  parking: boolean;
  players: string; // ex: "5 vs 5"
  pricePerHour: number; // CAD
  indoor: boolean;
  active: boolean;
}

export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export interface Reservation {
  id: string;
  fieldId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  date: string; // yyyy-MM-dd
  hour: number; // début du bloc d'1 h (ex: 8 → 08:00-09:00)
  price: number;
  status: ReservationStatus;
  createdAt: string;
}

export type EventType =
  | "Anniversaire"
  | "Tournoi"
  | "Entreprise"
  | "École"
  | "Événement privé"
  | "Compétition";

export type EventStatus = "new" | "accepted" | "declined";

export interface PrivateEvent {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone: string;
  email: string;
  date: string;
  guests: number;
  type: EventType;
  message: string;
  status: EventStatus;
  createdAt: string;
}

/** Créneau bloqué manuellement par l'administration (entretien, ligue…). */
export interface BlockedSlot {
  id: string;
  fieldId: string;
  date: string;
  hour: number;
  reason: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  unit: string;
  features: string[];
  highlighted: boolean;
}

export interface Review {
  id: string;
  author: string;
  role: string;
  rating: number; // 1..5
  text: string;
  avatar: string; // initiales
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  audience: "all" | "clients" | "admins";
  sentAt: string;
}

/** État d'un créneau côté interface de réservation. */
export type SlotState = "free" | "taken" | "blocked" | "past";

export interface Slot {
  hour: number;
  label: string; // "08:00 - 09:00"
  state: SlotState;
}
