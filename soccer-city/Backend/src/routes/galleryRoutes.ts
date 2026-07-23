// backend/src/routes/galleryRoutes.ts
import { Router } from 'express';
import {
  getGalleryImages,
  uploadGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
  getGalleryByEvent
} from '../controllers/galleryController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Routes publiques
router.get('/', getGalleryImages);
router.get('/event/:eventId', getGalleryByEvent);

// Routes admin
router.post('/', authenticate, requireAdmin, uploadGalleryImage);
router.delete('/:id', authenticate, requireAdmin, deleteGalleryImage);
router.put('/reorder', authenticate, requireAdmin, reorderGalleryImages);

export default router;