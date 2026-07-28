// lib/types.ts
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

// ============================================
// GALLERY - Gestion des images
// ============================================
export interface GalleryImage {
  id: string;
  imageUrl: string;
  alt: string;
  sortOrder: number;
  eventId: string | null;
  event?: {
    id: string;
    firstName: string;
    lastName: string;
    type: string;
  } | null;
  createdAt: string;
}

// ============================================
// MEDIA - Gestion des vidéos et audios
// ============================================
export interface MediaItem {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'photo' | 'audio';
  thumbnail: string | null;
  duration: string | null;
  description: string | null;
  isFeatured: boolean;
  eventId: string | null;
  event?: {
    id: string;
    firstName: string;
    lastName: string;
    type: string;
  } | null;
  createdAt: string;
  updatedAt: string;
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
  created_at?: string;
}

export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export interface Reservation {
  id: string;
  userId: string | null;
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
  media: MediaItem[];
  gallery: GalleryImage[];
}

export interface BlockedSlot {
  id: string;
  date: string;
  hour: number;
  blocked: boolean;
  reason: string | null;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  unit: string;
  features: string[];
  highlighted: boolean;
  sortOrder: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  audience: "all" | "clients" | "admins";
  sentById: string | null;
  sentAt: string;
}

export type SlotState = "free" | "taken" | "blocked" | "past";

export interface Slot {
  hour: number;
  label: string;
  state: SlotState;
}

export interface Stat {
  id: string;
  key: string;
  value: number;
  label: string;
  suffix: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  userId: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  author: string;
  role: string;
  rating: number;
  text: string;
  avatar: string;
  approved?: boolean;
  createdAt?: string;
}

// ============================================
// GALLERY & MEDIA SPECIFIC TYPES
// ============================================

export interface CreateGalleryImage {
  imageUrl: string;
  alt: string;
  eventId?: string | null;
}

export interface UpdateGalleryImage {
  alt?: string;
  sortOrder?: number;
  eventId?: string | null;
}

export interface CreateMediaItem {
  title: string;
  url: string;
  type: 'video' | 'photo' | 'audio';
  thumbnail?: string | null;
  duration?: string | null;
  description?: string | null;
  isFeatured?: boolean;
  eventId?: string | null;
}

export interface UpdateMediaItem {
  title?: string;
  url?: string;
  type?: 'video' | 'photo' | 'audio';
  thumbnail?: string | null;
  duration?: string | null;
  description?: string | null;
  isFeatured?: boolean;
  eventId?: string | null;
}