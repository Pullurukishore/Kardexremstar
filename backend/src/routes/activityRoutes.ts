import { Router, Request, Response } from 'express';
import { ActivityController } from '../controllers/activityController';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// All activity routes require authentication
router.use(authenticate);

// Create new activity log (POST)
router.post('/', requireRole(['SERVICE_PERSON']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      activityType,
      title,
      description,
      latitude,
      longitude,
      location,
      accuracy,
      locationSource,
      ticketId,
      activityScheduleId,
      startTime,
    } = req.body;

    // Validate required fields
    if (!activityType) {
      return res.status(400).json({
        success: false,
        message: 'Activity type is required',
      });
    }

    // Activity types that don't require scheduling (ad-hoc activities)
    const AD_HOC_ACTIVITY_TYPES = ['WORK_FROM_HOME', 'OTHER', 'BREAK', 'DOCUMENTATION'];

    // Validate that scheduled activity is provided for non-ad-hoc types
    if (!activityScheduleId && !AD_HOC_ACTIVITY_TYPES.includes(activityType)) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled activity is required for this activity type',
      });
    }

    // Check if user is checked in
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        status: 'CHECKED_IN',
      },
      orderBy: {
        checkInAt: 'desc',
      },
    });

    if (!activeAttendance) {
      return res.status(400).json({
        success: false,
        error: "Check-in required",
        message: "You must check in before logging activities. Please check in first with your location.",
      });
    }

    // If activityScheduleId is provided, verify it belongs to the service person
    let scheduleTicketId: number | undefined = undefined;
    if (activityScheduleId) {
      const schedule = await prisma.activitySchedule.findUnique({
        where: { id: activityScheduleId },
      });

      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Activity schedule not found',
        });
      }

      if (schedule.servicePersonId !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only link activities to your own schedules',
        });
      }

      // For TICKET_WORK activities, get the ticket ID from the schedule
      if (activityType === 'TICKET_WORK' && schedule.ticketId) {
        scheduleTicketId = schedule.ticketId;
      }
    }

    // Ensure location is preserved - use provided address, fallback to coordinates
    const finalLocation = location || (latitude && longitude ? `${latitude}, ${longitude}` : undefined);

    // Create the activity log
    const activity = await prisma.dailyActivityLog.create({
      data: {
        userId: user.id,
        activityType,
        title: title || undefined,
        description,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        location: finalLocation,
        ticketId: scheduleTicketId || (ticketId ? parseInt(ticketId) : undefined),
        startTime: startTime ? new Date(startTime) : new Date(),
        metadata: {
          accuracy,
          locationSource,
          activityScheduleId: activityScheduleId ? parseInt(activityScheduleId) : undefined,
        },
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Create the initial activity stage (STARTED)
    await prisma.activityStage.create({
      data: {
        activityId: activity.id,
        stage: 'STARTED',
        startTime: activity.startTime,
        location: finalLocation,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        metadata: {
          accuracy,
          locationSource,
        },
        updatedAt: new Date(),
      },
    });

    // Fetch the activity with the newly created stage
    const activityWithStage = await prisma.dailyActivityLog.findUnique({
      where: { id: activity.id },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        ActivityStage: {
          orderBy: {
            startTime: 'asc',
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Activity created successfully',
      data: activityWithStage,
    });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create activity',
    });
  }
});

// Get daily activities for service person (DailyActivityLog)
router.get('/', requireRole(['SERVICE_PERSON']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { limit = 50, includeStages = 'true', includeTicket = 'true' } = req.query;

    // Fetch daily activities for the current service person
    const activities = await prisma.dailyActivityLog.findMany({
      where: {
        userId: user.id,
      },
      include: {
        ticket: includeTicket === 'true' ? {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          }
        } : false,
        ActivityStage: includeStages === 'true' ? true : false,
      },
      orderBy: {
        startTime: 'desc',
      },
      take: parseInt(limit as string),
    });

    res.json({
      success: true,
      activities: activities,
      data: activities, // Include both for compatibility
    });
  } catch (error: any) {
    console.error('Error fetching daily activities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch activities',
    });
  }
});

// Get activity statistics
router.get('/stats', requireRole(['SERVICE_PERSON']), (req: Request, res: Response) =>
  ActivityController.getActivityStats(req as AuthenticatedRequest, res)
);

// Get zone activities
router.get('/zone', requireRole(['ADMIN', 'ZONE_USER']), (req: Request, res: Response) =>
  ActivityController.getZoneActivities(req as AuthenticatedRequest, res)
);

// Get user activities
router.get('/user', requireRole(['SERVICE_PERSON']), (req: Request, res: Response) =>
  ActivityController.getUserActivities(req as AuthenticatedRequest, res)
);

// Get activity heatmap
router.get('/heatmap', requireRole(['ADMIN', 'ZONE_USER']), (req: Request, res: Response) =>
  ActivityController.getActivityHeatmap(req as AuthenticatedRequest, res)
);

// Get realtime activities
router.get('/realtime', requireRole(['ADMIN', 'ZONE_USER']), (req: Request, res: Response) =>
  ActivityController.getRealtimeActivities(req as AuthenticatedRequest, res)
);

// Get offer activities
router.get('/offer', requireRole(['ADMIN', 'ZONE_USER']), (req: Request, res: Response) =>
  ActivityController.getOfferActivities(req as AuthenticatedRequest, res)
);

// Get activity comparison
router.get('/comparison', requireRole(['ADMIN']), (req: Request, res: Response) =>
  ActivityController.getActivityComparison(req as AuthenticatedRequest, res)
);

// Get activity by entity
router.get('/entity/:entityType/:entityId', requireRole(['ADMIN']), (req: Request, res: Response) =>
  ActivityController.getActivityByEntity(req as AuthenticatedRequest, res)
);

// Get user leaderboard
router.get('/leaderboard', requireRole(['ADMIN', 'ZONE_USER']), (req: Request, res: Response) =>
  ActivityController.getUserLeaderboard(req as AuthenticatedRequest, res)
);

// Export activities
router.get('/export', requireRole(['ADMIN']), (req: Request, res: Response) =>
  ActivityController.exportActivities(req as AuthenticatedRequest, res)
);

// Get security alerts
router.get('/security', requireRole(['ADMIN']), (req: Request, res: Response) =>
  ActivityController.getSecurityAlerts(req as AuthenticatedRequest, res)
);

// Get workflow analysis
router.get('/workflow', requireRole(['ADMIN']), (req: Request, res: Response) =>
  ActivityController.getWorkflowAnalysis(req as AuthenticatedRequest, res)
);

// Get compliance report
router.get('/compliance', requireRole(['ADMIN']), (req: Request, res: Response) =>
  ActivityController.getComplianceReport(req as AuthenticatedRequest, res)
);

// Create new activity stage (POST)
router.post('/:activityId/stages', requireRole(['SERVICE_PERSON']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { activityId } = req.params;
    const {
      stage,
      notes,
      startTime,
      latitude,
      longitude,
      location,
      accuracy,
      locationSource,
      photos,
    } = req.body;

    // Check if user is checked in
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        status: 'CHECKED_IN',
      },
      orderBy: {
        checkInAt: 'desc',
      },
    });

    if (!activeAttendance) {
      return res.status(400).json({
        success: false,
        error: "Check-in required",
        message: "You must check in before updating activity stages. Please check in first with your location.",
      });
    }

    // Validate activity exists and belongs to user
    const activity = await prisma.dailyActivityLog.findUnique({
      where: { id: parseInt(activityId) },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
    }

    if (activity.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own activities',
      });
    }

    // Ensure location is preserved - use provided address, fallback to coordinates
    const finalLocation = location || (latitude && longitude ? `${latitude}, ${longitude}` : undefined);

    // Check if there's already an active stage (without endTime)
    const existingActiveStage = await prisma.activityStage.findFirst({
      where: {
        activityId: parseInt(activityId),
        endTime: null,
      },
    });

    if (existingActiveStage) {
      console.log('Found existing active stage, ending it first:', existingActiveStage.id);
      // End the existing active stage first
      await prisma.activityStage.update({
        where: { id: existingActiveStage.id },
        data: {
          endTime: new Date(),
        },
      });
    }

    // Create the activity stage
    const activityStage = await prisma.activityStage.create({
      data: {
        activityId: parseInt(activityId),
        stage: stage || 'STARTED',
        notes,
        startTime: startTime ? new Date(startTime) : new Date(),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        location: finalLocation,
        updatedAt: new Date(),
        metadata: {
          accuracy: accuracy ? parseFloat(accuracy) : undefined,
          locationSource,
          photos: photos || [],
        },
      },
    });

    // If this is a COMPLETED stage, automatically end the stage and the activity
    if (stage === 'COMPLETED') {
      console.log('COMPLETED stage created, auto-ending stage and activity:', activityId);

      // End the COMPLETED stage
      await prisma.activityStage.update({
        where: { id: activityStage.id },
        data: {
          endTime: new Date(),
          updatedAt: new Date(),
        },
      });

      // End the activity itself
      await prisma.dailyActivityLog.update({
        where: { id: parseInt(activityId) },
        data: {
          endTime: new Date(),
          duration: Math.floor(
            (new Date().getTime() - new Date(activity.startTime).getTime()) /
            (1000 * 60) // Convert to minutes
          ),
        },
      });

      console.log('Activity auto-ended successfully:', activityId);
    }

    res.status(201).json({
      success: true,
      message: 'Activity stage created successfully',
      data: activityStage,
    });
  } catch (error: any) {
    console.error('Error creating activity stage:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create activity stage',
    });
  }
});

// End activity stage (PUT)
router.put('/:activityId/stages/:stageId', requireRole(['SERVICE_PERSON']), async (req: Request, res: Response) => {
  try {
    const { activityId, stageId } = req.params;
    const { endTime } = req.body;
    const user = (req as any).user;

    console.log(`Ending stage ${stageId} for activity ${activityId} by user ${user.id}`);

    // Check if user is checked in
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        status: 'CHECKED_IN',
      },
      orderBy: {
        checkInAt: 'desc',
      },
    });

    if (!activeAttendance) {
      return res.status(400).json({
        success: false,
        error: "Check-in required",
        message: "You must check in before ending activity stages. Please check in first with your location.",
      });
    }

    // First check if the stage exists
    const stage = await prisma.activityStage.findFirst({
      where: {
        id: parseInt(stageId),
        activityId: parseInt(activityId),
      },
    });

    if (!stage) {
      console.log('Stage not found');
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    // Check if the activity belongs to the user
    const activity = await prisma.dailyActivityLog.findUnique({
      where: { id: parseInt(activityId) },
      select: { userId: true },
    });

    if (!activity || activity.userId !== user.id) {
      console.log('Stage does not belong to user');
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }


    if (stage.endTime) {
      console.log('Stage already ended at:', stage.endTime);
      return res.status(400).json({
        success: false,
        message: 'Stage already ended',
      });
    }

    // Update the activity stage
    const updatedStage = await prisma.activityStage.update({
      where: { id: parseInt(stageId) },
      data: {
        endTime: endTime ? new Date(endTime) : new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('Successfully ended stage:', updatedStage.id, 'endTime:', updatedStage.endTime);

    // Check if all stages for this activity are now ended
    const remainingActiveStages = await prisma.activityStage.findMany({
      where: {
        activityId: parseInt(activityId),
        endTime: null,
      },
    });

    console.log('Remaining active stages:', remainingActiveStages.length);

    // If no more active stages, end the activity itself
    if (remainingActiveStages.length === 0) {
      console.log('All stages ended, ending activity:', activityId);
      await prisma.dailyActivityLog.update({
        where: { id: parseInt(activityId) },
        data: {
          endTime: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: 'Activity stage ended successfully',
      data: updatedStage,
    });
  } catch (error: any) {
    console.error('Error ending activity stage:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Stage not found',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to end activity stage',
    });
  }
});

// Complete activity (PUT)
router.put('/:activityId/complete', requireRole(['SERVICE_PERSON']), async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    const { endTime, notes, latitude, longitude, location, accuracy, locationSource, photos } = req.body;
    const user = (req as any).user;

    // Check if user is checked in
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        status: 'CHECKED_IN',
      },
      orderBy: {
        checkInAt: 'desc',
      },
    });

    if (!activeAttendance) {
      return res.status(400).json({
        success: false,
        error: "Check-in required",
        message: "You must check in before completing activities. Please check in first with your location.",
      });
    }

    // Find and update the activity
    const activity = await prisma.dailyActivityLog.findFirst({
      where: {
        id: parseInt(activityId),
        userId: user.id // Ensure user can only complete their own activities
      },
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found or access denied',
      });
    }

    if (activity.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Activity already ended',
      });
    }

    const updatedActivity = await prisma.dailyActivityLog.update({
      where: { id: parseInt(activityId) },
      data: {
        endTime: endTime ? new Date(endTime) : new Date(),
        duration: Math.floor(
          (new Date(endTime || new Date()).getTime() - new Date(activity.startTime).getTime()) /
          (1000 * 60) // Convert to minutes
        ),
      },
    });

    res.json({
      success: true,
      message: 'Activity ended successfully',
      data: updatedActivity,
    });
  } catch (error: any) {
    console.error('Error ending activity:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to end activity',
    });
  }
});

export default router;
