import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../config/db';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import archiver from 'archiver';
import { storageConfig } from '../config/storage.config';

const router = Router();

/**
 * Image Management API Routes
 * Admin-only endpoints for bulk image operations
 * Path: /api/image-management/*
 */

// All routes require authentication (admin access controlled by route path)
router.use(authenticate);

interface ImageStats {
    totalImages: number;
    totalSizeBytes: number;
    byMonth: { month: string; count: number; sizeBytes: number }[];
    byType: { type: string; count: number; sizeBytes: number }[];
}

/**
 * GET /api/image-management/stats
 * Get storage statistics - scans both DB and file system
 */
router.get('/stats', async (_req: Request, res: Response) => {
    try {
        const monthMap = new Map<string, { count: number; sizeBytes: number }>();
        let totalImages = 0;
        let totalSizeBytes = 0;
        let ticketCount = 0;
        let ticketSize = 0;
        let otherCount = 0;
        let otherSize = 0;

        // 1. Get DB attachments (for proper metadata)
        const attachments = await prisma.attachment.findMany({
            where: { mimeType: { startsWith: 'image/' } },
            select: { path: true, size: true, createdAt: true },
        });

        const dbPaths = new Set(attachments.map(a => path.basename(a.path)));

        // Add DB images to stats
        for (const a of attachments) {
            ticketCount++;
            ticketSize += a.size;
            totalImages++;
            totalSizeBytes += a.size;

            const month = a.createdAt.toISOString().slice(0, 7);
            const existing = monthMap.get(month) || { count: 0, sizeBytes: 0 };
            monthMap.set(month, {
                count: existing.count + 1,
                sizeBytes: existing.sizeBytes + a.size,
            });
        }

        // 2. Scan file system for additional images
        const foldersToScan = ['tickets', 'activities', 'activitys', 'legacy'];

        for (const folder of foldersToScan) {
            const folderPath = path.join(storageConfig.images, folder);
            try {
                if (!fsSync.existsSync(folderPath)) continue;

                const files = await fs.readdir(folderPath, { recursive: true });
                for (const file of files) {
                    const filename = file.toString();
                    const filePath = path.join(folderPath, filename);

                    try {
                        const stat = await fs.stat(filePath);
                        if (!stat.isFile()) continue;

                        // Skip if already counted from DB
                        if (dbPaths.has(path.basename(filename))) continue;

                        // Check if it's an image
                        const ext = path.extname(filename).toLowerCase();
                        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) continue;

                        // Add to stats
                        if (folder === 'tickets') {
                            ticketCount++;
                            ticketSize += stat.size;
                        } else {
                            otherCount++;
                            otherSize += stat.size;
                        }

                        totalImages++;
                        totalSizeBytes += stat.size;

                        const month = stat.mtime.toISOString().slice(0, 7);
                        const existing = monthMap.get(month) || { count: 0, sizeBytes: 0 };
                        monthMap.set(month, {
                            count: existing.count + 1,
                            sizeBytes: existing.sizeBytes + stat.size,
                        });
                    } catch { }
                }
            } catch { }
        }

        const byMonth = Array.from(monthMap.entries())
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => b.month.localeCompare(a.month));

        const byType = [
            { type: 'Ticket Photos', count: ticketCount, sizeBytes: ticketSize },
            { type: 'Activity/Other Photos', count: otherCount, sizeBytes: otherSize },
        ];

        const stats: ImageStats = {
            totalImages,
            totalSizeBytes,
            byMonth,
            byType,
        };

        res.json(stats);
    } catch (error) {
        console.error('Failed to get image stats:', error);
        res.status(500).json({ error: 'Failed to get image statistics' });
    }
});

/**
 * GET /api/image-management/images
 * List all images with filters - combines DB records with file system scan
 */
router.get('/images', async (req: Request, res: Response) => {
    try {
        const { from, to, page = '1', limit = '100' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);

        const fromDate = from ? new Date(from as string) : null;
        const toDate = to ? new Date(to as string) : null;

        // Collect all images from both DB and file system
        interface ImageItem {
            id: number;
            filename: string;
            url: string;
            path: string;
            size: number;
            sizeFormatted: string;
            createdAt: Date;
            type: string;
            ticketId: number | null;
            ticketTitle: string;
        }

        const allImages: ImageItem[] = [];
        let imageId = 10000; // Start IDs for file-only images high to avoid conflicts

        // 1. Get images from database (these have proper metadata)
        const dbImages = await prisma.attachment.findMany({
            where: { mimeType: { startsWith: 'image/' } },
            select: {
                id: true,
                filename: true,
                path: true,
                size: true,
                createdAt: true,
                ticketId: true,
                ticket: { select: { title: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const dbPaths = new Set(dbImages.map(img => path.basename(img.path)));

        for (const img of dbImages) {
            allImages.push({
                id: img.id,
                filename: img.filename,
                url: `/storage/images/tickets/${path.basename(img.path)}`,
                path: img.path,
                size: img.size,
                sizeFormatted: formatBytes(img.size),
                createdAt: img.createdAt,
                type: 'ticket',
                ticketId: img.ticketId,
                ticketTitle: img.ticket?.title || `Ticket #${img.ticketId}`,
            });
        }

        // 2. Scan file system for additional images not in DB
        const foldersToScan = ['tickets', 'activities', 'activitys', 'legacy'];

        for (const folder of foldersToScan) {
            const folderPath = path.join(storageConfig.images, folder);
            try {
                if (!fsSync.existsSync(folderPath)) continue;

                const files = await fs.readdir(folderPath, { recursive: true });
                for (const file of files) {
                    const filename = file.toString();
                    const filePath = path.join(folderPath, filename);

                    try {
                        const stat = await fs.stat(filePath);
                        if (!stat.isFile()) continue;

                        // Skip if already in DB
                        if (dbPaths.has(path.basename(filename))) continue;

                        // Check if it's an image
                        const ext = path.extname(filename).toLowerCase();
                        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) continue;

                        // Extract ticket ID from filename if possible (e.g., ticket_45_...)
                        let ticketId: number | null = null;
                        const ticketMatch = filename.match(/ticket_(\d+)_/);
                        if (ticketMatch) ticketId = parseInt(ticketMatch[1]);

                        allImages.push({
                            id: imageId++,
                            filename: path.basename(filename),
                            url: `/storage/images/${folder}/${filename.replace(/\\/g, '/')}`,
                            path: filePath,
                            size: stat.size,
                            sizeFormatted: formatBytes(stat.size),
                            createdAt: stat.mtime,
                            type: folder === 'tickets' ? 'ticket' : 'activity',
                            ticketId,
                            ticketTitle: ticketId ? `Ticket #${ticketId}` : folder,
                        });
                    } catch { }
                }
            } catch { }
        }

        // Apply date filters
        let filtered = allImages;
        if (fromDate) {
            filtered = filtered.filter(img => img.createdAt >= fromDate);
        }
        if (toDate) {
            filtered = filtered.filter(img => img.createdAt <= toDate);
        }

        // Sort by date descending
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Paginate
        const total = filtered.length;
        const skip = (pageNum - 1) * limitNum;
        const paged = filtered.slice(skip, skip + limitNum);

        res.json({
            images: paged,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('Failed to list images:', error);
        res.status(500).json({ error: 'Failed to list images' });
    }
});

/**
 * POST /api/image-management/bulk-download
 * Download selected images as ZIP
 */
router.post('/bulk-download', async (req: Request, res: Response) => {
    try {
        const { imageIds } = req.body as { imageIds: number[] };

        if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
            return res.status(400).json({ error: 'No images selected' });
        }

        if (imageIds.length > 100) {
            return res.status(400).json({ error: 'Maximum 100 images per download' });
        }

        // Get image paths from DB
        const images = await prisma.attachment.findMany({
            where: { id: { in: imageIds } },
            select: { id: true, filename: true, path: true },
        });

        if (images.length === 0) {
            return res.status(404).json({ error: 'No images found' });
        }

        // Create ZIP file
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const zipFilename = `images_export_${timestamp}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        const archive = archiver('zip', { zlib: { level: 5 } });
        archive.pipe(res);

        let filesAdded = 0;
        for (const img of images) {
            try {
                // Try the stored path first, then fallback to resolved path
                let filePath = img.path;

                // If relative path, resolve against storage root
                if (!path.isAbsolute(filePath)) {
                    filePath = path.resolve(process.cwd(), filePath);
                }

                // Try storage images path as fallback
                if (!fsSync.existsSync(filePath)) {
                    filePath = path.join(storageConfig.images, 'tickets', path.basename(img.path));
                }

                if (fsSync.existsSync(filePath)) {
                    archive.file(filePath, { name: img.filename || path.basename(filePath) });
                    filesAdded++;
                } else {
                    console.warn(`File not found: ${img.path}`);
                }
            } catch (err) {
                console.error(`Failed to add file to ZIP: ${img.path}`, err);
            }
        }

        if (filesAdded === 0) {
            // No files found, return error instead of empty zip
            if (!res.headersSent) {
                return res.status(404).json({ error: 'No image files found on disk' });
            }
        }

        await archive.finalize();
    } catch (error) {
        console.error('Failed to create ZIP:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to create ZIP file' });
        }
    }
});

/**
 * DELETE /api/image-management/bulk-delete
 * Delete selected images
 */
router.delete('/bulk-delete', async (req: Request, res: Response) => {
    try {
        const { imageIds, confirmDelete } = req.body as { imageIds: number[]; confirmDelete: boolean };

        if (!confirmDelete) {
            return res.status(400).json({ error: 'Please confirm deletion' });
        }

        if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
            return res.status(400).json({ error: 'No images selected' });
        }

        // Get image paths from DB
        const images = await prisma.attachment.findMany({
            where: { id: { in: imageIds } },
            select: { id: true, path: true },
        });

        let deletedCount = 0;
        let freedBytes = 0;
        const errors: string[] = [];

        for (const img of images) {
            try {
                // Delete file from disk
                if (fsSync.existsSync(img.path)) {
                    const stat = await fs.stat(img.path);
                    freedBytes += stat.size;
                    await fs.unlink(img.path);
                }

                // Delete from database
                await prisma.attachment.delete({ where: { id: img.id } });
                deletedCount++;
            } catch (err: any) {
                errors.push(`Failed to delete ID ${img.id}: ${err.message}`);
            }
        }

        res.json({
            success: true,
            deletedCount,
            freedBytes,
            freedFormatted: formatBytes(freedBytes),
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error('Failed to delete images:', error);
        res.status(500).json({ error: 'Failed to delete images' });
    }
});

/**
 * Helper function to format bytes
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
