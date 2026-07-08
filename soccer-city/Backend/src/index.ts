import app from './app';
import { createServer } from 'http';
import { initWebSocket, setupRealtimeChannels, checkSupabaseConnection } from './services/realtimeService';

const PORT = process.env.PORT || 5000;

// Créer le serveur HTTP
const server = createServer(app);

// Fonction d'initialisation
const initializeServer = async () => {
  try {
    // Vérifier la connexion Supabase
    const isConnected = await checkSupabaseConnection();
    
    if (isConnected) {
      console.log('✅ Connexion Supabase établie');
      // Initialiser WebSocket
      initWebSocket(server);
      // Configurer les canaux Realtime
      setupRealtimeChannels();
    } else {
      console.warn('⚠️ Supabase non connecté - WebSocket désactivé');
    }

    // Démarrer le serveur
    server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io/`);
      console.log(`📡 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
};

// Lancer l'initialisation
initializeServer();

// Gestion des erreurs
server.on('error', (error) => {
  console.error('❌ Erreur serveur:', error);
});

// Arrêt gracieux
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT reçu, arrêt du serveur...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    process.exit(0);
  });
});

export default server;