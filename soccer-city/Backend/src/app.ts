import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fieldRoutes from './routes/galleryRoutes';
import reservationRoutes from './routes/reservations';
import eventRoutes from './routes/events';
import adminRoutes from './routes/admin';

// Charger les variables d'environnement
dotenv.config();

const app = express();

// Sécurité - Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.SUPABASE_URL || ''],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// CORS - CORRIGÉ
app.use(cors({
  origin: '*', // Pour le développement - en production, spécifiez votre domaine
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📝 ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/fields', fieldRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: 'La ressource demandée n\'existe pas'
  });
});

// Gestion des erreurs
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Erreur:', err);
  
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Erreur de validation',
      details: err.message
    });
    return;
  }

  if (err.code === '23505') {
    res.status(409).json({
      error: 'Conflit de données',
      details: 'Cette entrée existe déjà'
    });
    return;
  }

  res.status(500).json({
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

export default app;