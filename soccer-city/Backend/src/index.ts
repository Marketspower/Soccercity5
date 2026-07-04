import app from './app';
import { createServer } from 'http';
import { initWebSocket } from './services/realtimeService';

const PORT = process.env.PORT || 5000;

// Créer le serveur HTTP
const server = createServer(app);

// Initialiser WebSocket
initWebSocket(server);

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/socket.io/`);
});

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

export default server;