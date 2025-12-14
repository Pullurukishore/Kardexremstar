import { Router } from 'express';
import { SparePartController } from '../controllers/sparePartController';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Get all spare parts (both admin and zone users)
router.get('/', requireRole(['ADMIN', 'ZONE_USER', 'EXPERT_HELPDESK']), SparePartController.getSparePartsWrapper);

// Get spare part categories
router.get('/categories', requireRole(['ADMIN', 'ZONE_USER', 'EXPERT_HELPDESK']), SparePartController.getCategoriesWrapper);

// Get single spare part
router.get('/:id', requireRole(['ADMIN', 'ZONE_USER', 'EXPERT_HELPDESK']), SparePartController.getSparePartWrapper);

// Create spare part (admin and expert helpdesk)
router.post('/', requireRole(['ADMIN', 'EXPERT_HELPDESK']), SparePartController.createSparePartWrapper);

// Update spare part (admin and expert helpdesk)
router.put('/:id', requireRole(['ADMIN', 'EXPERT_HELPDESK']), SparePartController.updateSparePartWrapper);

// Delete spare part (admin and expert helpdesk)
router.delete('/:id', requireRole(['ADMIN', 'EXPERT_HELPDESK']), SparePartController.deleteSparePartWrapper);

// Bulk update prices (admin and expert helpdesk)
router.put('/bulk-update', requireRole(['ADMIN', 'EXPERT_HELPDESK']), SparePartController.bulkUpdatePricesWrapper);

export default router;
