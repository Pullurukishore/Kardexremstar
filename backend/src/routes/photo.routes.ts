import { Router } from 'express';
import { EnhancedPhotoStorageService } from '../services/enhanced-photo-storage.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Get photos for a ticket
router.get('/tickets/:ticketId/photos', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const photos = await EnhancedPhotoStorageService.getTicketPhotos(Number(ticketId));
    
    res.json({
      success: true,
      photos
    });
  } catch (error) {
    console.error('Failed to get ticket photos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve photos'
    });
  }
});

// Upload photos for a ticket (called during status updates)
router.post('/tickets/:ticketId/photos', authenticate, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { photos } = req.body;
    const user = (req as any).user;

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No photos provided'
      });
    }

    const storedPhotos = await EnhancedPhotoStorageService.storePhotos(
      photos,
      {
        ticketId: Number(ticketId),
        userId: user.id,
        type: 'ticket_verification'
      }
    );

    res.json({
      success: true,
      photos: storedPhotos
    });
  } catch (error) {
    console.error('Failed to upload ticket photos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload photos'
    });
  }
});

// Upload photos for an activity (called during stage updates)
router.post('/activities/:activityId/photos', authenticate, async (req, res) => {
  try {
    const { activityId } = req.params;
    const { photos } = req.body;
    const user = (req as any).user;

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No photos provided'
      });
    }

    const storedPhotos = await EnhancedPhotoStorageService.storePhotos(
      photos,
      {
        activityId: Number(activityId),
        userId: user.id,
        type: 'activity_verification'
      }
    );

    res.json({
      success: true,
      photos: storedPhotos
    });
  } catch (error) {
    console.error('Failed to upload activity photos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload photos'
    });
  }
});

export default router;
