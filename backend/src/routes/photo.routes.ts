import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EnhancedPhotoStorageService } from '../services/enhanced-photo-storage.service';
import { authenticate } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

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

// Get photos for an activity
router.get('/activities/:activityId/photos', authenticate, async (req, res) => {
  try {
    const { activityId } = req.params;
    
    // For activities, photos are stored in local storage and referenced in ActivityStage notes
    // We need to extract photo URLs from the activity stages
    const activity = await prisma.dailyActivityLog.findUnique({
      where: { id: Number(activityId) },
      include: {
        ActivityStage: {
          orderBy: { startTime: 'asc' }
        }
      }
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    // Extract photos from activity stage metadata and notes
    const photos: any[] = [];
    let photoIndex = 1;

    activity.ActivityStage.forEach(stage => {
      // Check if stage has photos in metadata
      if (stage.metadata && typeof stage.metadata === 'object') {
        const metadata = stage.metadata as any;
        if (metadata.photos && metadata.photos.localUrls && Array.isArray(metadata.photos.localUrls)) {
          metadata.photos.localUrls.forEach((url: string, index: number) => {
            photos.push({
              id: `${stage.id}_${index}`,
              filename: `${stage.stage}_photo_${index + 1}.jpg`,
              url: url,
              size: metadata.photos.totalSize ? Math.floor(metadata.photos.totalSize / metadata.photos.photoCount) : 35000,
              mimeType: 'image/jpeg',
              createdAt: stage.startTime || stage.createdAt
            });
          });
        }
      }

      // Also check notes for photo URLs (fallback)
      if (stage.notes && stage.notes.includes('/storage/images/')) {
        const urlRegex = /\/storage\/images\/[^\s,]+/g;
        const urls = stage.notes.match(urlRegex) || [];
        urls.forEach((url, index) => {
          // Only add if not already added from metadata
          const exists = photos.some(p => p.url === url);
          if (!exists) {
            photos.push({
              id: `${stage.id}_note_${index}`,
              filename: `${stage.stage}_photo_${photoIndex}.jpg`,
              url: url,
              size: 35000, // Default size
              mimeType: 'image/jpeg',
              createdAt: stage.startTime || stage.createdAt
            });
            photoIndex++;
          }
        });
      }
    });

    res.json({
      success: true,
      photos
    });
  } catch (error) {
    console.error('Failed to get activity photos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve photos'
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
