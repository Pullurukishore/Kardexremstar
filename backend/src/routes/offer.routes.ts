import { Router } from 'express';
import { OfferController } from '../controllers/offerController';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get next offer reference number (for preview)
router.get('/next-reference', OfferController.getNextOfferReferenceNumberWrapper);

// Quote generation endpoints (must come before /:id route)
// Zone manager/user quote endpoint
router.get('/quote/zone/:id', OfferController.getOfferForQuoteWrapper);

// Admin quote endpoint
router.get('/quote/admin/:id', OfferController.getOfferForQuoteAdminWrapper);

// Get all offers (both admin and zone users)
router.get('/', OfferController.getOffersWrapper);

// Get single offer
router.get('/:id', OfferController.getOfferWrapper);

// Create offer (both admin and zone users)
router.post('/', OfferController.createOfferWrapper);

// Update offer (both admin and zone users)
router.put('/:id', OfferController.updateOfferWrapper);

// Update offer status
router.patch('/:id/status', OfferController.updateStatusWrapper);

// Delete offer (admin only)
router.delete('/:id', OfferController.deleteOfferWrapper);

// Add note to offer
router.post('/:id/notes', OfferController.addNoteWrapper);

export default router;
