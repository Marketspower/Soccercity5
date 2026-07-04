"use client";

import { supabase } from "./supabase";
import { useAppStore } from "./store";
import { HOURS, slotLabel, toISODate } from "./utils";
import type { Slot, EventType } from "./types";

export async function fetchSlots(fieldId: string, date: Date): Promise<Slot[]> {
  const { reservations, blocked } = useAppStore.getState();
  const iso = toISODate(date);
  const now = new Date();

  const fieldReservations = reservations.filter(
    (r) => r.fieldId === fieldId && r.date === iso && r.status !== "cancelled"
  );

  const fieldBlocks = blocked.filter(
    (b) => b.fieldId === fieldId && b.date === iso
  );

  return HOURS.map((hour) => {
    const isPast = 
      (date.toDateString() === now.toDateString() && hour <= now.getHours()) ||
      date < new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isReserved = fieldReservations.some((r) => r.hour === hour);
    const isBlocked = fieldBlocks.some((b) => b.hour === hour);

    let state: Slot["state"] = "free";
    if (isPast) state = "past";
    else if (isBlocked) state = "blocked";
    else if (isReserved) state = "taken";

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
  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .eq('field_id', input.fieldId)
    .eq('date', input.date)
    .eq('hour', input.hour)
    .neq('status', 'cancelled');

  if (existing && existing.length > 0) {
    throw new Error('Ce créneau est déjà réservé');
  }

  const reservation = await useAppStore.getState().addReservation(input);
  
  await supabase.channel('reservations-changes').send({
    type: 'broadcast',
    event: 'new_reservation',
    payload: reservation
  });

  return reservation;
}

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