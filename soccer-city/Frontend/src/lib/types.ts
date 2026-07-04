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
  dimensions: string;
  turf: TurfType;
  lighting: boolean;
  lockerRooms: number;
  parking: boolean;
  players: string;
  pricePerHour: number;
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
  date: string;
  hour: number;
  price: number;
  status: ReservationStatus;
  createdAt: string;
}

export type EventType = "Anniversaire" | "Tournoi" | "Entreprise" | "École" | "Événement privé" | "Compétition";

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
  rating: number;
  text: string;
  avatar: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  audience: "all" | "clients" | "admins";
  sentAt: string;
}

export type SlotState = "free" | "taken" | "blocked" | "past";

export interface Slot {
  hour: number;
  label: string;
  state: SlotState;
}