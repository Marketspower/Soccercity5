"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "./supabase";
import type { 
  Field, 
  Reservation, 
  PrivateEvent, 
  BlockedSlot, 
  AppNotification, 
  ReservationStatus, 
  EventStatus,
  PricingPlan
} from "./types";
import { FIELDS, PRICING } from "./data";
import { uid } from "./utils";

interface AppState {
  // État
  fields: Field[];
  reservations: Reservation[];
  events: PrivateEvent[];
  blocked: BlockedSlot[];
  notifications: AppNotification[];
  pricing: PricingPlan[];
  isLoading: boolean;
  isInitialized: boolean;
  uploading: boolean;
  error: string | null;

  // Initialisation
  loadInitialData: () => Promise<void>;

  // Synchronisation
  syncFields: () => Promise<void>;
  syncReservations: () => Promise<void>;
  syncEvents: () => Promise<void>;
  syncBlocked: () => Promise<void>;
  syncPricing: () => Promise<void>;

  // Terrains
  addField: (f: Omit<Field, "id">) => Promise<Field>;
  updateField: (id: string, patch: Partial<Field>) => Promise<Field>;
  removeField: (id: string) => Promise<void>;

  // Upload d'images
  uploadFieldImage: (file: File) => Promise<string>;

  // Réservations
  addReservation: (r: Omit<Reservation, "id" | "createdAt" | "status">) => Reservation;
  setReservationStatus: (id: string, status: ReservationStatus) => Promise<void>;

  // Événements
  addEvent: (e: Omit<PrivateEvent, "id" | "createdAt" | "status">) => PrivateEvent;
  setEventStatus: (id: string, status: EventStatus) => Promise<void>;

  // Disponibilités
  blockSlot: (fieldId: string, date: string, hour: number, reason: string) => Promise<BlockedSlot>;
  unblockSlot: (id: string) => Promise<void>;

  // Notifications
  sendNotification: (n: Omit<AppNotification, "id" | "sentAt">) => Promise<AppNotification>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- État initial ---
      fields: FIELDS,
      reservations: [],
      events: [],
      blocked: [],
      notifications: [],
      pricing: PRICING,
      isLoading: false,
      isInitialized: false,
      uploading: false,
      error: null,

      // --- Initialisation ---
      loadInitialData: async () => {
        if (get().isInitialized) return;
        
        set({ isLoading: true, error: null });
        
        try {
          const [fieldsRes, reservationsRes, eventsRes, blockedRes, pricingRes] = await Promise.all([
            fetch(`${API_BASE}/fields`).then(r => r.json()).catch(() => []),
            fetch(`${API_BASE}/reservations`).then(r => r.json()).catch(() => []),
            fetch(`${API_BASE}/events`).then(r => r.json()).catch(() => []),
            fetch(`${API_BASE}/admin/availability`).then(r => r.json()).catch(() => []),
            fetch(`${API_BASE}/pricing`).then(r => r.json()).catch(() => [])
          ]);

          set({
            fields: fieldsRes.length > 0 ? fieldsRes : FIELDS,
            reservations: reservationsRes || [],
            events: eventsRes || [],
            blocked: blockedRes || [],
            pricing: pricingRes.length > 0 ? pricingRes : PRICING,
            isInitialized: true,
            isLoading: false
          });

          await get().syncFields();
          await get().syncReservations();
          await get().syncEvents();
          await get().syncBlocked();
          await get().syncPricing();

        } catch (error) {
          console.error('Erreur chargement initial:', error);
          set({ 
            error: 'Erreur de connexion au serveur',
            isLoading: false,
            isInitialized: true
          });
        }
      },

      // --- Synchronisation ---
      syncFields: async () => {
        try {
          const { data, error } = await supabase
            .from('fields')
            .select('*')
            .order('created_at', { ascending: true });
          
          if (error) throw error;
          if (data && data.length > 0) {
            set({ fields: data });
          }
        } catch (error) {
          console.error('Erreur syncFields:', error);
        }
      },

      syncReservations: async () => {
        try {
          const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          if (data) {
            set({ reservations: data });
          }
        } catch (error) {
          console.error('Erreur syncReservations:', error);
        }
      },

      syncEvents: async () => {
        try {
          const { data, error } = await supabase
            .from('private_events')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          if (data) {
            set({ events: data });
          }
        } catch (error) {
          console.error('Erreur syncEvents:', error);
        }
      },

      syncBlocked: async () => {
        try {
          const { data, error } = await supabase
            .from('availability')
            .select('*')
            .order('date', { ascending: true });
          
          if (error) throw error;
          if (data) {
            set({ blocked: data });
          }
        } catch (error) {
          console.error('Erreur syncBlocked:', error);
        }
      },

      syncPricing: async () => {
        try {
          const { data, error } = await supabase
            .from('pricing')
            .select('*')
            .order('sort_order', { ascending: true });
          
          if (error) throw error;
          if (data && data.length > 0) {
            set({ pricing: data });
          }
        } catch (error) {
          console.error('Erreur syncPricing:', error);
        }
      },

      // --- Upload d'images ---
      uploadFieldImage: async (file: File) => {
        set({ uploading: true });
        try {
          // Valider le type
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
          if (!allowedTypes.includes(file.type)) {
            throw new Error('Format non supporté. Utilisez JPG, PNG, WEBP ou SVG.');
          }

          // Valider la taille (5MB max)
          if (file.size > 5 * 1024 * 1024) {
            throw new Error('Fichier trop volumineux (max 5MB)');
          }

          // Générer un nom unique
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
          const filePath = `fields/${fileName}`;

          // Upload vers Supabase Storage
          const { data, error } = await supabase.storage
            .from('images')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          // Récupérer l'URL publique
          const { data: publicUrl } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);

          set({ uploading: false });
          return publicUrl.publicUrl;
        } catch (error) {
          console.error('Erreur upload:', error);
          set({ uploading: false });
          throw error;
        }
      },

      // --- Terrains ---
      addField: async (f) => {
        try {
          const res = await fetch(`${API_BASE}/fields`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(f)
          });
          
          if (!res.ok) throw new Error('Erreur lors de la création du terrain');
          
          const field = await res.json();
          set((state) => ({ fields: [...state.fields, field] }));
          await get().syncFields();
          return field;
        } catch (error) {
          console.error('Erreur addField:', error);
          throw error;
        }
      },

      updateField: async (id, patch) => {
        try {
          const res = await fetch(`${API_BASE}/fields/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch)
          });
          
          if (!res.ok) throw new Error('Erreur lors de la mise à jour');
          
          const field = await res.json();
          set((state) => ({
            fields: state.fields.map((f) => (f.id === id ? field : f))
          }));
          await get().syncFields();
          return field;
        } catch (error) {
          console.error('Erreur updateField:', error);
          throw error;
        }
      },

      removeField: async (id) => {
        try {
          const res = await fetch(`${API_BASE}/fields/${id}`, {
            method: 'DELETE'
          });
          
          if (!res.ok) throw new Error('Erreur lors de la suppression');
          
          set((state) => ({
            fields: state.fields.filter((f) => f.id !== id)
          }));
          await get().syncFields();
        } catch (error) {
          console.error('Erreur removeField:', error);
          throw error;
        }
      },

      // --- Réservations ---
      addReservation: (r) => {
        const res: Reservation = { 
          ...r, 
          id: uid(), 
          status: "confirmed", 
          createdAt: new Date().toISOString() 
        };
        set((state) => ({ 
          reservations: [res, ...state.reservations] 
        }));
        return res;
      },

      setReservationStatus: async (id, status) => {
        try {
          const res = await fetch(`${API_BASE}/reservations/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          
          if (!res.ok) throw new Error('Erreur lors du changement de statut');
          
          set((state) => ({
            reservations: state.reservations.map((r) =>
              r.id === id ? { ...r, status } : r
            )
          }));
          await get().syncReservations();
        } catch (error) {
          console.error('Erreur setReservationStatus:', error);
          throw error;
        }
      },

      // --- Événements ---
      addEvent: (e) => {
        const event: PrivateEvent = { 
          ...e, 
          id: uid(), 
          status: "new", 
          createdAt: new Date().toISOString() 
        };
        set((state) => ({
          events: [event, ...state.events]
        }));
        return event;
      },

      setEventStatus: async (id, status) => {
        try {
          const res = await fetch(`${API_BASE}/events/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          
          if (!res.ok) throw new Error('Erreur lors du changement de statut');
          
          set((state) => ({
            events: state.events.map((e) =>
              e.id === id ? { ...e, status } : e
            )
          }));
          await get().syncEvents();
        } catch (error) {
          console.error('Erreur setEventStatus:', error);
          throw error;
        }
      },

      // --- Disponibilités ---
      blockSlot: async (fieldId, date, hour, reason) => {
        try {
          const res = await fetch(`${API_BASE}/admin/availability/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldId, date, hour, reason })
          });
          
          if (!res.ok) throw new Error('Erreur lors du blocage');
          
          const block = await res.json();
          set((state) => ({
            blocked: [...state.blocked, block]
          }));
          await get().syncBlocked();
          return block;
        } catch (error) {
          console.error('Erreur blockSlot:', error);
          throw error;
        }
      },

      unblockSlot: async (id) => {
        try {
          const res = await fetch(`${API_BASE}/admin/availability/unblock/${id}`, {
            method: 'DELETE'
          });
          
          if (!res.ok) throw new Error('Erreur lors du déblocage');
          
          set((state) => ({
            blocked: state.blocked.filter((b) => b.id !== id)
          }));
          await get().syncBlocked();
        } catch (error) {
          console.error('Erreur unblockSlot:', error);
          throw error;
        }
      },

      // --- Notifications ---
      sendNotification: async (n) => {
        try {
          const res = await fetch(`${API_BASE}/admin/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n)
          });
          
          if (!res.ok) throw new Error('Erreur lors de l\'envoi');
          
          const notification = await res.json();
          set((state) => ({
            notifications: [notification, ...state.notifications]
          }));
          return notification;
        } catch (error) {
          console.error('Erreur sendNotification:', error);
          throw error;
        }
      }
    }),
    {
      name: 'soccer-city-store',
      partialize: (state) => ({
        fields: state.fields,
        reservations: state.reservations,
        events: state.events,
        blocked: state.blocked,
        notifications: state.notifications,
        pricing: state.pricing
      })
    }
  )
);