// backend/src/routes/reservations.ts
import { Router } from 'express';
import {
  getReservations,
  getReservation,
  createReservation,
  updateReservationStatus,
  deleteReservation,
  getReservationsByDate,
  getAvailableSlots
} from '../controllers/reservationController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Routes publiques
router.post('/', createReservation);
router.get('/available/:date', getAvailableSlots);

// Routes protégées (admin)
router.get('/', authenticate, requireAdmin, getReservations);
router.get('/:id', authenticate, requireAdmin, getReservation);
router.get('/date/:date', authenticate, requireAdmin, getReservationsByDate);
router.put('/:id/status', authenticate, requireAdmin, updateReservationStatus);
router.delete('/:id', authenticate, requireAdmin, deleteReservation);

export default router;