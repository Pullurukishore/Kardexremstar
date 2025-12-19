import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { storageConfig, initializeStorage } from '../config/storage.config';
import prisma from '../config/db';

export interface PhotoData {
  filename: string;
  dataUrl: string;
  size: number;
  timestamp: string;
}

export interface StoredPhoto {
  id: number;
  filename: string;
  path: string;
  url: string; // Serving URL
  size: number;
  mimeType: string;
  createdAt: Date;
  originalSize?: number;
  compressed?: boolean;
}

export class LocalPhotoStorageService {

  /**
   * Initialize storage directories
   */
  static async initialize(): Promise<void> {
    initializeStorage();
  }

  /**
   * Compress image buffer using sharp
   */
  private static async compressImage(
    buffer: Buffer,
    mimeType: string
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
    const config = storageConfig.compression;

    if (!config.enabled) {
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      return { buffer, mimeType, extension: ext };
    }

    try {
      let sharpInstance = sharp(buffer);

      sharpInstance = sharpInstance.resize(config.maxWidth, config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      if (config.convertToWebp) {
        const compressedBuffer = await sharpInstance
          .webp({ quality: config.webpQuality })
          .toBuffer();
        return { buffer: compressedBuffer, mimeType: 'image/webp', extension: 'webp' };
      } else {
        const compressedBuffer = await sharpInstance
          .jpeg({ quality: config.jpegQuality, mozjpeg: true })
          .toBuffer();
        return { buffer: compressedBuffer, mimeType: 'image/jpeg', extension: 'jpg' };
      }
    } catch (error) {
      console.error('Image compression failed, using original:', error);
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      return { buffer, mimeType, extension: ext };
    }
  }

  /**
   * Store photos from base64 data URLs to filesystem and database
   * Images are automatically compressed to save storage space
   */
  static async storePhotos(
    photos: PhotoData[],
    context: {
      ticketId?: number;
      activityId?: number;
      userId: number;
      type: 'ticket' | 'activity' | 'profile';
    }
  ): Promise<StoredPhoto[]> {
    await this.initialize();

    const storedPhotos: StoredPhoto[] = [];
    const folderMap: Record<string, string> = {
      'ticket': 'tickets',
      'activity': 'activities',
      'profile': 'profiles'
    };
    const uploadDir = path.join(storageConfig.images, folderMap[context.type] || context.type + 's');

    await fs.mkdir(uploadDir, { recursive: true });

    for (const photo of photos) {
      try {
        if (photo.size > storageConfig.maxFileSize) {
          throw new Error(`File size ${photo.size} exceeds limit ${storageConfig.maxFileSize}`);
        }

        const matches = photo.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid data URL format');
        }

        const originalMimeType = matches[1];
        const base64Data = matches[2];
        const originalBuffer = Buffer.from(base64Data, 'base64');
        const originalSize = originalBuffer.length;

        // Compress the image
        const { buffer, mimeType, extension } = await this.compressImage(originalBuffer, originalMimeType);

        // Validate file type
        if (!storageConfig.allowedImageTypes.includes(extension.toLowerCase())) {
          throw new Error(`File type ${extension} not allowed`);
        }

        // Generate descriptive filename with date/time for easy identification
        const hash = crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
        const contextId = context.ticketId || context.activityId || context.userId;
        const uniqueFilename = `${context.type}_${contextId}_${dateStr}_${timeStr}_${hash}.${extension}`;
        const filePath = path.join(uploadDir, uniqueFilename);

        // Save compressed file to disk
        await fs.writeFile(filePath, buffer);

        const compressionRatio = originalSize > 0 ? Math.round((1 - buffer.length / originalSize) * 100) : 0;
        if (compressionRatio > 0) {
          console.log(`📦 Compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(buffer.length / 1024).toFixed(1)}KB (${compressionRatio}% saved)`);
        }

        // Generate serving URL
        const relativePath = path.relative(storageConfig.root, filePath).replace(/\\/g, '/');
        const servingUrl = `/storage/${relativePath}`;

        // Save to database (only for tickets, not activities)
        if (context.ticketId) {
          // For ticket photos, store in database
          const attachmentData: any = {
            filename: photo.filename,
            path: filePath,
            mimeType,
            size: buffer.length,
            uploadedById: context.userId,
            ticketId: context.ticketId,
          };

          const attachment = await prisma.attachment.create({
            data: attachmentData
          });

          storedPhotos.push({
            id: attachment.id,
            filename: attachment.filename,
            path: attachment.path,
            url: servingUrl,
            size: attachment.size,
            mimeType: attachment.mimeType,
            createdAt: attachment.createdAt,
          });
        } else {
          // For activity photos, don't store in database (just return file info)
          const photoResult = {
            id: Math.floor(Date.now() + Math.random() * 1000), // Temporary ID for activities
            filename: photo.filename,
            path: filePath,
            url: servingUrl,
            size: photo.size,
            mimeType: mimeType,
            createdAt: new Date(),
          };

          storedPhotos.push(photoResult);
        }

      } catch (error) {
        // Continue with other photos
      }
    }

    return storedPhotos;
  }

  /**
   * Get photo as base64 data URL (for API responses)
   */
  static async getPhotoAsDataUrl(attachmentId: number): Promise<string | null> {
    try {
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId }
      });

      if (!attachment) {
        return null;
      }

      const buffer = await fs.readFile(attachment.path);
      const base64 = buffer.toString('base64');
      return `data:${attachment.mimeType};base64,${base64}`;

    } catch (error) {
      return null;
    }
  }

  /**
   * Get photo file path for direct serving
   */
  static async getPhotoPath(attachmentId: number): Promise<string | null> {
    try {
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId }
      });

      return attachment?.path || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete photo from filesystem and database
   */
  static async deletePhoto(attachmentId: number): Promise<boolean> {
    try {
      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId }
      });

      if (!attachment) {
        return false;
      }

      // Delete file from disk
      try {
        await fs.unlink(attachment.path);
      } catch (error) {
      }

      // Delete from database
      await prisma.attachment.delete({
        where: { id: attachmentId }
      });

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Get all photos for a ticket with serving URLs
   */
  static async getTicketPhotos(ticketId: number): Promise<StoredPhoto[]> {
    const attachments = await prisma.attachment.findMany({
      where: {
        ticketId,
        mimeType: {
          startsWith: 'image/'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return attachments.map(att => {
      const relativePath = path.relative(storageConfig.root, att.path).replace(/\\/g, '/');
      return {
        id: att.id,
        filename: att.filename,
        path: att.path,
        url: `/storage/${relativePath}`,
        size: att.size,
        mimeType: att.mimeType,
        createdAt: att.createdAt,
      };
    });
  }

  /**
   * Clean up temporary files older than retention period
   */
  static async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = storageConfig.temp;
      const retentionMs = storageConfig.tempRetentionHours * 60 * 60 * 1000;
      const cutoffTime = Date.now() - retentionMs;

      const files = await fs.readdir(tempDir);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
    }
  }
}
