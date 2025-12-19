/**
 * ⚠️ DEPRECATED - DO NOT USE ⚠️
 * 
 * This service uploads photos to CLOUDINARY (external cloud).
 * Company policy requires all images to stay within the network.
 * 
 * Use PhotoStorageService or LocalPhotoStorageService instead,
 * which store files locally on the server.
 * 
 * @deprecated Use PhotoStorageService for local storage
 */

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

/**
 * @deprecated This class uploads to Cloudinary. Use PhotoStorageService instead.
 */
export class EnhancedPhotoStorageService {
  /**
   * @deprecated Use PhotoStorageService.storePhotos() instead
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
        if (context.ticketId) {
          // For ticket photos, store in Attachment table
          const attachment = await prisma.attachment.create({
            data: {
              filename: `${originalPhoto.filename}_${cloudinaryResult.public_id.split('/').pop()}`,
              path: cloudinaryResult.secure_url,
              mimeType: `image/${cloudinaryResult.format}`,
              size: cloudinaryResult.bytes,
              ticketId: context.ticketId,
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
        } else {
          // For activity photos, store only in Cloudinary (no database record)
          storedPhotos.push({
            id: Date.now() + i, // Temporary ID for activity photos
            filename: `${originalPhoto.filename}_${cloudinaryResult.public_id.split('/').pop()}`,
            cloudinaryUrl: cloudinaryResult.secure_url,
            thumbnailUrl: CloudinaryService.getThumbnailUrl(cloudinaryResult.public_id),
            publicId: cloudinaryResult.public_id,
            size: cloudinaryResult.bytes,
            createdAt: new Date() // Use current date for activity photos
          });
        }
      }

      return storedPhotos;

    } catch (error) {
      if (error instanceof Error) {
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
      return [];
    }
  }
}

export default EnhancedPhotoStorageService;