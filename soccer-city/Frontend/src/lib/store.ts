// lib/store.ts
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
  Rating,
  GalleryImage,
  MediaItem,
  CreateGalleryImage,
  CreateMediaItem,
  Page
} from "./types";

// API Backend URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AppState {
  // État
  fields: Field[];
  gallery: GalleryImage[];
  media: MediaItem[];
  reservations: Reservation[];
  events: PrivateEvent[];
  blocked: BlockedSlot[];
  notifications: AppNotification[];
  pricing: PricingPlan[];
  stats: Stat[];
  ratings: Rating[];
  pages: Page[];
  isLoading: boolean;
  isInitialized: boolean;
  uploading: boolean;
  error: string | null;
  user: any | null;
  isAdmin: boolean;

  // Chargement
  loadInitialData: () => Promise<void>;
  loadUser: () => Promise<void>;
  setupRealtime: () => void;

  // Sync - Récupération des données du backend
  syncFields: () => Promise<void>;
  syncGallery: () => Promise<void>;
  syncMedia: () => Promise<void>;
  syncReservations: () => Promise<void>;
  syncEvents: () => Promise<void>;
  syncBlocked: () => Promise<void>;
  syncPricing: () => Promise<void>;
  syncStats: () => Promise<void>;
  syncRatings: () => Promise<void>;
  syncPages: () => Promise<void>;
  syncNotifications: () => Promise<void>;

  // Load
  loadFields: () => Promise<void>;
  loadGallery: () => Promise<void>;
  loadMedia: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadRatings: () => Promise<void>;
  loadReservations: () => Promise<void>;
  loadPages: () => Promise<void>;

  // Gestion des terrains
  addField: (f: Omit<Field, "id" | "created_at">) => Promise<Field>;
  updateField: (id: string, patch: Partial<Field>) => Promise<Field>;
  removeField: (id: string) => Promise<void>;

  // Gestion de la galerie
  addGalleryImage: (data: CreateGalleryImage) => Promise<GalleryImage>;
  updateGalleryImage: (id: string, data: Partial<GalleryImage>) => Promise<GalleryImage>;
  deleteGalleryImage: (id: string) => Promise<void>;
  reorderGalleryImages: (ids: string[]) => Promise<GalleryImage[]>;

  // Gestion des médias
  addMediaItem: (data: CreateMediaItem) => Promise<MediaItem>;
  updateMediaItem: (id: string, data: Partial<MediaItem>) => Promise<MediaItem>;
  deleteMediaItem: (id: string) => Promise<void>;

  // Upload
  uploadImage: (file: File, folder?: string) => Promise<string>;

  // Réservations
  addReservation: (r: Omit<Reservation, "id" | "createdAt" | "status">) => Promise<Reservation>;
  setReservationStatus: (id: string, status: ReservationStatus) => Promise<void>;

  // Événements
  addEvent: (e: Omit<PrivateEvent, "id" | "createdAt" | "status" | "media" | "gallery">) => Promise<PrivateEvent>;
  setEventStatus: (id: string, status: EventStatus) => Promise<void>;

  // Disponibilités
  blockSlot: (date: string, hour: number, reason: string) => Promise<BlockedSlot>;
  unblockSlot: (id: string) => Promise<void>;

  // Notifications
  sendNotification: (n: Omit<AppNotification, "id" | "sentAt">) => Promise<AppNotification>;

  // Stats & Ratings
  updateStat: (key: string, value: number) => Promise<void>;
  addRating: (rating: number, comment?: string) => Promise<void>;

  // Pages CMS
  createPage: (page: Omit<Page, "id" | "created_at" | "updated_at">) => Promise<Page>;
  updatePage: (id: string, page: Partial<Page>) => Promise<Page>;
  deletePage: (id: string) => Promise<void>;

  // Admin
  checkAdminAccess: () => Promise<boolean>;

  // Reset
  resetStore: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ============================================
      // ÉTAT INITIAL
      // ============================================
      fields: [],
      gallery: [],
      media: [],
      reservations: [],
      events: [],
      blocked: [],
      notifications: [],
      pricing: [],
      stats: [],
      ratings: [],
      pages: [],
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

          // Charger toutes les données depuis le backend
          await Promise.all([
            get().syncFields(),
            get().syncGallery(),
            get().syncMedia(),
            get().syncReservations(),
            get().syncEvents(),
            get().syncBlocked(),
            get().syncPricing(),
            get().syncStats(),
            get().syncRatings(),
            get().syncPages(),
            get().syncNotifications()
          ]);

          // Configurer la synchronisation en temps réel
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

        // Terrains
        supabase
          .channel('fields-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'fields' }, 
            () => {
              console.log('🔄 Mise à jour des terrains');
              get().syncFields();
            })
          .subscribe();

        // Galerie
        supabase
          .channel('gallery-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'gallery' }, 
            () => {
              console.log('🔄 Mise à jour de la galerie');
              get().syncGallery();
            })
          .subscribe();

        // Médias
        supabase
          .channel('media-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'media' }, 
            () => {
              console.log('🔄 Mise à jour des médias');
              get().syncMedia();
            })
          .subscribe();

        // Réservations
        supabase
          .channel('reservations-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'reservations' }, 
            () => {
              console.log('🔄 Mise à jour des réservations');
              get().syncReservations();
            })
          .subscribe();

        // Événements
        supabase
          .channel('events-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'private_events' }, 
            () => {
              console.log('🔄 Mise à jour des événements');
              get().syncEvents();
            })
          .subscribe();

        // Disponibilités
        supabase
          .channel('availability-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'availability' }, 
            () => {
              console.log('🔄 Mise à jour des disponibilités');
              get().syncBlocked();
            })
          .subscribe();

        // Tarifs
        supabase
          .channel('pricing-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'pricing' }, 
            () => {
              console.log('🔄 Mise à jour des tarifs');
              get().syncPricing();
            })
          .subscribe();

        // Stats
        supabase
          .channel('stats-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'stats' }, 
            () => {
              console.log('🔄 Mise à jour des statistiques');
              get().syncStats();
            })
          .subscribe();

        // Ratings
        supabase
          .channel('ratings-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'ratings' }, 
            () => {
              console.log('🔄 Mise à jour des évaluations');
              get().syncRatings();
            })
          .subscribe();

        // Pages
        supabase
          .channel('pages-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'pages' }, 
            () => {
              console.log('🔄 Mise à jour des pages');
              get().syncPages();
            })
          .subscribe();

        // Notifications
        supabase
          .channel('notifications-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'notifications' }, 
            () => {
              console.log('🔄 Mise à jour des notifications');
              get().syncNotifications();
            })
          .subscribe();

        console.log('✅ Canaux Realtime configurés');
      },

      // ============================================
      // SYNC - Récupération des données du backend
      // ============================================
      
      syncFields: async () => {
        try {
          console.log('🔄 Synchronisation des terrains...');
          const { data, error } = await supabase
            .from('fields')
            .select('*')
            .order('created_at', { ascending: true });
          
          if (error) throw error;
          set({ fields: data || [] });
          console.log(`✅ ${data?.length || 0} terrains synchronisés`);
        } catch (error) {
          console.error('❌ Erreur syncFields:', error);
          set({ fields: [] });
        }
      },

      syncGallery: async () => {
        try {
          console.log('🔄 Synchronisation de la galerie...');
          const { data, error } = await supabase
            .from('gallery')
            .select(`
              *,
              event:private_events (
                id,
                first_name,
                last_name,
                type
              )
            `)
            .order('sort_order', { ascending: true });
          
          if (error) throw error;
          set({ gallery: data || [] });
          console.log(`✅ ${data?.length || 0} images synchronisées`);
        } catch (error) {
          console.error('❌ Erreur syncGallery:', error);
          set({ gallery: [] });
        }
      },

      syncMedia: async () => {
        try {
          console.log('🔄 Synchronisation des médias...');
          const { data, error } = await supabase
            .from('media')
            .select(`
              *,
              event:private_events (
                id,
                first_name,
                last_name,
                type
              )
            `)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ media: data || [] });
          console.log(`✅ ${data?.length || 0} médias synchronisés`);
        } catch (error) {
          console.error('❌ Erreur syncMedia:', error);
          set({ media: [] });
        }
      },

      syncReservations: async () => {
        try {
          console.log('🔄 Synchronisation des réservations...');
          const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ reservations: data || [] });
          console.log(`✅ ${data?.length || 0} réservations synchronisées`);
        } catch (error) {
          console.error('❌ Erreur syncReservations:', error);
          set({ reservations: [] });
        }
      },

      syncEvents: async () => {
        try {
          console.log('🔄 Synchronisation des événements...');
          const { data, error } = await supabase
            .from('private_events')
            .select(`
              *,
              media:media(*),
              gallery:gallery(*)
            `)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ events: data || [] });
          console.log(`✅ ${data?.length || 0} événements synchronisés`);
        } catch (error) {
          console.error('❌ Erreur syncEvents:', error);
          set({ events: [] });
        }
      },

      syncBlocked: async () => {
        try {
          console.log('🔄 Synchronisation des disponibilités...');
          const { data, error } = await supabase
            .from('availability')
            .select('*')
            .order('date', { ascending: true });
          
          if (error) throw error;
          set({ blocked: data || [] });
          console.log(`✅ ${data?.length || 0} créneaux synchronisés`);
        } catch (error) {
          console.error('❌ Erreur syncBlocked:', error);
          set({ blocked: [] });
        }
      },

      syncPricing: async () => {
        try {
          console.log('🔄 Synchronisation des tarifs...');
          const { data, error } = await supabase
            .from('pricing')
            .select('*')
            .order('sort_order', { ascending: true });
          
          if (error) throw error;
          set({ pricing: data || [] });
          console.log(`✅ ${data?.length || 0} tarifs synchronisés`);
        } catch (error) {
          console.error('❌ Erreur syncPricing:', error);
          set({ pricing: [] });
        }
      },

      syncStats: async () => {
        try {
          console.log('🔄 Synchronisation des statistiques...');
          const { data, error } = await supabase
            .from('stats')
            .select('*');
          
          if (error) throw error;
          set({ stats: data || [] });
          console.log(`✅ ${data?.length || 0} statistiques synchronisées`);
        } catch (error) {
          console.error('❌ Erreur syncStats:', error);
          set({ stats: [] });
        }
      },

      syncRatings: async () => {
        try {
          console.log('🔄 Synchronisation des évaluations...');
          const { data, error } = await supabase
            .from('ratings')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ ratings: data || [] });
          console.log(`✅ ${data?.length || 0} évaluations synchronisées`);
        } catch (error) {
          console.error('❌ Erreur syncRatings:', error);
          set({ ratings: [] });
        }
      },

      syncPages: async () => {
        try {
          console.log('🔄 Synchronisation des pages...');
          const { data, error } = await supabase
            .from('pages')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ pages: data || [] });
          console.log(`✅ ${data?.length || 0} pages synchronisées`);
        } catch (error) {
          console.error('❌ Erreur syncPages:', error);
          set({ pages: [] });
        }
      },

      syncNotifications: async () => {
        try {
          console.log('🔄 Synchronisation des notifications...');
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('sent_at', { ascending: false });
          
          if (error) throw error;
          set({ notifications: data || [] });
          console.log(`✅ ${data?.length || 0} notifications synchronisées`);
        } catch (error) {
          console.error('❌ Erreur syncNotifications:', error);
          set({ notifications: [] });
        }
      },

      // ============================================
      // LOAD (alias pour sync)
      // ============================================
      loadFields: async () => get().syncFields(),
      loadGallery: async () => get().syncGallery(),
      loadMedia: async () => get().syncMedia(),
      loadStats: async () => get().syncStats(),
      loadRatings: async () => get().syncRatings(),
      loadReservations: async () => get().syncReservations(),
      loadPages: async () => get().syncPages(),

      // ============================================
      // UPLOAD D'IMAGES
      // ============================================
      uploadImage: async (file: File, folder: string = 'gallery') => {
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
          const filePath = `${folder}/${fileName}`;

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
      // GESTION DES TERRAINS
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
          
          await get().syncFields();
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
          
          await get().syncFields();
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
          
          await get().syncFields();
          console.log('✅ Terrain supprimé');
        } catch (error) {
          console.error('❌ Erreur removeField:', error);
          throw error;
        }
      },

      // ============================================
      // GESTION DE LA GALERIE
      // ============================================
      addGalleryImage: async (data) => {
        try {
          const { data: result, error } = await supabase
            .from('gallery')
            .insert([{
              image_url: data.imageUrl,
              alt: data.alt || 'Image de la galerie',
              sort_order: 0,
              event_id: data.eventId || null
            }])
            .select(`
              *,
              event:private_events (
                id,
                first_name,
                last_name,
                type
              )
            `)
            .single();

          if (error) throw error;
          
          await get().syncGallery();
          console.log('✅ Image ajoutée à la galerie:', result);
          return result as GalleryImage;
        } catch (error) {
          console.error('❌ Erreur addGalleryImage:', error);
          throw error;
        }
      },

      updateGalleryImage: async (id, data) => {
        try {
          const { data: result, error } = await supabase
            .from('gallery')
            .update({
              alt: data.alt,
              sort_order: data.sortOrder,
              event_id: data.eventId
            })
            .eq('id', id)
            .select(`
              *,
              event:private_events (
                id,
                first_name,
                last_name,
                type
              )
            `)
            .single();

          if (error) throw error;
          
          await get().syncGallery();
          console.log('✅ Image mise à jour:', result);
          return result as GalleryImage;
        } catch (error) {
          console.error('❌ Erreur updateGalleryImage:', error);
          throw error;
        }
      },

      deleteGalleryImage: async (id) => {
        try {
          const { data: image } = await supabase
            .from('gallery')
            .select('image_url')
            .eq('id', id)
            .single();

          if (image?.image_url) {
            const path = image.image_url.split('/').pop();
            if (path) {
              await supabase.storage
                .from('images')
                .remove([`gallery/${path}`])
                .catch(err => console.warn('⚠️ Erreur suppression storage:', err));
            }
          }

          const { error } = await supabase
            .from('gallery')
            .delete()
            .eq('id', id);

          if (error) throw error;
          
          await get().syncGallery();
          console.log('✅ Image supprimée de la galerie');
        } catch (error) {
          console.error('❌ Erreur deleteGalleryImage:', error);
          throw error;
        }
      },

      reorderGalleryImages: async (ids) => {
        try {
          const updates = ids.map((id, index) =>
            supabase
              .from('gallery')
              .update({ sort_order: index })
              .eq('id', id)
          );

          await Promise.all(updates);
          
          await get().syncGallery();
          console.log('✅ Ordre de la galerie mis à jour');
          return get().gallery;
        } catch (error) {
          console.error('❌ Erreur reorderGalleryImages:', error);
          throw error;
        }
      },

      // ============================================
      // GESTION DES MÉDIAS
      // ============================================
      addMediaItem: async (data) => {
        try {
          const { data: result, error } = await supabase
            .from('media')
            .insert([{
              title: data.title,
              url: data.url,
              type: data.type,
              thumbnail: data.thumbnail || null,
              duration: data.duration || null,
              description: data.description || null,
              is_featured: data.isFeatured || false,
              event_id: data.eventId || null
            }])
            .select(`
              *,
              event:private_events (
                id,
                first_name,
                last_name,
                type
              )
            `)
            .single();

          if (error) throw error;
          
          await get().syncMedia();
          console.log('✅ Média ajouté:', result);
          return result as MediaItem;
        } catch (error) {
          console.error('❌ Erreur addMediaItem:', error);
          throw error;
        }
      },

      updateMediaItem: async (id, data) => {
        try {
          const { data: result, error } = await supabase
            .from('media')
            .update({
              title: data.title,
              url: data.url,
              type: data.type,
              thumbnail: data.thumbnail,
              duration: data.duration,
              description: data.description,
              is_featured: data.isFeatured,
              event_id: data.eventId
            })
            .eq('id', id)
            .select(`
              *,
              event:private_events (
                id,
                first_name,
                last_name,
                type
              )
            `)
            .single();

          if (error) throw error;
          
          await get().syncMedia();
          console.log('✅ Média mis à jour:', result);
          return result as MediaItem;
        } catch (error) {
          console.error('❌ Erreur updateMediaItem:', error);
          throw error;
        }
      },

      deleteMediaItem: async (id) => {
        try {
          const { data: media } = await supabase
            .from('media')
            .select('url, thumbnail')
            .eq('id', id)
            .single();

          if (media?.url) {
            const path = media.url.split('/').pop();
            if (path) {
              await supabase.storage
                .from('media')
                .remove([`videos/${path}`])
                .catch(err => console.warn('⚠️ Erreur suppression media:', err));
            }
          }

          if (media?.thumbnail) {
            const thumbPath = media.thumbnail.split('/').pop();
            if (thumbPath) {
              await supabase.storage
                .from('media')
                .remove([`thumbnails/${thumbPath}`])
                .catch(err => console.warn('⚠️ Erreur suppression thumbnail:', err));
            }
          }

          const { error } = await supabase
            .from('media')
            .delete()
            .eq('id', id);

          if (error) throw error;
          
          await get().syncMedia();
          console.log('✅ Média supprimé');
        } catch (error) {
          console.error('❌ Erreur deleteMediaItem:', error);
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
          
          await get().syncReservations();
          console.log('✅ Réservation ajoutée:', data);
          return data as Reservation;
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
          await get().syncReservations();
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
          
          await get().syncEvents();
          console.log('✅ Événement ajouté:', data);
          return data as PrivateEvent;
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
      blockSlot: async (date, hour, reason) => {
        try {
          const { data, error } = await supabase
            .from('availability')
            .insert([{
              date: date,
              hour: hour,
              blocked: true,
              reason: reason || 'Bloqué par l\'administration'
            }])
            .select()
            .single();

          if (error) throw error;
          
          await get().syncBlocked();
          console.log('✅ Créneau bloqué:', data);
          return data as BlockedSlot;
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
          
          await get().syncBlocked();
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
          
          await get().syncNotifications();
          console.log('✅ Notification envoyée:', data);
          return data as AppNotification;
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
          await get().syncStats();
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
          
          await get().syncRatings();
          console.log('✅ Évaluation ajoutée:', data);
          return data;
        } catch (error) {
          console.error('❌ Erreur addRating:', error);
          throw error;
        }
      },

      // ============================================
      // PAGES CMS
      // ============================================
      createPage: async (page) => {
        try {
          const { data, error } = await supabase
            .from('pages')
            .insert([{
              slug: page.slug,
              title: page.title,
              content: page.content || null
            }])
            .select()
            .single();

          if (error) throw error;
          
          await get().syncPages();
          console.log('✅ Page créée:', data);
          return data as Page;
        } catch (error) {
          console.error('❌ Erreur createPage:', error);
          throw error;
        }
      },

      updatePage: async (id, page) => {
        try {
          const { data, error } = await supabase
            .from('pages')
            .update({
              slug: page.slug,
              title: page.title,
              content: page.content,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          
          await get().syncPages();
          console.log('✅ Page mise à jour:', data);
          return data as Page;
        } catch (error) {
          console.error('❌ Erreur updatePage:', error);
          throw error;
        }
      },

      deletePage: async (id) => {
        try {
          const { error } = await supabase
            .from('pages')
            .delete()
            .eq('id', id);

          if (error) throw error;
          
          await get().syncPages();
          console.log('✅ Page supprimée');
        } catch (error) {
          console.error('❌ Erreur deletePage:', error);
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
          gallery: [],
          media: [],
          reservations: [],
          events: [],
          blocked: [],
          notifications: [],
          pricing: [],
          stats: [],
          ratings: [],
          pages: [],
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
        gallery: state.gallery,
        media: state.media,
        reservations: state.reservations,
        events: state.events,
        blocked: state.blocked,
        notifications: state.notifications,
        pricing: state.pricing,
        stats: state.stats,
        ratings: state.ratings,
        pages: state.pages
      })
    }
  )
);

// Exposer le store globalement pour le débogage
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__STORE = useAppStore;
  console.log('🔧 Store exposé globalement. Utilisez window.__STORE.getState()');
}