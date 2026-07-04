import { Router } from 'express';
import {
  getDashboardStats,
  getRecentActivity,
  blockSlot,
  unblockSlot,
  updatePricing,
  getUsers,
  sendNotification
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Toutes les routes admin requièrent authentification et rôle admin
router.use(authenticate, requireAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/activity', getRecentActivity);
router.get('/users', getUsers);

router.post('/availability/block', blockSlot);
router.delete('/availability/unblock/:id', unblockSlot);

router.put('/pricing/:fieldId', updatePricing);

router.post('/notifications', sendNotification);

export default router;