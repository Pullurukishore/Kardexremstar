import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

export interface PhotoUploadData {
  dataUrl: string;
  filename: string;
  timestamp: string;
  size: number;
}

export class CloudinaryService {
  /**
   * Upload photos to Cloudinary from base64 data URLs
   */
  static async uploadPhotos(
    photos: PhotoUploadData[],
    context: {
      ticketId?: number;
      activityId?: number;
      userId: number;
      type: 'ticket_verification' | 'activity_verification';
    }
  ): Promise<CloudinaryUploadResult[]> {
    const uploadPromises = photos.map(async (photo, index) => {
      try {
        // Create a unique public_id for the photo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const publicId = `kardexcare/${context.type}/${context.ticketId || context.activityId}/${timestamp}_${index + 1}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(photo.dataUrl, {
          public_id: publicId,
          folder: `kardexcare/${context.type}`,
          resource_type: 'image',
          format: 'jpg',
          quality: 'auto:good',
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' }, // Limit max size
            { quality: 'auto:good' }, // Auto quality optimization
            { fetch_format: 'auto' } // Auto format selection
          ],
          context: {
            ticket_id: context.ticketId?.toString() || '',
            activity_id: context.activityId?.toString() || '',
            user_id: context.userId.toString(),
            original_filename: photo.filename,
            captured_at: photo.timestamp,
            upload_type: context.type
          },
          tags: [
            'kardexcare',
            context.type,
            `user_${context.userId}`,
            context.ticketId ? `ticket_${context.ticketId}` : `activity_${context.activityId}`
          ]
        });

        return {
          public_id: result.public_id,
          secure_url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          created_at: result.created_at
        } as CloudinaryUploadResult;

      } catch (error) {
        console.error(`Failed to upload photo ${photo.filename}:`, error);
        throw new Error(`Failed to upload photo: ${error}`);
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      console.log(`Successfully uploaded ${results.length} photos to Cloudinary for ${context.type}`);
      return results;
    } catch (error) {
      console.error('Failed to upload photos to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Get optimized photo URL with transformations
   */
  static getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: 'auto' | 'auto:good' | 'auto:best' | number;
      format?: 'auto' | 'jpg' | 'png' | 'webp';
    } = {}
  ): string {
    const {
      width = 800,
      height = 600,
      quality = 'auto:good',
      format = 'auto'
    } = options;

    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'limit',
      quality,
      fetch_format: format,
      secure: true
    });
  }

  /**
   * Get thumbnail URL
   */
  static getThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      width: 150,
      height: 150,
      crop: 'fill',
      quality: 'auto:good',
      fetch_format: 'auto',
      secure: true
    });
  }
}

export default CloudinaryService;