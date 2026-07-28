// lib/api.ts
"use client";

import { supabase } from "./supabase";
import { useAppStore } from "./store";
import { HOURS, slotLabel, toISODate } from "./utils";
import type { Slot, EventType, GalleryImage, MediaItem, Reservation } from "./types";

// ============================================
// SLOTS - Récupération des créneaux disponibles
// ============================================

export async function fetchSlots(date: Date): Promise<Slot[]> {
  const { reservations, blocked } = useAppStore.getState();
  const iso = toISODate(date);
  const now = new Date();

  // Récupérer toutes les réservations pour la date
  const dayReservations = reservations.filter(
    (r) => r.date === iso && r.status !== "cancelled"
  );

  const dayBlocks = blocked.filter(
    (b) => b.date === iso
  );

  return HOURS.map((hour) => {
    const isPast = 
      (date.toDateString() === now.toDateString() && hour <= now.getHours()) ||
      date < new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isReserved = dayReservations.some((r) => r.hour === hour);
    const isBlocked = dayBlocks.some((b) => b.hour === hour);

    let state: Slot["state"] = "free";
    if (isPast) state = "past";
    else if (isBlocked) state = "blocked";
    else if (isReserved) state = "taken";

    return { hour, label: slotLabel(hour), state };
  });
}

// ============================================
// RÉSERVATIONS
// ============================================

export async function createReservation(input: {
  date: string;
  hour: number;
  price: number;
  userName: string;
  userEmail: string;
  userPhone: string;
}) {
  // Vérifier si le créneau est déjà réservé
  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('date', input.date)
    .eq('hour', input.hour)
    .neq('status', 'cancelled');

  if (existing && existing.length > 0) {
    throw new Error('Ce créneau est déjà réservé');
  }

  // Créer la réservation avec userId null (car pas d'utilisateur connecté)
  const reservation = await useAppStore.getState().addReservation({
    userId: null, // Ajouter userId null
    userName: input.userName,
    userEmail: input.userEmail,
    userPhone: input.userPhone,
    date: input.date,
    hour: input.hour,
    price: input.price,
  });
  
  await supabase.channel('reservations-changes').send({
    type: 'broadcast',
    event: 'new_reservation',
    payload: reservation
  });

  return reservation;
}

// ============================================
// ÉVÉNEMENTS PRIVÉS
// ============================================

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
}) {
  const event = await useAppStore.getState().addEvent(input);
  
  await supabase.channel('events-changes').send({
    type: 'broadcast',
    event: 'new_event',
    payload: event
  });

  return event;
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