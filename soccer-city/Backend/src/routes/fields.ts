import { Router } from 'express';
import {
  getFields,
  getField,
  createField,
  updateField,
  deleteField,
  getFieldAvailability
} from '../controllers/fieldController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Routes publiques
router.get('/', getFields);
router.get('/:id', getField);
router.get('/:id/availability', getFieldAvailability);

// Routes admin
router.post('/', authenticate, requireAdmin, createField);
router.put('/:id', authenticate, requireAdmin, updateField);
router.delete('/:id', authenticate, requireAdmin, deleteField);

export default router;