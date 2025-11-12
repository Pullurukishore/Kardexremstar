import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { storageConfig, initializeStorage } from '../config/storage.config';

const prisma = new PrismaClient();

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
}

export class LocalPhotoStorageService {
  
  /**
   * Initialize storage directories
   */
  static async initialize(): Promise<void> {
    initializeStorage();
  }
  
  /**
   * Store photos from base64 data URLs to filesystem and database
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
    const uploadDir = path.join(storageConfig.images, context.type + 's');
    
    // Ensure specific upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    for (const photo of photos) {
      
      try {
        // Validate file size
        if (photo.size > storageConfig.maxFileSize) {
          throw new Error(`File size ${photo.size} exceeds limit ${storageConfig.maxFileSize}`);
        }
        
        // Extract base64 data and mime type
        const matches = photo.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid data URL format');
        }
        
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Validate file type
        const extension = mimeType.split('/')[1] || 'jpg';
        if (!storageConfig.allowedImageTypes.includes(extension.toLowerCase())) {
          throw new Error(`File type ${extension} not allowed`);
        }
        
        // Generate secure filename
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        const timestamp = Date.now();
        const contextId = context.ticketId || context.activityId || context.userId;
        const uniqueFilename = `${context.type}_${contextId}_${hash}_${timestamp}.${extension}`;
        const filePath = path.join(uploadDir, uniqueFilename);
        
        // Save file to disk
        await fs.writeFile(filePath, buffer);
        
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
            size: photo.size,
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
        
        console.log(`✅ Stored photo: ${uniqueFilename} (${photo.size} bytes)`);
        
      } catch (error) {
        console.error(`❌ Failed to store photo ${photo.filename}:`, error);
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
      console.error(`Failed to retrieve photo ${attachmentId}:`, error);
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
      console.error(`Failed to get photo path ${attachmentId}:`, error);
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
        console.log(`🗑️ Deleted file: ${attachment.path}`);
      } catch (error) {
        console.warn(`Failed to delete file ${attachment.path}:`, error);
      }
      
      // Delete from database
      await prisma.attachment.delete({
        where: { id: attachmentId }
      });
      
      return true;
      
    } catch (error) {
      console.error(`Failed to delete photo ${attachmentId}:`, error);
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
          console.log(`🧹 Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }
}
