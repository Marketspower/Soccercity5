"use client";

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

export function useRealtime() {
  const { 
    syncFields, 
    syncReservations, 
    syncEvents, 
    syncBlocked 
  } = useAppStore();

  useEffect(() => {
    // Écouter les changements sur les réservations
    const reservationsChannel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'reservations' 
        },
        () => {
          syncReservations();
        }
      )
      .subscribe();

    // Écouter les changements sur les événements
    const eventsChannel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'private_events' 
        },
        () => {
          syncEvents();
        }
      )
      .subscribe();

    // Écouter les changements sur les blocages
    const availabilityChannel = supabase
      .channel('availability-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'availability' 
        },
        () => {
          syncBlocked();
        }
      )
      .subscribe();

    // Écouter les changements sur les terrains
    const fieldsChannel = supabase
      .channel('fields-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'fields' 
        },
        () => {
          syncFields();
        }
      )
      .subscribe();

    // Nettoyage
    return () => {
      reservationsChannel.unsubscribe();
      eventsChannel.unsubscribe();
      availabilityChannel.unsubscribe();
      fieldsChannel.unsubscribe();
    };
  }, [syncFields, syncReservations, syncEvents, syncBlocked]);
}