import { CapturedPhoto } from '@/components/photo/PhotoCapture';
import api from '@/lib/api/axios';

export interface PhotoUploadResponse {
  success: boolean;
  photos?: {
    id: number;
    filename: string;
    url: string; // Local storage URL
    path: string; // File system path
    size: number;
    mimeType: string;
    createdAt: string;
  }[];
  error?: string;
}

export class PhotoUploadService {
  /**
   * Upload photos to backend (which will store them in local storage)
   */
  static async uploadPhotos(
    photos: CapturedPhoto[],
    context: {
      ticketId?: number;
      activityId?: number;
      type: 'ticket_verification' | 'activity_verification';
    }
  ): Promise<PhotoUploadResponse> {
    try {
      const endpoint = context.type === 'ticket_verification' 
        ? `/tickets/${context.ticketId}/photos`
        : `/activities/${context.activityId}/photos`;

      const response = await api.post(endpoint, {
        photos: photos.map(photo => ({
          dataUrl: photo.dataUrl,
          filename: photo.filename,
          timestamp: photo.timestamp,
          size: photo.size
        }))
      });

      return response.data;

    } catch (error) {
      console.error('Photo upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Get photos for a ticket
   */
  static async getTicketPhotos(ticketId: number): Promise<PhotoUploadResponse> {
    try {
      const response = await api.get(`/tickets/${ticketId}/photos`);
      return response.data;

    } catch (error) {
      console.error('Failed to fetch ticket photos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch photos'
      };
    }
  }

  /**
   * Get photos for an activity
   */
  static async getActivityPhotos(activityId: number): Promise<PhotoUploadResponse> {
    try {
      const response = await api.get(`/activities/${activityId}/photos`);
      return response.data;

    } catch (error) {
      console.error('Failed to fetch activity photos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch photos'
      };
    }
  }

  /**
   * Delete photos
   */
  static async deletePhotos(photoIds: number[]): Promise<PhotoUploadResponse> {
    try {
      const response = await api.delete('/photos/delete', {
        data: { photoIds }
      });
      return response.data;

    } catch (error) {
      console.error('Photo deletion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }
}

export default PhotoUploadService;
