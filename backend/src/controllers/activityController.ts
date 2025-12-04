import { Request, Response } from 'express';
import { GeocodingService } from '../services/geocoding.service';
import { LocalPhotoStorageService } from '../services/local-photo-storage.service';
import prisma from '../config/db';

// Simple validation functions (replacing zod for now)
function validateCreateActivity(data: any) {
  const errors: string[] = [];
  
  if (!data.activityType) errors.push('Activity type is required');
  if (!data.title || data.title.trim().length === 0) errors.push('Title is required');
  if (!data.startTime) errors.push('Start time is required');
  
  const validActivityTypes = [
    'TICKET_WORK', 'BD_VISIT', 'PO_DISCUSSION', 'SPARE_REPLACEMENT',
    'TRAVEL', 'TRAINING', 'MEETING', 'MAINTENANCE', 'DOCUMENTATION', 
    'WORK_FROM_HOME', 'INSTALLATION', 'MAINTENANCE_PLANNED', 'REVIEW_MEETING', 
    'RELOCATION', 'OTHER'
  ];
  
  if (data.activityType && !validActivityTypes.includes(data.activityType)) {
    errors.push('Invalid activity type');
  }
  
  return { isValid: errors.length === 0, errors };
}

function validateUpdateActivity(data: any) {
  // For updates, all fields are optional
  return { isValid: true, errors: [] };
}

// Helper function to parse location string into lat/lng
function parseLocation(location: string): { latitude: number | null, longitude: number | null } {
  if (!location || typeof location !== 'string') {
    return { latitude: null, longitude: null };
  }
  
  // Handle comma-separated lat,lng format
  const parts = location.split(',').map(part => part.trim());
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }
  
  return { latitude: null, longitude: null };
}

export const activityController = {
  // Create new activity log
  async createActivity(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Check if user is checked in today before allowing activity logging
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAttendance = await prisma.attendance.findFirst({
        where: {
          userId,
          checkInAt: {
            gte: today,
            lt: tomorrow,
          },
          status: 'CHECKED_IN',
        },
      });

      if (!todayAttendance) {
        return res.status(400).json({ 
          error: 'Check-in required',
          message: 'You must check in before logging activities. Please check in first with your location.'
        });
      }

      const validation = validateCreateActivity(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ error: 'Invalid input data', details: validation.errors });
      }
      const validatedData = req.body;

      // Calculate duration if endTime is provided
      let duration: number | undefined;
      if (validatedData.endTime) {
        const start = new Date(validatedData.startTime);
        const end = new Date(validatedData.endTime);
        duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // in minutes
      }

      // Parse location coordinates
      let latitude: number | null = validatedData.latitude;
      let longitude: number | null = validatedData.longitude;
      let locationAddress: string | null = null;

      // If location is provided as string but lat/lng are null, parse the location
      if (validatedData.location && (!latitude || !longitude)) {
        const parsed = parseLocation(validatedData.location);
        latitude = parsed.latitude;
        longitude = parsed.longitude;
      }

      // Handle location based on source - preserve manual input, geocode GPS coordinates
      if (validatedData.locationSource === 'manual' && validatedData.location) {
        // For manual locations, preserve the user's original input
        locationAddress = validatedData.location;
      } else if (latitude && longitude) {
        // For GPS locations, get real address from coordinates using geocoding service
        try {
          const { address } = await GeocodingService.reverseGeocode(latitude, longitude);
          locationAddress = address || `${latitude}, ${longitude}`;
        } catch (error) {
          // Fallback to coordinates if geocoding fails
          locationAddress = `${latitude}, ${longitude}`;
        }
      } else if (validatedData.location) {
        // If no coordinates but location string provided, use as fallback
        locationAddress = validatedData.location;
      }

      const activity = await prisma.dailyActivityLog.create({
        data: {
          userId,
          ticketId: validatedData.ticketId,
          activityType: validatedData.activityType,
          title: validatedData.title,
          description: validatedData.description,
          startTime: new Date(validatedData.startTime),
          endTime: validatedData.endTime ? new Date(validatedData.endTime) : undefined,
          duration,
          location: locationAddress,
          latitude: latitude,
          longitude: longitude,
          metadata: validatedData.metadata,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ticket: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      // Create audit log for activity creation
      await prisma.auditLog.create({
        data: {
          action: 'ACTIVITY_LOG_ADDED',
          entityType: 'ACTIVITY_LOG',
          entityId: activity.id,
          userId: userId,
          performedById: userId,
          performedAt: new Date(),
          updatedAt: new Date(),
          details: {
            activityType: validatedData.activityType,
            title: validatedData.title,
            startTime: validatedData.startTime,
            endTime: validatedData.endTime || null,
            location: locationAddress,
            coordinates: latitude && longitude ? { latitude, longitude } : null,
            ticketId: validatedData.ticketId || null,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'SUCCESS',
        },
      });

      res.status(201).json({
        message: 'Activity logged successfully',
        activity,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ 
          error: 'Failed to create activity',
          details: error.message
        });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update activity (mainly for ending activities)
  async updateActivity(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const activityId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const validation = validateUpdateActivity(req.body);
      if (!validation.isValid) {
        return res.status(400).json({ error: 'Invalid input data', details: validation.errors });
      }
      const validatedData = req.body;

      const existingActivity = await prisma.dailyActivityLog.findFirst({
        where: {
          id: activityId,
          userId,
        },
      });

      if (!existingActivity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      // Calculate duration if endTime is provided
      let duration: number | undefined = existingActivity.duration ?? undefined;
      if (validatedData.endTime) {
        const start = new Date(existingActivity.startTime);
        const end = new Date(validatedData.endTime);
        duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // in minutes
      }

      // Parse location coordinates for update
      let latitude: number | null = validatedData.latitude || (existingActivity.latitude ? Number(existingActivity.latitude) : null);
      let longitude: number | null = validatedData.longitude || (existingActivity.longitude ? Number(existingActivity.longitude) : null);
      let locationAddress: string | null = existingActivity.location;

      // If location is provided as string but lat/lng are null, parse the location
      if (validatedData.location && (!latitude || !longitude)) {
        const parsed = parseLocation(validatedData.location);
        latitude = parsed.latitude || (existingActivity.latitude ? Number(existingActivity.latitude) : null);
        longitude = parsed.longitude || (existingActivity.longitude ? Number(existingActivity.longitude) : null);
      }

      // Always get real address from coordinates when updating location
      if (validatedData.location || validatedData.latitude || validatedData.longitude) {
        if (latitude && longitude) {
          try {
            const { address } = await GeocodingService.reverseGeocode(latitude, longitude);
            locationAddress = address || `${latitude}, ${longitude}`;
          } catch (error) {
            // Fallback to coordinates if geocoding fails
            locationAddress = `${latitude}, ${longitude}`;
          }
        } else if (validatedData.location) {
          // If no coordinates but location string provided, use as fallback
          locationAddress = validatedData.location;
        }
      }

      const updatedActivity = await prisma.dailyActivityLog.update({
        where: { id: activityId },
        data: {
          endTime: validatedData.endTime ? new Date(validatedData.endTime) : undefined,
          duration,
          description: validatedData.description,
          location: locationAddress,
          latitude: latitude,
          longitude: longitude,
          metadata: validatedData.metadata,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ticket: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      // Create audit log for activity update
      await prisma.auditLog.create({
        data: {
          action: 'ACTIVITY_LOG_UPDATED',
          entityType: 'ACTIVITY_LOG',
          entityId: activityId,
          userId: userId,
          performedById: userId,
          performedAt: new Date(),
          updatedAt: new Date(),
          details: {
            changes: validatedData,
            endTime: validatedData.endTime || null,
            duration: duration || null,
            location: locationAddress,
            coordinates: latitude && longitude ? { latitude, longitude } : null,
          },
          oldValue: {
            endTime: existingActivity.endTime,
            duration: existingActivity.duration,
            location: existingActivity.location,
            description: existingActivity.description,
          },
          newValue: {
            endTime: validatedData.endTime,
            duration: duration,
            location: locationAddress,
            description: validatedData.description,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          status: 'SUCCESS',
        },
      });

      res.json({
        message: 'Activity updated successfully',
        activity: updatedActivity,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ 
          error: 'Failed to update activity',
          details: error.message
        });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user's activity logs
  async getActivities(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { 
        startDate, 
        endDate, 
        activityType, 
        ticketId,
        includeStages,
        page = 1, 
        limit = 20 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const whereClause: any = { userId };

      if (startDate || endDate) {
        whereClause.startTime = {};
        if (startDate) {
          whereClause.startTime.gte = new Date(startDate as string);
        }
        if (endDate) {
          whereClause.startTime.lte = new Date(endDate as string);
        }
      }

      if (activityType) {
        whereClause.activityType = activityType;
      }

      if (ticketId) {
        whereClause.ticketId = parseInt(ticketId as string);
      }

      // Build include object based on parameters
      const includeObject: any = {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticket: {
          select: {
            id: true,
            title: true,
            status: true,
            customer: {
              select: {
                companyName: true,
              },
            },
          },
        },
      };

      // Include ActivityStage if requested
      if (includeStages === 'true') {
        includeObject.ActivityStage = {
          orderBy: {
            startTime: 'asc'
          }
        };
      }

      const [activities, total] = await Promise.all([
        prisma.dailyActivityLog.findMany({
          where: whereClause,
          include: includeObject,
          orderBy: {
            startTime: 'desc',
          },
          skip,
          take: Number(limit),
        }),
        prisma.dailyActivityLog.count({ where: whereClause }),
      ]);

      // Debug logging for stages
      if (includeStages === 'true') {
      }

      res.json({
        activities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get activity statistics
  async getActivityStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { period = 'month' } = req.query;
      
      let startDate = new Date();
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const totalActivities = await prisma.dailyActivityLog.count({
        where: {
          userId,
          startTime: {
            gte: startDate,
          },
        },
      });

      const activities = await prisma.dailyActivityLog.findMany({
        where: {
          userId,
          startTime: {
            gte: startDate,
          },
        },
        select: {
          activityType: true,
          duration: true,
          startTime: true,
        },
      });

      // Group by activity type
      const activityTypeStats = activities.reduce((acc: Record<string, { count: number; totalDuration: number }>, activity: any) => {
        const type = activity.activityType;
        if (!acc[type]) {
          acc[type] = {
            count: 0,
            totalDuration: 0,
          };
        }
        acc[type].count++;
        acc[type].totalDuration += activity.duration || 0;
        return acc;
      }, {} as Record<string, { count: number; totalDuration: number }>);

      // Calculate total duration
      const totalDuration = activities.reduce((sum: number, activity: any) => {
        return sum + (activity.duration || 0);
      }, 0);

      res.json({
        period,
        totalActivities: activities.length,
        totalDuration, // in minutes
        totalHours: Math.round((totalDuration / 60) * 100) / 100,
        activityTypeBreakdown: activityTypeStats,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Auto-create activity when ticket status changes
  async createTicketActivity(
    ticketId: number, 
    userId: number, 
    oldStatus: string, 
    newStatus: string,
    location?: { latitude: number; longitude: number; address?: string; timestamp: string; accuracy?: number; source?: 'gps' | 'manual' | 'network' }
  ) {
    try {
      // Only check for very recent duplicate status changes (within 1 minute)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      
      // Check if the exact same status change happened very recently
      const duplicateActivity = await prisma.dailyActivityLog.findFirst({
        where: {
          ticketId,
          activityType: 'TICKET_WORK',
          createdAt: {
            gte: oneMinuteAgo
          },
          metadata: {
            path: ['newStatus'],
            equals: newStatus
          }
        },
        select: {
          id: true
        }
      });

      if (duplicateActivity) {
        console.log(`Skipping duplicate activity log for ticket ${ticketId} - same status change detected within the last minute`);
        return;
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          customer: {
            select: {
              companyName: true,
            },
          },
        },
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const title = `Ticket Status Update: ${oldStatus} → ${newStatus}`;
      const description = `Updated ticket "${ticket.title}" for ${ticket.customer.companyName} from ${oldStatus} to ${newStatus}`;

      // Handle location data - preserve manual input, geocode GPS coordinates
      let locationAddress: string | null = null;
      if (location) {
        if (location.source === 'manual' && location.address) {
          // For manual locations, preserve the user's original input
          locationAddress = location.address;
        } else if (location.latitude && location.longitude) {
          // For GPS locations, get real address from coordinates using geocoding service
          try {
            const { address: geocodedAddress } = await GeocodingService.reverseGeocode(location.latitude, location.longitude);
            locationAddress = geocodedAddress || `${location.latitude}, ${location.longitude}`;
          } catch (error) {
            // Fallback to coordinates if geocoding fails
            locationAddress = `${location.latitude}, ${location.longitude}`;
          }
        }
      }

      const activityData: any = {
        userId,
        ticketId,
        activityType: 'TICKET_WORK',
        title,
        description,
        startTime: new Date(),
        endTime: new Date(),
        duration: 5, // Assume 5 minutes for status update
        metadata: {
          oldStatus,
          newStatus,
          ticketTitle: ticket.title,
          customerName: ticket.customer.companyName,
        }
      };

      // Add location data if available
      if (location) {
        activityData.latitude = location.latitude;
        activityData.longitude = location.longitude;
        activityData.location = locationAddress || location.address;
        
        // Add location details to metadata
        activityData.metadata = {
          ...activityData.metadata,
          locationAddress: locationAddress || location.address,
          locationSource: location.source || 'gps',
          accuracy: location.accuracy
        };
      }

      await prisma.dailyActivityLog.create({
        data: activityData,
      });
    } catch (error) {
      console.error('Error in createTicketActivity:', error);
      // Don't throw error to avoid breaking the main ticket update flow
    }
  },

  // Utility function to fix a specific stage by ID
  async fixSpecificStage(req: Request, res: Response) {
    try {
      const { stageId } = req.body;
      
      if (!stageId) {
        return res.status(400).json({
          success: false,
          message: 'Stage ID is required'
        });
      }

      // Find the stage
      const stage = await prisma.activityStage.findUnique({
        where: { id: parseInt(stageId) }
      });

      if (!stage) {
        return res.status(404).json({
          success: false,
          message: 'Stage not found'
        });
      }

      // Check if it looks like coordinates
      const coordPattern = /^\s*[-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+\s*$/;
      if (!coordPattern.test(stage.location || '')) {
        return res.json({
          success: true,
          message: 'Stage already has proper address',
          data: stage
        });
      }

      // Parse coordinates
      const [lat, lng] = stage.location!.split(',').map(coord => parseFloat(coord.trim()));
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates format'
        });
      }

      // Geocode to get proper address
      const { address } = await GeocodingService.reverseGeocode(lat, lng);
      
      // Update the stage
      const updatedStage = await prisma.activityStage.update({
        where: { id: parseInt(stageId) },
        data: { 
          location: address || stage.location 
        }
      });
      
      console.log(`Fixed stage ${stageId}: ${stage.location} → ${address}`);

      res.json({
        success: true,
        message: 'Stage fixed successfully',
        data: {
          before: stage.location,
          after: updatedStage.location
        }
      });
    } catch (error: any) {
      console.error('Error fixing stage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix stage',
        error: error.message
      });
    }
  },

  async fixStageLocations(req: Request, res: Response) {
    try {
      // Find all stages with coordinate-only locations (pattern: "lat, lng")
      const stagesToFix = await prisma.activityStage.findMany({
        where: {
          location: {
            contains: ',',
            mode: 'insensitive'
          },
          metadata: {
            path: ['locationSource'],
            equals: 'gps'
          }
        }
      });

      console.log(`Found ${stagesToFix.length} stages to fix`);

      let fixedCount = 0;
      for (const stage of stagesToFix) {
        // Check if location looks like coordinates (contains numbers and comma)
        const coordPattern = /^\s*[-+]?\d*\.?\d+\s*,\s*[-+]?\d*\.?\d+\s*$/;
        if (coordPattern.test(stage.location || '')) {
          try {
            // Parse coordinates
            const [lat, lng] = stage.location!.split(',').map(coord => parseFloat(coord.trim()));
            
            if (!isNaN(lat) && !isNaN(lng)) {
              // Geocode to get proper address
              const { address } = await GeocodingService.reverseGeocode(lat, lng);
              
              // Update the stage with proper address
              await prisma.activityStage.update({
                where: { id: stage.id },
                data: { 
                  location: address || stage.location 
                }
              });
              
              console.log(`Fixed stage ${stage.id}: ${stage.location} → ${address}`);
              fixedCount++;
            }
          } catch (error) {
            console.log(`Failed to fix stage ${stage.id}: ${error}`);
          }
        }
      }

      res.json({
        success: true,
        message: `Fixed ${fixedCount} out of ${stagesToFix.length} stages`,
        data: {
          totalFound: stagesToFix.length,
          fixed: fixedCount,
          failed: stagesToFix.length - fixedCount
        }
      });
    } catch (error: any) {
      console.error('Error fixing stage locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fix stage locations',
        error: error.message
      });
    }
  },

  createActivityStage: async (req: Request, res: Response) => {
    try {
      const { activityId } = req.params;
      const { stage, location, notes, photos, latitude, longitude, locationSource } = req.body;
      const user = (req as any).user;

      // Validate activity exists and belongs to user
      const activity = await prisma.dailyActivityLog.findFirst({
        where: {
          id: parseInt(activityId),
          userId: user.id
        }
      });

      if (!activity) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found or access denied'
        });
      }

      // Handle location based on source - preserve manual input, geocode GPS coordinates
      let finalLocation = location;
      let finalLatitude = latitude;
      let finalLongitude = longitude;

      // If location is provided as string but lat/lng are null, parse the location
      if (location && (!finalLatitude || !finalLongitude)) {
        const parsed = parseLocation(location);
        finalLatitude = parsed.latitude;
        finalLongitude = parsed.longitude;
      }

      // For manual locations, preserve the user's original input
      if (locationSource === 'manual' && location) {
        finalLocation = location;
        console.log(`Using manual stage location: ${finalLocation}`);
      } else if (finalLatitude && finalLongitude) {
        // For GPS locations, geocode to get proper address
        try {
          const { address } = await GeocodingService.reverseGeocode(finalLatitude, finalLongitude);
          finalLocation = address || `${finalLatitude}, ${finalLongitude}`;
          console.log(`Geocoded stage location: ${finalLocation}`);
        } catch (error) {
          console.log(`Geocoding failed for stage, using coordinates: ${error}`);
          finalLocation = location || `${finalLatitude}, ${finalLongitude}`;
        }
      }

      // Handle photo data for verification - now store permanently in local storage
      let photoMetadata = null;
      let notesWithPhotos = notes || '';
      let storedPhotos: any[] = [];
      
      if (photos && photos.length > 0) {
        try {
          // Store photos permanently in local storage
          storedPhotos = await LocalPhotoStorageService.storePhotos(
            photos,
            {
              activityId: parseInt(activityId),
              userId: user.id,
              type: 'activity'
            }
          );

          const photoCount = storedPhotos.length;
          const totalSize = storedPhotos.reduce((sum: number, photo: any) => sum + photo.size, 0);
          const formattedSize = totalSize > 1024 * 1024 
            ? `${(totalSize / (1024 * 1024)).toFixed(1)}MB`
            : `${Math.round(totalSize / 1024)}KB`;
          
          photoMetadata = {
            photoCount,
            totalSize,
            capturedAt: new Date().toISOString(),
            localUrls: storedPhotos.map(p => p.url),
            filePaths: storedPhotos.map(p => p.path)
          };
          
          const photoInfo = `\n\n📸 Photos: ${photoCount} verification photo${photoCount > 1 ? 's' : ''} stored permanently (${formattedSize})\n🔗 Local URLs: ${storedPhotos.map(p => p.url).join(', ')}`;
          notesWithPhotos = notesWithPhotos + photoInfo;
          
          // Log photo storage for audit trail
        } catch (error) {
          // Fallback to metadata-only approach
          const photoCount = photos.length;
          const totalSize = photos.reduce((sum: number, photo: any) => sum + photo.size, 0);
          const formattedSize = totalSize > 1024 * 1024 
            ? `${(totalSize / (1024 * 1024)).toFixed(1)}MB`
            : `${Math.round(totalSize / 1024)}KB`;
          
          photoMetadata = {
            photoCount,
            totalSize,
            capturedAt: new Date().toISOString(),
            filenames: photos.map((photo: any) => photo.filename),
            storageError: true
          };
          
          const photoInfo = `\n\n📸 Photos: ${photoCount} verification photo${photoCount > 1 ? 's' : ''} captured (${formattedSize}) - Storage failed, metadata only`;
          notesWithPhotos = notesWithPhotos + photoInfo;
        }
      }

      // Create the stage
      const activityStage = await prisma.activityStage.create({
        data: {
          activityId: parseInt(activityId),
          stage,
          startTime: new Date(),
          updatedAt: new Date(),
          location: finalLocation,
          latitude: finalLatitude,
          longitude: finalLongitude,
          notes: notesWithPhotos,
          metadata: {
            createdBy: user.id,
            createdAt: new Date().toISOString(),
            locationSource: locationSource || 'gps',
            ...(photoMetadata && { photos: photoMetadata })
          }
        }
      });

      res.json({
        success: true,
        data: activityStage,
        message: 'Activity stage created successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create activity stage'
      });
    }
  },

  updateActivityStage: async (req: Request, res: Response) => {
    try {
      const { activityId, stageId } = req.params;
      const { endTime, duration, location, notes } = req.body;
      const user = (req as any).user;

      // Validate stage exists and belongs to user's activity
      const stage = await prisma.activityStage.findFirst({
        where: {
          id: parseInt(stageId),
          activityId: parseInt(activityId),
          DailyActivityLog: {
            userId: user.id
          }
        }
      });

      if (!stage) {
        return res.status(404).json({
          success: false,
          message: 'Activity stage not found or access denied'
        });
      }

      // Parse location if provided
      const { latitude, longitude } = parseLocation(location);

      // Calculate duration if endTime provided
      let calculatedDuration = duration;
      if (endTime && !duration) {
        const start = new Date(stage.startTime);
        const end = new Date(endTime);
        calculatedDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }

      // Update the stage
      const updatedStage = await prisma.activityStage.update({
        where: { id: parseInt(stageId) },
        data: {
          endTime: endTime ? new Date(endTime) : undefined,
          duration: calculatedDuration,
          location: location || undefined,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          notes: notes || undefined,
          metadata: {
            ...stage.metadata as any,
            updatedBy: user.id,
            updatedAt: new Date().toISOString()
          }
        }
      });

      res.json({
        success: true,
        data: updatedStage,
        message: 'Activity stage updated successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update activity stage'
      });
    }
  },

  getActivityStages: async (req: Request, res: Response) => {
    try {
      const { activityId } = req.params;
      const user = (req as any).user;

      // Validate activity exists and belongs to user
      const activity = await prisma.dailyActivityLog.findFirst({
        where: {
          id: parseInt(activityId),
          userId: user.id
        }
      });

      if (!activity) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found or access denied'
        });
      }

      // Get all stages for the activity
      const stages = await prisma.activityStage.findMany({
        where: {
          activityId: parseInt(activityId)
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      res.json({
        success: true,
        data: stages,
        message: 'Activity stages retrieved successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity stages'
      });
    }
  },

  getActivityStageTemplates: async (req: Request, res: Response) => {
    try {
      const { activityType } = req.params;

      // Define stage templates for different activity types
      const stageTemplates: Record<string, any[]> = {
        PO_DISCUSSION: [
          { stage: 'STARTED', required: true, description: 'Begin PO discussion' },
          { stage: 'TRAVELING', required: true, description: 'Travel to location' },
          { stage: 'ARRIVED', required: true, description: 'Arrive at customer location' },
          { stage: 'PLANNING', required: true, description: 'Discuss PO requirements' },
          { stage: 'DOCUMENTATION', required: true, description: 'Document discussion outcomes' },
          { stage: 'COMPLETED', required: true, description: 'Complete PO discussion' }
        ],
        
        SPARE_REPLACEMENT: [
          { stage: 'STARTED', required: true, description: 'Begin spare replacement' },
          { stage: 'TRAVELING', required: true, description: 'Travel to location' },
          { stage: 'ARRIVED', required: true, description: 'Arrive at customer location' },
          { stage: 'ASSESSMENT', required: true, description: 'Assess what needs replacement' },
          { stage: 'EXECUTION', required: true, description: 'Replace the spare part' },
          { stage: 'TESTING', required: true, description: 'Test the replacement' },
          { stage: 'CUSTOMER_HANDOVER', required: false, description: 'Customer handover' },
          { stage: 'COMPLETED', required: true, description: 'Complete replacement' }
        ],
        
        INSTALLATION: [
          { stage: 'STARTED', required: true, description: 'Begin installation' },
          { stage: 'TRAVELING', required: true, description: 'Travel to location' },
          { stage: 'ARRIVED', required: true, description: 'Arrive at installation site' },
          { stage: 'ASSESSMENT', required: true, description: 'Site assessment' },
          { stage: 'PREPARATION', required: true, description: 'Prepare for installation' },
          { stage: 'EXECUTION', required: true, description: 'Perform installation' },
          { stage: 'TESTING', required: true, description: 'Test installation' },
          { stage: 'CUSTOMER_HANDOVER', required: true, description: 'Customer training/handover' },
          { stage: 'DOCUMENTATION', required: true, description: 'Document installation' },
          { stage: 'COMPLETED', required: true, description: 'Complete installation' }
        ],

        MAINTENANCE_PLANNED: [
          { stage: 'STARTED', required: true, description: 'Begin maintenance' },
          { stage: 'TRAVELING', required: true, description: 'Travel to location' },
          { stage: 'ARRIVED', required: true, description: 'Arrive at maintenance site' },
          { stage: 'PREPARATION', required: true, description: 'Prepare maintenance tools' },
          { stage: 'EXECUTION', required: true, description: 'Perform maintenance' },
          { stage: 'TESTING', required: true, description: 'Test after maintenance' },
          { stage: 'DOCUMENTATION', required: true, description: 'Document maintenance' },
          { stage: 'COMPLETED', required: true, description: 'Complete maintenance' }
        ],

        // Default template for other activity types
        DEFAULT: [
          { stage: 'STARTED', required: true, description: 'Begin activity' },
          { stage: 'TRAVELING', required: false, description: 'Travel to location' },
          { stage: 'ARRIVED', required: false, description: 'Arrive at location' },
          { stage: 'WORK_IN_PROGRESS', required: true, description: 'Work in progress' },
          { stage: 'COMPLETED', required: true, description: 'Complete activity' }
        ]
      };

      const template = stageTemplates[activityType] || stageTemplates.DEFAULT;

      res.json({
        success: true,
        data: {
          activityType,
          stages: template
        },
        message: 'Stage template retrieved successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stage template'
      });
    }
  },

  // Upload activity report
  async uploadActivityReport(req: Request, res: Response) {
    try {
      const { activityId } = req.params;
      const { reports, reportType, description } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Validate activity exists
      const activity = await prisma.dailyActivityLog.findUnique({
        where: { id: parseInt(activityId) },
        include: { user: true }
      });

      if (!activity) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
      }

      // Verify user owns this activity
      if (activity.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only upload reports for your own activities'
        });
      }

      if (!reports || !Array.isArray(reports) || reports.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one report file is required'
        });
      }

      // Upload files to local storage
      const uploadResults = await LocalPhotoStorageService.storePhotos(
        reports,
        {
          activityId: activity.id,
          userId: userId,
          type: 'activity'
        }
      );

      // Save report records to database
      const savedReports = await Promise.all(
        uploadResults.map(async (upload: any, index: number) => {
          return await prisma.activityReport.create({
            data: {
              activityId: activity.id,
              reportType: reportType || 'COMPLETION',
              fileName: reports[index].filename || `report_${index + 1}.jpg`,
              fileSize: upload.size,
              fileType: upload.mimeType,
              filePath: upload.path,
              description: description || null,
              uploadedById: userId,
              metadata: {
                localPath: upload.path,
                uploadedAt: new Date().toISOString(),
                activityType: activity.activityType,
                activityTitle: activity.title
              }
            },
            include: {
              uploadedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          });
        })
      );

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'ACTIVITY_REPORT_UPLOADED',
          entityType: 'ACTIVITY_LOG',
          entityId: activity.id,
          userId: userId,
          performedAt: new Date(),
          updatedAt: new Date(),
          details: {
            activityId: activity.id,
            activityType: activity.activityType,
            reportType: reportType || 'COMPLETION',
            fileCount: savedReports.length,
            totalSize: savedReports.reduce((sum: number, r: any) => sum + r.fileSize, 0),
            description: description
          },
          status: 'SUCCESS'
        }
      });

      res.status(201).json({
        success: true,
        data: savedReports,
        message: `${savedReports.length} report(s) uploaded successfully`
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to upload activity report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  // Get activity reports
  async getActivityReports(req: Request, res: Response) {
    try {
      const { activityId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Verify activity exists
      const activity = await prisma.dailyActivityLog.findUnique({
        where: { id: parseInt(activityId) }
      });

      if (!activity) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
      }

      // Get reports
      const reports = await prisma.activityReport.findMany({
        where: { activityId: parseInt(activityId) },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: reports,
        message: 'Activity reports retrieved successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity reports'
      });
    }
  }
};

// Get photos for an activity
export const getActivityPhotos = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    
    if (!activityId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Activity ID is required' 
      });
    }

    // For activities, photos are stored in activity stages, so we need to get them differently
    // Since LocalPhotoStorageService doesn't have getActivityPhotos, we'll get them from attachments
    const attachments = await prisma.attachment.findMany({
      where: {
        // Activity photos don't have activityId in attachments table currently
        // They are stored with metadata in the notes field
        // For now, return empty array - this needs to be implemented based on your storage strategy
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Convert attachments to photo format
    const photos = attachments.map(att => ({
      id: att.id,
      filename: att.filename,
      url: `/storage/${att.path.replace(/\\/g, '/')}`,
      path: att.path,
      size: att.size,
      mimeType: att.mimeType,
      createdAt: att.createdAt.toISOString()
    }));
    
    return res.json({
      success: true,
      photos: photos
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch photos' 
    });
  }
};
