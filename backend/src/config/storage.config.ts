import path from 'path';
import fs from 'fs';

export interface StorageConfig {
  root: string;
  images: string;
  documents: string;
  backups: string;
  temp: string;
  maxFileSize: number;
  maxPhotosPerUpload: number;
  allowedImageTypes: string[];
  allowedDocumentTypes: string[];
  tempRetentionHours: number;
  backupRetentionDays: number;
}

// Default storage configuration
const defaultConfig: StorageConfig = {
  root: process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage'),
  images: process.env.UPLOAD_DIR || path.join(process.cwd(), 'storage', 'images'),
  documents: process.env.DOCUMENT_DIR || path.join(process.cwd(), 'storage', 'documents'),
  backups: process.env.BACKUP_DIR || path.join(process.cwd(), 'storage', 'backups'),
  temp: process.env.TEMP_DIR || path.join(process.cwd(), 'storage', 'temp'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  maxPhotosPerUpload: parseInt(process.env.MAX_PHOTOS_PER_UPLOAD || '10'),
  allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'jpg,jpeg,png,webp').split(','),
  allowedDocumentTypes: (process.env.ALLOWED_DOCUMENT_TYPES || 'pdf,doc,docx').split(','),
  tempRetentionHours: parseInt(process.env.TEMP_FILE_RETENTION_HOURS || '24'),
  backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
};

// Ensure all directories exist
export function initializeStorage(): void {
  const dirs = [
    defaultConfig.root,
    defaultConfig.images,
    path.join(defaultConfig.images, 'tickets'),
    path.join(defaultConfig.images, 'activities'),
    path.join(defaultConfig.images, 'profiles'),
    defaultConfig.documents,
    path.join(defaultConfig.documents, 'tickets'),
    path.join(defaultConfig.documents, 'reports'),
    defaultConfig.backups,
    path.join(defaultConfig.backups, 'daily'),
    path.join(defaultConfig.backups, 'weekly'),
    defaultConfig.temp,
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created storage directory: ${dir}`);
    }
  });
}

export const storageConfig = defaultConfig;
