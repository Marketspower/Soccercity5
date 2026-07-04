import { Router } from 'express';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEventStatus,
  deleteEvent
} from '../controllers/eventController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Route publique (création)
router.post('/', createEvent);

// Routes admin
router.get('/', authenticate, requireAdmin, getEvents);
router.get('/:id', authenticate, requireAdmin, getEvent);
router.put('/:id/status', authenticate, requireAdmin, updateEventStatus);
router.delete('/:id', authenticate, requireAdmin, deleteEvent);

export default router;