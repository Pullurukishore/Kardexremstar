// backend/src/routes/reports.routes.ts
import express from 'express';
import { generateReport, exportReport, generateZoneReport, exportZoneReport, getProductTypeAnalysis, getCustomerPerformance } from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth';
const router = express.Router();

// Generate reports (Admin and Expert Helpdesk)
router.get('/general', authMiddleware(['ADMIN', 'EXPERT_HELPDESK']), generateReport);
router.get('/generate', authMiddleware(['ADMIN', 'EXPERT_HELPDESK']), generateReport);

// Export reports (Admin and Expert Helpdesk)
router.get('/general/export', authMiddleware(['ADMIN', 'EXPERT_HELPDESK']), exportReport);
router.get('/export', authMiddleware(['ADMIN', 'EXPERT_HELPDESK']), exportReport);
router.post('/export', authMiddleware(['ADMIN', 'EXPERT_HELPDESK']), exportReport);

// Generate zone reports (Zone users, zone managers, admins, and expert helpdesk)
router.get('/zone', authMiddleware(['ZONE_USER', 'ZONE_MANAGER', 'ADMIN', 'EXPERT_HELPDESK']), generateZoneReport);

// Export zone reports (Zone users, zone managers, admins, and expert helpdesk)
router.get('/zone/export', authMiddleware(['ZONE_USER', 'ZONE_MANAGER', 'ADMIN', 'EXPERT_HELPDESK']), exportZoneReport);

// Product Type Analysis Report
router.get('/product-type-analysis', authMiddleware(['ZONE_USER', 'ZONE_MANAGER', 'ADMIN', 'EXPERT_HELPDESK']), getProductTypeAnalysis);

// Customer Performance Report
router.get('/customer-performance', authMiddleware(['ZONE_USER', 'ZONE_MANAGER', 'ADMIN', 'EXPERT_HELPDESK']), getCustomerPerformance);

export default router;