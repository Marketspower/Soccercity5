import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

// ============================================
// VARIABLES D'ENVIRONNEMENT
// ============================================
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Vérification des variables d'environnement
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.warn('⚠️ Variables Supabase manquantes. Vérifiez votre fichier .env');
}

// ============================================
// CLIENTS SUPABASE
// ============================================

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// ============================================
// WEBSOCKET SERVER
// ============================================

let io: SocketServer | null = null;

/**
 * Initialise le serveur WebSocket
 * @param server - Serveur HTTP
 */
export const initWebSocket = (server: HttpServer): void => {
  io = new SocketServer(server, {
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connecté: ${socket.id}`);

    // Rejoindre des salles spécifiques
    socket.on('join-room', (room: string) => {
      socket.join(room);
      console.log(`📦 Client ${socket.id} a rejoint la salle: ${room}`);
    });

    // Quitter une salle
    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      console.log(`📦 Client ${socket.id} a quitté la salle: ${room}`);
    });

    // Écouter les événements personnalisés
    socket.on('custom-event', (data: any) => {
      console.log(`📨 Événement personnalisé de ${socket.id}:`, data);
      io?.emit('custom-event-response', { received: data, timestamp: new Date() });
    });

    // Déconnexion
    socket.on('disconnect', () => {
      console.log(`🔌 Client déconnecté: ${socket.id}`);
    });
  });

  console.log('✅ WebSocket Server initialisé');
};

/**
 * Envoie une notification à tous les clients connectés
 * @param event - Nom de l'événement
 * @param data - Données à envoyer
 * @param room - Salle spécifique (optionnel)
 */
export const broadcastToClients = (event: string, data: any, room?: string): void => {
  if (!io) {
    console.warn('⚠️ WebSocket non initialisé');
    return;
  }

  const payload = {
    ...data,
    timestamp: new Date().toISOString()
  };

  if (room) {
    io.to(room).emit(event, payload);
    console.log(`📡 Broadcast à la salle ${room}:`, { event, payload });
  } else {
    io.emit(event, payload);
    console.log(`📡 Broadcast à tous:`, { event, payload });
  }
};

// ============================================
// CONFIGURATION REALTIME AVEC WEBSOCKET
// ============================================

/**
 * Configure les canaux Realtime pour écouter les changements
 * et les broadcaster via WebSocket
 */
export const setupRealtimeChannels = (): void => {
  const channels = [
    {
      name: 'reservations-changes',
      table: 'reservations',
      event: 'reservation-update'
    },
    {
      name: 'events-changes',
      table: 'private_events',
      event: 'event-update'
    },
    {
      name: 'availability-changes',
      table: 'availability',
      event: 'availability-update'
    },
    {
      name: 'fields-changes',
      table: 'fields',
      event: 'fields-update'
    }
  ];

  channels.forEach(({ name, table, event }) => {
    supabase
      .channel(name)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        (payload: any) => {
          // Log du changement
          console.log(`🔄 Changement sur ${table}:`, {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            timestamp: new Date().toISOString()
          });

          // ============================================
          // BROADCAST VIA WEBSOCKET
          // ============================================
          
          // 1. Envoyer à tous les clients
          broadcastToClients(event, {
            type: payload.eventType,
            table: table,
            data: payload.new || payload.old,
            old: payload.old
          });

          // 2. Envoyer à une salle spécifique (par terrain)
          if (payload.new?.field_id) {
            broadcastToClients(
              `field-${payload.new.field_id}`,
              {
                type: payload.eventType,
                table: table,
                data: payload.new
              },
              `field-${payload.new.field_id}`
            );
          }

          // 3. Envoyer à une salle spécifique (par date)
          if (payload.new?.date) {
            broadcastToClients(
              `date-${payload.new.date}`,
              {
                type: payload.eventType,
                table: table,
                data: payload.new
              },
              `date-${payload.new.date}`
            );
          }

          // 4. Notification spéciale pour les réservations
          if (table === 'reservations') {
            if (payload.eventType === 'INSERT') {
              broadcastToClients('new-reservation', {
                message: 'Nouvelle réservation effectuée',
                reservation: payload.new
              });
            } else if (payload.eventType === 'UPDATE' && payload.old?.status !== payload.new?.status) {
              broadcastToClients('reservation-status-change', {
                message: `Statut de réservation changé: ${payload.old?.status} → ${payload.new?.status}`,
                reservation: payload.new,
                oldStatus: payload.old?.status,
                newStatus: payload.new?.status
              });
            }
          }

          // 5. Notification pour les événements
          if (table === 'private_events' && payload.eventType === 'INSERT') {
            broadcastToClients('new-event-request', {
              message: 'Nouvelle demande d\'événement',
              event: payload.new
            });
          }

          // 6. Notification pour les blocages
          if (table === 'availability' && payload.eventType === 'INSERT') {
            broadcastToClients('slot-blocked', {
              message: 'Créneau bloqué',
              slot: payload.new
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Canal ${name}: ${status}`);
      });
  });
  
  console.log('✅ Canaux Realtime configurés avec WebSocket');
};

// ============================================
// BROADCAST SUPABASE + WEBSOCKET
// ============================================

/**
 * Envoie une notification en temps réel via Supabase + WebSocket
 */
export const broadcastRealtimeUpdate = async (
  channel: string,
  event: string,
  payload: any
): Promise<void> => {
  try {
    await supabase.channel(channel).send({
      type: 'broadcast',
      event: event,
      payload: {
        ...payload,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`📡 Broadcast Supabase sur ${channel}:`, { event, payload });

    broadcastToClients(event, {
      ...payload,
      source: 'supabase'
    });

  } catch (error) {
    console.error('❌ Erreur de broadcast Realtime:', error);
  }
};

// ============================================
// FONCTIONS SPÉCIFIQUES DE BROADCAST
// ============================================

export const notifyNewReservation = (reservation: any): void => {
  broadcastToClients('new-reservation', {
    type: 'reservation',
    action: 'created',
    data: reservation
  });
};

export const notifyReservationStatusChange = (reservation: any, oldStatus: string): void => {
  broadcastToClients('reservation-status-change', {
    type: 'reservation',
    action: 'status-changed',
    data: reservation,
    oldStatus: oldStatus,
    newStatus: reservation.status
  });
};

export const notifyNewEvent = (event: any): void => {
  broadcastToClients('new-event-request', {
    type: 'event',
    action: 'created',
    data: event
  });
};

export const notifyAvailabilityChange = (availability: any): void => {
  broadcastToClients('availability-change', {
    type: 'availability',
    action: 'updated',
    data: availability
  });
};

export const notifyFieldUpdate = (field: any): void => {
  broadcastToClients('field-update', {
    type: 'field',
    action: 'updated',
    data: field
  });
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('fields')
      .select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    console.log('✅ Connexion Supabase établie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion Supabase:', error);
    return false;
  }
};

export const getTablesInfo = async () => {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des tables:', error);
    return null;
  }
};

// ============================================
// EXPORT
// ============================================

export default {
  supabase,
  supabaseAdmin,
  initWebSocket,
  setupRealtimeChannels,
  broadcastRealtimeUpdate,
  broadcastToClients,
  notifyNewReservation,
  notifyReservationStatusChange,
  notifyNewEvent,
  notifyAvailabilityChange,
  notifyFieldUpdate,
  checkSupabaseConnection,
  getTablesInfo
};