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
  Rating,
  GalleryImage,
  MediaItem,
  FieldMediaItem,
  CreateGalleryImage,
  CreateMediaItem,
  Page
} from "./types";

// API Backend URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Fonction utilitaire pour nettoyer les données des terrains
const sanitizeFieldData = (data: any) => {
  return {
    name: data.name?.trim(),
    slug: data.slug?.toLowerCase().replace(/\s+/g, '-') || data.name?.toLowerCase().replace(/\s+/g, '-'),
    image_url: data.image || null,
    dimensions: data.dimensions || '40 × 20 m',
    turf: data.turf || 'Gazon synthétique 5G',
    lighting: data.lighting ?? true,
    locker_rooms: Number(data.lockerRooms) || 2,
    parking: data.parking ?? true,
    players: data.players || '5 vs 5',
    price_per_hour: Number(data.pricePerHour) || 90,
    indoor: data.indoor ?? false,
    active: data.active ?? true,
  };
};

const mapFieldFromDb = (row: any): Field => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  image: row.image_url ?? '',
  dimensions: row.dimensions,
  turf: row.turf,
  lighting: row.lighting,
  lockerRooms: row.locker_rooms,
  parking: row.parking,
  players: row.players,
  pricePerHour: row.price_per_hour,
  indoor: row.indoor,
  active: row.active,
  created_at: row.created_at,
});

// ✅ Mapping snake_case (Supabase) → camelCase pour les réservations
const mapReservationFromDb = (row: any): Reservation => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  userEmail: row.user_email,
  userPhone: row.user_phone,
  date: row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  endDate: row.end_date ?? null,
  price: row.price,
  status: row.status,
  createdAt: row.created_at,
});

// ✅ Mapping snake_case (Supabase) → camelCase pour les créneaux bloqués
const mapBlockedFromDb = (row: any): BlockedSlot => ({
  id: row.id,
  date: row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  endDate: row.end_date ?? null,
  blocked: row.blocked,
  reason: row.reason,
});

// ✅ Mapping snake_case (Supabase) → camelCase pour les médias de terrain
const mapFieldMediaFromDb = (row: any): FieldMediaItem => ({
  id: row.id,
  fieldId: row.field_id,
  url: row.url,
  type: row.type,
  thumbnail: row.thumbnail,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
});

interface AppState {
  // État
  fields: Field[];
  gallery: GalleryImage[];
  media: MediaItem[];
  fieldMedia: FieldMediaItem[];
  reservations: Reservation[];
  events: PrivateEvent[];
  blocked: BlockedSlot[];
  notifications: AppNotification[];
  pricing: PricingPlan[];
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
  syncFieldMedia: () => Promise<void>;
  syncReservations: () => Promise<void>;
  syncEvents: () => Promise<void>;
  syncBlocked: () => Promise<void>;
  syncPricing: () => Promise<void>;
  syncRatings: () => Promise<void>;
  syncPages: () => Promise<void>;
  syncNotifications: () => Promise<void>;

  // Load
  loadFields: () => Promise<void>;
  loadGallery: () => Promise<void>;
  loadMedia: () => Promise<void>;
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

  // Gestion des médias de terrain (photos/vidéos par terrain)
  addFieldMediaItem: (fieldId: string, url: string, type: 'image' | 'video', thumbnail?: string | null) => Promise<FieldMediaItem>;
  deleteFieldMediaItem: (id: string) => Promise<void>;
  reorderFieldMediaItems: (ids: string[]) => Promise<void>;

  // Upload
  uploadImage: (file: File, folder?: string, bucket?: string) => Promise<string>;

  // Réservations — ✅ userId retiré (jamais réellement inséré en base) et hour → startTime/endTime
  addReservation: (r: Omit<Reservation, "id" | "createdAt" | "status" | "userId">) => Promise<Reservation>;
  setReservationStatus: (id: string, status: ReservationStatus) => Promise<void>;

  // Événements
  addEvent: (e: Omit<PrivateEvent, "id" | "createdAt" | "status" | "media" | "gallery">) => Promise<PrivateEvent>;
  setEventStatus: (id: string, status: EventStatus) => Promise<void>;

  // Disponibilités — ✅ hour → startTime/endTime
  blockSlot: (date: string, startTime: string, endTime: string, reason: string) => Promise<BlockedSlot>;
  unblockSlot: (id: string) => Promise<void>;

  // Notifications
  sendNotification: (n: Omit<AppNotification, "id" | "sentAt">) => Promise<AppNotification>;

  // Évaluations
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
      fieldMedia: [],
      reservations: [],
      events: [],
      blocked: [],
      notifications: [],
      pricing: [],
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

          await Promise.all([
            get().syncFields(),
            get().syncGallery(),
            get().syncMedia(),
            get().syncFieldMedia(),
            get().syncReservations(),
            get().syncEvents(),
            get().syncBlocked(),
            get().syncPricing(),
            get().syncRatings(),
            get().syncPages(),
            get().syncNotifications()
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
            () => { get().syncFields(); })
          .subscribe();

        supabase
          .channel('gallery-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'gallery' }, 
            () => { get().syncGallery(); })
          .subscribe();

        supabase
          .channel('media-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'media' }, 
            () => { get().syncMedia(); })
          .subscribe();

        supabase
          .channel('field-media-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'field_media' }, 
            () => { get().syncFieldMedia(); })
          .subscribe();

        supabase
          .channel('reservations-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'reservations' }, 
            () => { get().syncReservations(); })
          .subscribe();

        supabase
          .channel('events-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'private_events' }, 
            () => { get().syncEvents(); })
          .subscribe();

        supabase
          .channel('availability-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'availability' }, 
            () => { get().syncBlocked(); })
          .subscribe();

        supabase
          .channel('pricing-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'pricing' }, 
            () => { get().syncPricing(); })
          .subscribe();

        supabase
          .channel('ratings-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'ratings' }, 
            () => { get().syncRatings(); })
          .subscribe();

        supabase
          .channel('pages-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'pages' }, 
            () => { get().syncPages(); })
          .subscribe();

        supabase
          .channel('notifications-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'notifications' }, 
            () => { get().syncNotifications(); })
          .subscribe();

        console.log('✅ Canaux Realtime configurés');
      },

      // ============================================
      // SYNC - Récupération des données du backend
      // ============================================
      
      syncFields: async () => {
        try {
          const { data, error } = await supabase
            .from('fields')
            .select('*')
            .order('created_at', { ascending: true });
          
          if (error) throw error;
          set({ fields: (data || []).map(mapFieldFromDb) });
        } catch (error) {
          console.error('❌ Erreur syncFields:', error);
          set({ fields: [] });
        }
      },

      syncGallery: async () => {
        try {
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
        } catch (error) {
          console.error('❌ Erreur syncGallery:', error);
          set({ gallery: [] });
        }
      },

      syncMedia: async () => {
        try {
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
        } catch (error) {
          console.error('❌ Erreur syncMedia:', error);
          set({ media: [] });
        }
      },

      syncFieldMedia: async () => {
        try {
          const { data, error } = await supabase
            .from('field_media')
            .select('*')
            .order('sort_order', { ascending: true });

          if (error) throw error;
          set({ fieldMedia: (data || []).map(mapFieldMediaFromDb) });
        } catch (error) {
          console.error('❌ Erreur syncFieldMedia:', error);
          set({ fieldMedia: [] });
        }
      },

      // ✅ Mapping snake_case → camelCase appliqué (start_time/end_time → startTime/endTime)
      syncReservations: async () => {
        try {
          const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ reservations: (data || []).map(mapReservationFromDb) });
        } catch (error) {
          console.error('❌ Erreur syncReservations:', error);
          set({ reservations: [] });
        }
      },

      syncEvents: async () => {
        try {
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
        } catch (error) {
          console.error('❌ Erreur syncEvents:', error);
          set({ events: [] });
        }
      },

      // ✅ Mapping snake_case → camelCase appliqué
      syncBlocked: async () => {
        try {
          const { data, error } = await supabase
            .from('availability')
            .select('*')
            .order('date', { ascending: true });
          
          if (error) throw error;
          set({ blocked: (data || []).map(mapBlockedFromDb) });
        } catch (error) {
          console.error('❌ Erreur syncBlocked:', error);
          set({ blocked: [] });
        }
      },

      syncPricing: async () => {
        try {
          const { data, error } = await supabase
            .from('pricing')
            .select('*')
            .order('sort_order', { ascending: true });
          
          if (error) throw error;
          set({ pricing: data || [] });
        } catch (error) {
          console.error('❌ Erreur syncPricing:', error);
          set({ pricing: [] });
        }
      },

      syncRatings: async () => {
        try {
          const { data, error } = await supabase
            .from('ratings')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ ratings: data || [] });
        } catch (error) {
          console.error('❌ Erreur syncRatings:', error);
          set({ ratings: [] });
        }
      },

      syncPages: async () => {
        try {
          const { data, error } = await supabase
            .from('pages')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          set({ pages: data || [] });
        } catch (error) {
          console.error('❌ Erreur syncPages:', error);
          set({ pages: [] });
        }
      },

      syncNotifications: async () => {
        try {
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('sent_at', { ascending: false });
          
          if (error) throw error;
          set({ notifications: data || [] });
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
      loadRatings: async () => get().syncRatings(),
      loadReservations: async () => get().syncReservations(),
      loadPages: async () => get().syncPages(),

      // ============================================
      // UPLOAD (images + médias vidéo/audio)
      // ============================================
      uploadImage: async (file: File, folder: string = 'gallery', bucket: string = 'images') => {
        set({ uploading: true });
        try {
          const allowedTypesByBucket: Record<string, string[]> = {
            images: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
            media: [
              'image/jpeg', 'image/png', 'image/webp',
              'video/mp4', 'video/webm', 'video/quicktime',
              'audio/mpeg', 'audio/wav', 'audio/ogg',
            ],
          };
          const allowedTypes = allowedTypesByBucket[bucket] || allowedTypesByBucket.images;

          if (!allowedTypes.includes(file.type)) {
            throw new Error('Format non supporté pour ce type de fichier.');
          }

          const maxSize = bucket === 'media' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
          if (file.size > maxSize) {
            throw new Error(`Fichier trop volumineux (max ${Math.round(maxSize / (1024 * 1024))}MB)`);
          }

          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
          const filePath = `${folder}/${fileName}`;

          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          const { data: publicUrl } = supabase.storage
            .from(bucket)
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
          const insertData = sanitizeFieldData(f);

          const { data, error } = await supabase
            .from('fields')
            .insert([insertData])
            .select()
            .single();

          if (error) {
            console.error('❌ Erreur addField:', error);
            throw error;
          }
          
          await get().syncFields();
          return mapFieldFromDb(data);
        } catch (error) {
          console.error('❌ Erreur addField:', error);
          throw error;
        }
      },

      updateField: async (id, patch) => {
        try {
          const updateData: any = {};
          
          if (patch.name !== undefined) updateData.name = patch.name.trim();
          if (patch.image !== undefined) updateData.image_url = patch.image || null;
          if (patch.dimensions !== undefined) updateData.dimensions = patch.dimensions;
          if (patch.turf !== undefined) updateData.turf = patch.turf;
          if (patch.lighting !== undefined) updateData.lighting = patch.lighting;
          if (patch.lockerRooms !== undefined) updateData.locker_rooms = Number(patch.lockerRooms);
          if (patch.parking !== undefined) updateData.parking = patch.parking;
          if (patch.players !== undefined) updateData.players = patch.players;
          if (patch.pricePerHour !== undefined) updateData.price_per_hour = Number(patch.pricePerHour);
          if (patch.indoor !== undefined) updateData.indoor = patch.indoor;
          if (patch.active !== undefined) updateData.active = patch.active;

          const { error } = await supabase
            .from('fields')
            .update(updateData)
            .eq('id', id);

          if (error) {
            console.error('❌ Erreur updateField:', error);
            throw error;
          }
          
          await get().syncFields();
          const updated = get().fields.find((field) => field.id === id);
          if (!updated) throw new Error(`Terrain ${id} introuvable après mise à jour`);
          return updated;
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

          if (error) {
            // ✅ Contrainte de clé étrangère : ce terrain a des paiements/réservations
            // liés (historique réel à conserver). On donne un message clair au lieu
            // de laisser passer l'erreur Postgres brute.
            if (error.code === '23503') {
              throw new Error(
                "Impossible de supprimer ce terrain : il a des réservations ou paiements associés. Désactivez-le plutôt (interrupteur « actif ») pour le retirer du site sans perdre l'historique."
              );
            }
            throw error;
          }
          
          await get().syncFields();
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
          return result as GalleryImage;
        } catch (error) {
          console.error('❌ Erreur addGalleryImage:', error);
          throw error;
        }
      },

      updateGalleryImage: async (id, data) => {
        try {
          const { error } = await supabase
            .from('gallery')
            .update({
              alt: data.alt,
              sort_order: data.sortOrder,
              event_id: data.eventId
            })
            .eq('id', id);

          if (error) throw error;
          
          await get().syncGallery();
          const updated = get().gallery.find((g) => g.id === id);
          if (!updated) throw new Error(`Image ${id} introuvable après mise à jour`);
          return updated;
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
            .maybeSingle();

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
          return result as MediaItem;
        } catch (error) {
          console.error('❌ Erreur addMediaItem:', error);
          throw error;
        }
      },

      updateMediaItem: async (id, data) => {
        try {
          const { error } = await supabase
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
            .eq('id', id);

          if (error) throw error;
          
          await get().syncMedia();
          const updated = get().media.find((m) => m.id === id);
          if (!updated) throw new Error(`Média ${id} introuvable après mise à jour`);
          return updated;
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
            .maybeSingle();

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
        } catch (error) {
          console.error('❌ Erreur deleteMediaItem:', error);
          throw error;
        }
      },

      // ============================================
      // GESTION DES MÉDIAS DE TERRAIN (photos/vidéos par terrain)
      // ============================================
      addFieldMediaItem: async (fieldId, url, type, thumbnail) => {
        try {
          // Place le nouveau média à la fin de l'ordre actuel pour ce terrain
          const currentMax = get()
            .fieldMedia.filter((m) => m.fieldId === fieldId)
            .reduce((max, m) => Math.max(max, m.sortOrder), -1);

          const { data, error } = await supabase
            .from('field_media')
            .insert([{
              field_id: fieldId,
              url,
              type,
              thumbnail: thumbnail || null,
              sort_order: currentMax + 1,
            }])
            .select()
            .single();

          if (error) throw error;

          await get().syncFieldMedia();
          return mapFieldMediaFromDb(data);
        } catch (error) {
          console.error('❌ Erreur addFieldMediaItem:', error);
          throw error;
        }
      },

      deleteFieldMediaItem: async (id) => {
        try {
          const { data: item } = await supabase
            .from('field_media')
            .select('url')
            .eq('id', id)
            .maybeSingle();

          if (item?.url) {
            const path = item.url.split('/').pop();
            if (path) {
              await supabase.storage
                .from('media')
                .remove([`fields/${path}`])
                .catch(err => console.warn('⚠️ Erreur suppression storage:', err));
            }
          }

          const { error } = await supabase
            .from('field_media')
            .delete()
            .eq('id', id);

          if (error) throw error;

          await get().syncFieldMedia();
        } catch (error) {
          console.error('❌ Erreur deleteFieldMediaItem:', error);
          throw error;
        }
      },

      reorderFieldMediaItems: async (ids) => {
        try {
          const updates = ids.map((id, index) =>
            supabase
              .from('field_media')
              .update({ sort_order: index })
              .eq('id', id)
          );

          await Promise.all(updates);
          await get().syncFieldMedia();
        } catch (error) {
          console.error('❌ Erreur reorderFieldMediaItems:', error);
          throw error;
        }
      },

      // ============================================
      // RÉSERVATIONS — ✅ startTime/endTime au lieu de hour
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
              start_time: r.startTime,
              end_time: r.endTime,
              end_date: r.endDate || null,
              price: r.price,
              status: 'confirmed'
            }])
            .select()
            .single();

          if (error) throw error;
          
          await get().syncReservations();
          return mapReservationFromDb(data);
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
          const { error } = await supabase
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
            }]);

          if (error) throw error;

          // ✅ Pas de .select() après l'insert : un visiteur public n'a pas
          // (et ne doit pas avoir) de droit SELECT sur private_events, qui
          // contient des coordonnées personnelles. Demander à relire la ligne
          // juste insérée provoquait une fausse violation RLS.
          // On tente quand même de resynchroniser la liste admin si l'appelant
          // est déjà admin (sinon ça échoue silencieusement, sans bloquer).
          get().syncEvents().catch(() => {});

          return {
            id: '',
            firstName: e.firstName,
            lastName: e.lastName,
            company: e.company,
            phone: e.phone,
            email: e.email,
            date: e.date,
            guests: e.guests,
            type: e.type,
            message: e.message,
            status: 'new',
            createdAt: new Date().toISOString(),
            media: [],
            gallery: [],
          } as PrivateEvent;
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
        } catch (error) {
          console.error('❌ Erreur setEventStatus:', error);
          throw error;
        }
      },

      // ============================================
      // DISPONIBILITÉS — ✅ startTime/endTime au lieu de hour
      // ============================================
      blockSlot: async (date, startTime, endTime, reason) => {
        try {
          const { data, error } = await supabase
            .from('availability')
            .insert([{
              date: date,
              start_time: startTime,
              end_time: endTime,
              blocked: true,
              reason: reason || 'Bloqué par l\'administration'
            }])
            .select()
            .single();

          if (error) throw error;
          
          await get().syncBlocked();
          return mapBlockedFromDb(data);
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
              audience: n.audience || 'all',
              sent_by: null
            }])
            .select()
            .single();

          if (error) throw error;
          
          await get().syncNotifications();
          return data as AppNotification;
        } catch (error) {
          console.error('❌ Erreur sendNotification:', error);
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
          return data as Page;
        } catch (error) {
          console.error('❌ Erreur createPage:', error);
          throw error;
        }
      },

      updatePage: async (id, page) => {
        try {
          const { error } = await supabase
            .from('pages')
            .update({
              slug: page.slug,
              title: page.title,
              content: page.content,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw error;
          
          await get().syncPages();
          const updated = get().pages.find((p) => p.id === id);
          if (!updated) throw new Error(`Page ${id} introuvable après mise à jour`);
          return updated;
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
          fieldMedia: [],
          reservations: [],
          events: [],
          blocked: [],
          notifications: [],
          pricing: [],
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
      },
    }),
    {
      name: 'soccer-city-store',
      partialize: (state) => ({
        fields: state.fields,
        gallery: state.gallery,
        media: state.media,
        fieldMedia: state.fieldMedia,
        reservations: state.reservations,
        events: state.events,
        blocked: state.blocked,
        notifications: state.notifications,
        pricing: state.pricing,
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
}