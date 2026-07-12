"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, getCurrentUser, isUserAdmin } from "./supabase";
import type { 
  Field, 
  Reservation, 
  PrivateEvent, 
  BlockedSlot, 
  AppNotification, 
  ReservationStatus, 
  EventStatus,
  PricingPlan,
  Stat,
  Rating
} from "./types";

// API Backend URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Données par défaut pour le pricing
const DEFAULT_PRICING: PricingPlan[] = [
  {
    id: "p1",
    name: "À l'heure",
    price: 90,
    unit: "/ heure",
    features: ["Bloc d'1 heure garanti", "Vestiaires + douches inclus", "Éclairage LED compris", "Annulation gratuite 24 h avant"],
    highlighted: false,
  },
  {
    id: "p2",
    name: "Journée",
    price: 650,
    unit: "/ jour",
    features: ["Terrain privatisé 8 h – 23 h", "Coordinateur sur place", "Sonorisation incluse", "10 ballons de match fournis"],
    highlighted: true,
  },
];

interface AppState {
  fields: Field[];
  reservations: Reservation[];
  events: PrivateEvent[];
  blocked: BlockedSlot[];
  notifications: AppNotification[];
  pricing: PricingPlan[];
  stats: Stat[];
  ratings: Rating[];
  isLoading: boolean;
  isInitialized: boolean;
  uploading: boolean;
  error: string | null;
  user: any | null;
  isAdmin: boolean;

  loadInitialData: () => Promise<void>;
  loadUser: () => Promise<void>;
  setupRealtime: () => void;

  syncFields: () => Promise<void>;
  syncReservations: () => Promise<void>;
  syncEvents: () => Promise<void>;
  syncBlocked: () => Promise<void>;
  syncPricing: () => Promise<void>;
  syncStats: () => Promise<void>;
  syncRatings: () => Promise<void>;

  loadFields: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadRatings: () => Promise<void>;
  loadReservations: () => Promise<void>;

  addField: (f: Omit<Field, "id" | "created_at">) => Promise<Field>;
  updateField: (id: string, patch: Partial<Field>) => Promise<Field>;
  removeField: (id: string) => Promise<void>;

  uploadFieldImage: (file: File) => Promise<string>;

  addReservation: (r: Omit<Reservation, "id" | "createdAt" | "status">) => Promise<Reservation>;
  setReservationStatus: (id: string, status: ReservationStatus) => Promise<void>;

  addEvent: (e: Omit<PrivateEvent, "id" | "createdAt" | "status">) => Promise<PrivateEvent>;
  setEventStatus: (id: string, status: EventStatus) => Promise<void>;

  blockSlot: (fieldId: string, date: string, hour: number, reason: string) => Promise<BlockedSlot>;
  unblockSlot: (id: string) => Promise<void>;

  sendNotification: (n: Omit<AppNotification, "id" | "sentAt">) => Promise<AppNotification>;

  updateStat: (key: string, value: number) => Promise<void>;
  addRating: (rating: number, comment?: string) => Promise<void>;
  checkAdminAccess: () => Promise<boolean>;
  resetStore: () => void;
}

// Création du store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ============================================
      // ÉTAT INITIAL
      // ============================================
      fields: [],
      reservations: [],
      events: [],
      blocked: [],
      notifications: [],
      pricing: DEFAULT_PRICING,
      stats: [],
      ratings: [],
      isLoading: false,
      isInitialized: false,
      uploading: false,
      error: null,
      user: null,
      isAdmin: false,

      // ============================================
      // CHARGEMENT DE L'UTILISATEUR
      // ============================================
      loadUser: async () => {
        try {
          const user = await getCurrentUser();
          const admin = await isUserAdmin();
          set({ user, isAdmin: admin });
        } catch (error) {
          console.error('❌ Erreur loadUser:', error);
          set({ user: null, isAdmin: false });
        }
      },

      // ============================================
      // INITIALISATION
      // ============================================
      loadInitialData: async () => {
        if (get().isInitialized) return;
        
        set({ isLoading: true, error: null });
        
        try {
          await get().loadUser();

          await Promise.all([
            get().loadFields(),
            get().loadReservations(),
            get().syncEvents(),
            get().syncBlocked(),
            get().syncPricing(),
            get().loadStats(),
            get().loadRatings()
          ]);

          get().setupRealtime();

          set({ isInitialized: true, isLoading: false });
          console.log('✅ Données initialisées avec succès');
        } catch (error) {
          console.error('❌ Erreur chargement initial:', error);
          set({ 
            error: 'Erreur de connexion au serveur',
            isLoading: false,
            isInitialized: true
          });
        }
      },

      // ============================================
      // CONFIGURATION REALTIME
      // ============================================
      setupRealtime: () => {
        console.log('📡 Configuration des canaux Realtime...');

        supabase
          .channel('fields-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'fields' }, 
            () => {
              console.log('🔄 Mise à jour des terrains');
              get().loadFields();
            })
          .subscribe();

        supabase
          .channel('reservations-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'reservations' }, 
            () => {
              console.log('🔄 Mise à jour des réservations');
              get().loadReservations();
            })
          .subscribe();

        supabase
          .channel('stats-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'stats' }, 
            () => {
              console.log('🔄 Mise à jour des statistiques');
              get().loadStats();
            })
          .subscribe();

        supabase
          .channel('ratings-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'ratings' }, 
            () => {
              console.log('🔄 Mise à jour des évaluations');
              get().loadRatings();
            })
          .subscribe();

        console.log('✅ Canaux Realtime configurés');
      },

      // ============================================
      // SYNCHRONISATION
      // ============================================
      syncFields: async () => {
        await get().loadFields();
      },

      syncReservations: async () => {
        await get().loadReservations();
      },

      syncEvents: async () => {
        try {
          const { data, error } = await supabase
            .from('private_events')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ events: data || [] });
        } catch (error) {
          console.error('❌ Erreur syncEvents:', error);
        }
      },

      syncBlocked: async () => {
        try {
          const { data, error } = await supabase
            .from('availability')
            .select('*')
            .order('date', { ascending: true });
          
          if (error) throw error;
          set({ blocked: data || [] });
        } catch (error) {
          console.error('❌ Erreur syncBlocked:', error);
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
          console.error('❌ Erreur syncPricing:', error);
        }
      },

      syncStats: async () => {
        await get().loadStats();
      },

      syncRatings: async () => {
        await get().loadRatings();
      },

      // ============================================
      // CHARGEMENT
      // ============================================
      loadFields: async () => {
        try {
          console.log('🔄 Chargement des terrains via API...');
          const response = await fetch(`${API_BASE}/fields`);
          
          if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('✅ Terrains reçus:', data);
          set({ fields: data });
        } catch (error) {
          console.error('❌ Erreur API loadFields:', error);
          // Fallback vers Supabase
          try {
            console.log('🔄 Fallback: chargement depuis Supabase...');
            const { data, error: supabaseError } = await supabase
              .from('fields')
              .select('*')
              .order('created_at', { ascending: true });
            
            if (supabaseError) throw supabaseError;
            console.log('✅ Terrains depuis Supabase:', data);
            set({ fields: data || [] });
          } catch (supabaseError) {
            console.error('❌ Erreur Supabase loadFields:', supabaseError);
            set({ fields: [] });
          }
        }
      },

      loadStats: async () => {
        try {
          const { data, error } = await supabase
            .from('stats')
            .select('*');
          
          if (error) throw error;
          set({ stats: data || [] });
        } catch (error) {
          console.error('❌ Erreur loadStats:', error);
        }
      },

      loadRatings: async () => {
        try {
          const { data, error } = await supabase
            .from('ratings')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ ratings: data || [] });
        } catch (error) {
          console.error('❌ Erreur loadRatings:', error);
        }
      },

      loadReservations: async () => {
        try {
          const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ reservations: data || [] });
        } catch (error) {
          console.error('❌ Erreur loadReservations:', error);
        }
      },

      // ============================================
      // UPLOAD D'IMAGES
      // ============================================
      uploadFieldImage: async (file: File) => {
        set({ uploading: true });
        try {
          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
          if (!allowedTypes.includes(file.type)) {
            throw new Error('Format non supporté. Utilisez JPG, PNG, WEBP ou SVG.');
          }

          if (file.size > 5 * 1024 * 1024) {
            throw new Error('Fichier trop volumineux (max 5MB)');
          }

          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
          const filePath = `fields/${fileName}`;

          const { data, error } = await supabase.storage
            .from('images')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          const { data: publicUrl } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);

          set({ uploading: false });
          return publicUrl.publicUrl;
        } catch (error) {
          console.error('❌ Erreur upload:', error);
          set({ uploading: false });
          throw error;
        }
      },

      // ============================================
      // TERRAINS
      // ============================================
      addField: async (f) => {
        try {
          const { data, error } = await supabase
            .from('fields')
            .insert([{
              name: f.name,
              slug: f.name.toLowerCase().replace(/\s+/g, '-'),
              image_url: f.image || '/fields/default.svg',
              dimensions: f.dimensions,
              turf: f.turf,
              lighting: f.lighting,
              locker_rooms: f.lockerRooms,
              parking: f.parking,
              players: f.players,
              price_per_hour: f.pricePerHour,
              indoor: f.indoor,
              active: f.active !== undefined ? f.active : true
            }])
            .select()
            .single();

          if (error) throw error;
          
          await get().loadFields();
          
          const fieldCount = get().fields.length;
          await get().updateStat('terrains', fieldCount);
          
          console.log('✅ Terrain ajouté:', data);
          return data as Field;
        } catch (error) {
          console.error('❌ Erreur addField:', error);
          throw error;
        }
      },

      updateField: async (id, patch) => {
        try {
          const { data, error } = await supabase
            .from('fields')
            .update({
              name: patch.name,
              image_url: patch.image,
              dimensions: patch.dimensions,
              turf: patch.turf,
              lighting: patch.lighting,
              locker_rooms: patch.lockerRooms,
              parking: patch.parking,
              players: patch.players,
              price_per_hour: patch.pricePerHour,
              indoor: patch.indoor,
              active: patch.active
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          
          await get().loadFields();
          console.log('✅ Terrain mis à jour:', data);
          return data as Field;
        } catch (error) {
          console.error('❌ Erreur updateField:', error);
          throw error;
        }
      },

      removeField: async (id) => {
        try {
          const { error } = await supabase
            .from('fields')
            .delete()
            .eq('id', id);

          if (error) throw error;
          
          await get().loadFields();
          
          const fieldCount = get().fields.length;
          await get().updateStat('terrains', fieldCount);
          
          console.log('✅ Terrain supprimé');
        } catch (error) {
          console.error('❌ Erreur removeField:', error);
          throw error;
        }
      },

      // ============================================
      // RÉSERVATIONS
      // ============================================
      addReservation: async (r) => {
        try {
          const { data, error } = await supabase
            .from('reservations')
            .insert([{
              field_id: r.fieldId,
              user_name: r.userName,
              user_email: r.userEmail,
              user_phone: r.userPhone,
              date: r.date,
              hour: r.hour,
              price: r.price,
              status: 'confirmed'
            }])
            .select()
            .single();

          if (error) throw error;
          
          const reservation = data as Reservation;
          set((state) => ({
            reservations: [reservation, ...state.reservations]
          }));
          
          console.log('✅ Réservation ajoutée:', reservation);
          return reservation;
        } catch (error) {
          console.error('❌ Erreur addReservation:', error);
          throw error;
        }
      },

      setReservationStatus: async (id, status) => {
        try {
          const { error } = await supabase
            .from('reservations')
            .update({ status })
            .eq('id', id);

          if (error) throw error;
          await get().loadReservations();
          console.log('✅ Statut de réservation mis à jour:', { id, status });
        } catch (error) {
          console.error('❌ Erreur setReservationStatus:', error);
          throw error;
        }
      },

      // ============================================
      // ÉVÉNEMENTS
      // ============================================
      addEvent: async (e) => {
        try {
          const { data, error } = await supabase
            .from('private_events')
            .insert([{
              first_name: e.firstName,
              last_name: e.lastName,
              company: e.company || null,
              phone: e.phone,
              email: e.email,
              date: e.date,
              guests: e.guests,
              type: e.type,
              message: e.message,
              status: 'new'
            }])
            .select()
            .single();

          if (error) throw error;
          
          const event = data as PrivateEvent;
          set((state) => ({
            events: [event, ...state.events]
          }));
          
          console.log('✅ Événement ajouté:', event);
          return event;
        } catch (error) {
          console.error('❌ Erreur addEvent:', error);
          throw error;
        }
      },

      setEventStatus: async (id, status) => {
        try {
          const { error } = await supabase
            .from('private_events')
            .update({ status })
            .eq('id', id);

          if (error) throw error;
          await get().syncEvents();
          console.log('✅ Statut d\'événement mis à jour:', { id, status });
        } catch (error) {
          console.error('❌ Erreur setEventStatus:', error);
          throw error;
        }
      },

      // ============================================
      // DISPONIBILITÉS
      // ============================================
      blockSlot: async (fieldId, date, hour, reason) => {
        try {
          const { data, error } = await supabase
            .from('availability')
            .insert([{
              field_id: fieldId,
              date: date,
              hour: hour,
              blocked: true,
              reason: reason || 'Bloqué par l\'administration'
            }])
            .select()
            .single();

          if (error) throw error;
          
          const block = data as BlockedSlot;
          set((state) => ({
            blocked: [...state.blocked, block]
          }));
          
          console.log('✅ Créneau bloqué:', block);
          return block;
        } catch (error) {
          console.error('❌ Erreur blockSlot:', error);
          throw error;
        }
      },

      unblockSlot: async (id) => {
        try {
          const { error } = await supabase
            .from('availability')
            .delete()
            .eq('id', id);

          if (error) throw error;
          
          set((state) => ({
            blocked: state.blocked.filter((b) => b.id !== id)
          }));
          
          console.log('✅ Créneau débloqué');
        } catch (error) {
          console.error('❌ Erreur unblockSlot:', error);
          throw error;
        }
      },

      // ============================================
      // NOTIFICATIONS
      // ============================================
      sendNotification: async (n) => {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .insert([{
              title: n.title,
              body: n.body,
              audience: n.audience || 'all'
            }])
            .select()
            .single();

          if (error) throw error;
          
          const notification = data as AppNotification;
          set((state) => ({
            notifications: [notification, ...state.notifications]
          }));
          
          console.log('✅ Notification envoyée:', notification);
          return notification;
        } catch (error) {
          console.error('❌ Erreur sendNotification:', error);
          throw error;
        }
      },

      // ============================================
      // STATISTIQUES
      // ============================================
      updateStat: async (key: string, value: number) => {
        try {
          const { error } = await supabase
            .from('stats')
            .update({ value })
            .eq('key', key);

          if (error) throw error;
          await get().loadStats();
          console.log('✅ Statistique mise à jour:', { key, value });
        } catch (error) {
          console.error('❌ Erreur updateStat:', error);
          throw error;
        }
      },

      // ============================================
      // ÉVALUATIONS
      // ============================================
      addRating: async (rating: number, comment?: string) => {
        try {
          const { data, error } = await supabase
            .from('ratings')
            .insert([{
              rating,
              comment: comment || ''
            }])
            .select()
            .single();

          if (error) throw error;
          
          await get().loadRatings();
          console.log('✅ Évaluation ajoutée:', data);
          return data;
        } catch (error) {
          console.error('❌ Erreur addRating:', error);
          throw error;
        }
      },

      // ============================================
      // ADMIN
      // ============================================
      checkAdminAccess: async () => {
        await get().loadUser();
        return get().isAdmin;
      },

      // ============================================
      // RÉINITIALISATION
      // ============================================
      resetStore: () => {
        set({
          fields: [],
          reservations: [],
          events: [],
          blocked: [],
          notifications: [],
          pricing: DEFAULT_PRICING,
          stats: [],
          ratings: [],
          isLoading: false,
          isInitialized: false,
          uploading: false,
          error: null,
          user: null,
          isAdmin: false
        });
        localStorage.removeItem('soccer-city-store');
        console.log('🗑️ Store Soccer City réinitialisé');
      },
    }),
    {
      name: 'soccer-city-store',
      partialize: (state) => ({
        fields: state.fields,
        reservations: state.reservations,
        events: state.events,
        blocked: state.blocked,
        notifications: state.notifications,
        pricing: state.pricing,
        stats: state.stats,
        ratings: state.ratings
      })
    }
  )
);

// ============================================
// EXPOSER LE STORE GLOBALEMENT POUR LE DÉBOGAGE
// ============================================
// Cette ligne permet d'accéder au store depuis la console du navigateur
if (typeof window !== 'undefined') {
  // @ts-ignore - Ignorer l'erreur TypeScript pour le débogage
  window.__STORE = useAppStore;
  console.log('🔧 Store exposé globalement. Utilisez window.__STORE.getState()');
}