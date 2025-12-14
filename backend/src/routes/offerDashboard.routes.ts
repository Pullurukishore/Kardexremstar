import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { OfferDashboardController } from '../controllers/offerDashboard.controller';

const router = Router();

router.use(authenticate);

router.get('/admin', requireRole(['ADMIN', 'EXPERT_HELPDESK']), OfferDashboardController.getAdminDashboardWrapper);
router.get('/zone', requireRole(['ZONE_USER', 'ZONE_MANAGER', 'ADMIN', 'EXPERT_HELPDESK']), OfferDashboardController.getZoneDashboardWrapper);
router.get('/zone-manager', requireRole(['ZONE_MANAGER', 'EXPERT_HELPDESK']), OfferDashboardController.getZoneManagerDashboardWrapper);

export default router;
