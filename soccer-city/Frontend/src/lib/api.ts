// lib/api.ts
"use client";

import { supabase } from "./supabase";
import { useAppStore } from "./store";
import { toISODate } from "./utils";
import type { EventType, GalleryImage, MediaItem } from "./types";

// ============================================
// CRÉNEAUX RÉSERVÉS/BLOQUÉS — pour vérifier les chevauchements
// ============================================

export async function fetchBookedRanges(
  date: Date
): Promise<{ startTime: string; endTime: string }[]> {
  const iso = toISODate(date);

  const { data: reservationsData, error: reservationsError } = await supabase
    .from("reservations")
    .select("start_time, end_time")
    .eq("date", iso)
    .neq("status", "cancelled");

  if (reservationsError) {
    console.error("❌ Erreur fetchBookedRanges (reservations):", reservationsError);
  }

  const { data: blockedData, error: blockedError } = await supabase
    .from("availability")
    .select("start_time, end_time")
    .eq("date", iso);

  if (blockedError) {
    console.error("❌ Erreur fetchBookedRanges (availability):", blockedError);
  }

  const reservationRanges = (reservationsData || []).map((r) => ({
    startTime: r.start_time as string,
    endTime: r.end_time as string,
  }));
  const blockedRanges = (blockedData || []).map((b) => ({
    startTime: b.start_time as string,
    endTime: b.end_time as string,
  }));

  return [...reservationRanges, ...blockedRanges];
}

// ============================================
// RÉSERVATIONS
// ============================================

export async function createReservation(input: {
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  userName: string;
  userEmail: string;
  userPhone: string;
}) {
  // Vérifier qu'aucune réservation existante ne chevauche ce créneau
  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('date', input.date)
    .neq('status', 'cancelled')
    .lt('start_time', input.endTime)
    .gt('end_time', input.startTime);

  if (existing && existing.length > 0) {
    throw new Error('Ce créneau chevauche une réservation existante');
  }

  const reservation = await useAppStore.getState().addReservation({
    userName: input.userName,
    userEmail: input.userEmail,
    userPhone: input.userPhone,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
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