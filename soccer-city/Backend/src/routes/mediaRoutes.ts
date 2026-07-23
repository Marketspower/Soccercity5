// backend/src/routes/mediaRoutes.ts
import { Router } from 'express';
import {
  getMedia,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
  getMediaByEvent,
  getEventVideos,
  getEventGallery,
  getFeaturedMedia
} from '../controllers/mediaController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Routes publiques
router.get('/', getMedia);
router.get('/featured', getFeaturedMedia);
router.get('/:id', getMediaById);
router.get('/event/:eventId', getMediaByEvent);
router.get('/event/:eventId/videos', getEventVideos);
router.get('/event/:eventId/gallery', getEventGallery);

// Routes admin
router.post('/', authenticate, requireAdmin, createMedia);
router.put('/:id', authenticate, requireAdmin, updateMedia);
router.delete('/:id', authenticate, requireAdmin, deleteMedia);

export default router;