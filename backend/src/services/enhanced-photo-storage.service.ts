import prisma from '../config/db';
import CloudinaryService, { PhotoUploadData, CloudinaryUploadResult } from './cloudinary.service';

export interface StoredPhotoResult {
  id: number;
  filename: string;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  publicId: string;
  size: number;
  createdAt: Date;
}

export class EnhancedPhotoStorageService {
  /**
   * Store photos in Cloudinary and save metadata to database
   */
  static async storePhotos(
    photos: PhotoUploadData[],
    context: {
      ticketId?: number;
      activityId?: number;
      userId: number;
      type: 'ticket_verification' | 'activity_verification';
    }
  ): Promise<StoredPhotoResult[]> {
    try {
      // Upload to Cloudinary
      const cloudinaryResults = await CloudinaryService.uploadPhotos(photos, context);
      
      // Store metadata in database
      const storedPhotos: StoredPhotoResult[] = [];
      
      for (let i = 0; i < cloudinaryResults.length; i++) {
        const cloudinaryResult = cloudinaryResults[i];
        const originalPhoto = photos[i];
        
        // Create attachment record with Cloudinary public_id in filename for reference
        const attachment = await prisma.attachment.create({
          data: {
            filename: `${originalPhoto.filename}_${cloudinaryResult.public_id.split('/').pop()}`,
            path: cloudinaryResult.secure_url,
            mimeType: `image/${cloudinaryResult.format}`,
            size: cloudinaryResult.bytes,
            ticketId: context.ticketId || null, // Use null for activity photos
            uploadedById: context.userId
          }
        });

        storedPhotos.push({
          id: attachment.id,
          filename: attachment.filename,
          cloudinaryUrl: cloudinaryResult.secure_url,
          thumbnailUrl: CloudinaryService.getThumbnailUrl(cloudinaryResult.public_id),
          publicId: cloudinaryResult.public_id,
          size: cloudinaryResult.bytes,
          createdAt: attachment.createdAt
        });
      }

      console.log(`Successfully stored ${storedPhotos.length} photos for ${context.type}`);
      return storedPhotos;

    } catch (error) {
      console.error('Failed to store photos:', error);
      console.error('Context:', context);
      console.error('Photos count:', photos.length);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw new Error(`Failed to store photos: ${error}`);
    }
  }

  /**
   * Get photos for a ticket
   */
  static async getTicketPhotos(ticketId: number): Promise<StoredPhotoResult[]> {
    try {
      const attachments = await prisma.attachment.findMany({
        where: {
          ticketId: ticketId,
          path: {
            contains: 'cloudinary.com' // Only get Cloudinary photos
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return attachments.map(attachment => {
        // Extract public_id from filename (stored as originalname_publicid)
        const publicId = attachment.filename.split('_').pop() || '';
        
        return {
          id: attachment.id,
          filename: attachment.filename,
          cloudinaryUrl: attachment.path,
          thumbnailUrl: publicId ? CloudinaryService.getThumbnailUrl(`kardexcare/ticket_verification/${ticketId}/${publicId}`) : attachment.path,
          publicId: `kardexcare/ticket_verification/${ticketId}/${publicId}`,
          size: attachment.size,
          createdAt: attachment.createdAt
        };
      });

    } catch (error) {
      console.error(`Failed to get photos for ticket ${ticketId}:`, error);
      return [];
    }
  }
}

export default EnhancedPhotoStorageService;