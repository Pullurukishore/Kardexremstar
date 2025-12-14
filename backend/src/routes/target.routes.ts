import { Router } from 'express';
import { TargetController } from '../controllers/targetController';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Zone Targets - Admin only for write operations, Zone users can view their zone
router.post('/zones', TargetController.setZoneTargetWrapper);
router.put('/zones/:targetId', TargetController.updateZoneTargetWrapper);
router.get('/zones/:zoneId/details', TargetController.getZoneTargetDetailsWrapper); // Get detailed zone target info - MUST come before generic /zones
router.get('/zones', TargetController.getZoneTargetsWrapper); // Allow zone users to view
router.delete('/zones/:targetId', TargetController.deleteZoneTargetWrapper);

// User Targets - Admin only for write operations, Zone users can view their zone users
router.post('/users', TargetController.setUserTargetWrapper);
router.put('/users/:targetId', TargetController.updateUserTargetWrapper);
router.get('/users/:userId/details', TargetController.getUserTargetDetailsWrapper); // Get detailed user target info - MUST come before generic /users
router.get('/users', TargetController.getUserTargetsWrapper); // Allow zone users to view
router.delete('/users/:targetId', TargetController.deleteUserTargetWrapper);

// Dashboard - Allow zone users to view their zone
router.get('/dashboard', TargetController.getTargetDashboardWrapper);

// Dashboard Summary - For admin dashboard display
router.get('/summary', TargetController.getTargetsSummaryWrapper);

export default router;
