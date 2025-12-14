'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle,
  Activity,
  ArrowRight,
  Timer,
  Navigation,
  Settings,
  Loader2
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import { StatusChangeDialog, TicketStatusType } from '@/components/tickets/StatusChangeDialog';
import { UserRole } from '@/types/user.types';
import EnhancedLocationCapture from './EnhancedLocationCapture';
import { LocationData } from '@/hooks/useEnhancedLocation';
import PhotoCapture, { CapturedPhoto } from '@/components/photo/PhotoCapture';
import ReportUpload from './ReportUpload';

// Map TicketStatus to StageType (from Prisma schema)
const TICKET_STATUS_TO_STAGE_TYPE: Record<string, string> = {
  'IN_PROGRESS': 'WORK_IN_PROGRESS',
  'WAITING_CUSTOMER': 'WORK_IN_PROGRESS', // Customer interaction is still work
  'ONSITE_VISIT_STARTED': 'TRAVELING',
  'ONSITE_VISIT_REACHED': 'ARRIVED',
  'ONSITE_VISIT_IN_PROGRESS': 'WORK_IN_PROGRESS',
  'ONSITE_VISIT_RESOLVED': 'COMPLETED',
  'ONSITE_VISIT_COMPLETED': 'COMPLETED',
  'CLOSED_PENDING': 'COMPLETED',
  'CLOSED': 'COMPLETED',
  'RESOLVED': 'COMPLETED',
  'ASSIGNED': 'STARTED',
  'ON_HOLD': 'WORK_IN_PROGRESS'
};

// Activity types with enhanced metadata
const ACTIVITY_TYPES = [
  { 
    value: "TICKET_WORK",
    label: "Ticket Work", 
    icon: "🎫",
    color: "bg-blue-100 text-blue-800",
    stages: ['IN_PROGRESS', 'WAITING_CUSTOMER', 'ONSITE_VISIT_STARTED', 'ONSITE_VISIT_REACHED', 'ONSITE_VISIT_IN_PROGRESS', 'ONSITE_VISIT_RESOLVED', 'ONSITE_VISIT_COMPLETED', 'CLOSED_PENDING']
  },
  { 
    value: "PO_DISCUSSION", 
    label: "PO Discussion", 
    icon: "💼",
    color: "bg-purple-100 text-purple-800",
    stages: ['STARTED', 'TRAVELING', 'ARRIVED', 'PLANNING', 'DOCUMENTATION', 'COMPLETED']
  },
  { 
    value: "SPARE_REPLACEMENT", 
    label: "Spare Replacement", 
    icon: "🔧",
    color: "bg-orange-100 text-orange-800",
    stages: ['STARTED', 'TRAVELING', 'ARRIVED', 'ASSESSMENT', 'EXECUTION', 'TESTING', 'CUSTOMER_HANDOVER', 'COMPLETED']
  },
  { 
    value: "TRAVEL", 
    label: "Travel", 
    icon: "🚗",
    color: "bg-green-100 text-green-800",
    stages: ['STARTED', 'TRAVELING', 'ARRIVED', 'COMPLETED']
  },
  { 
    value: "TRAINING", 
    label: "Training", 
    icon: "📚",
    color: "bg-indigo-100 text-indigo-800",
    stages: ['STARTED', 'PREPARATION', 'WORK_IN_PROGRESS', 'DOCUMENTATION', 'COMPLETED']
  },
  { 
    value: "REVIEW_MEETING", 
    label: "Review Meeting", 
    icon: "👥",
    color: "bg-pink-100 text-pink-800",
    stages: ['STARTED', 'TRAVELING', 'ARRIVED', 'PLANNING', 'DOCUMENTATION', 'COMPLETED']
  },
  { 
    value: "RELOCATION", 
    label: "Relocation", 
    icon: "📦",
    color: "bg-yellow-100 text-yellow-800",
    stages: ['STARTED', 'PREPARATION', 'TRAVELING', 'ARRIVED', 'EXECUTION', 'CLEANUP', 'COMPLETED']
  },
  { 
    value: "MAINTENANCE_PLANNED", 
    label: "Maintenance Planned", 
    icon: "🔧",
    color: "bg-teal-100 text-teal-800",
    stages: ['STARTED', 'PREPARATION', 'TRAVELING', 'ARRIVED', 'ASSESSMENT', 'EXECUTION', 'TESTING', 'CLEANUP', 'COMPLETED']
  },
  { 
    value: "INSTALLATION", 
    label: "Installation", 
    icon: "🔨",
    color: "bg-red-100 text-red-800",
    stages: ['STARTED', 'PREPARATION', 'TRAVELING', 'ARRIVED', 'PLANNING', 'EXECUTION', 'TESTING', 'CUSTOMER_HANDOVER', 'COMPLETED']
  },
  { 
    value: "DOCUMENTATION", 
    label: "Documentation", 
    icon: "📝",
    color: "bg-gray-100 text-gray-800",
    stages: ['STARTED', 'PREPARATION', 'WORK_IN_PROGRESS', 'DOCUMENTATION', 'COMPLETED']
  },
  { 
    value: "WORK_FROM_HOME", 
    label: "Work From Home", 
    icon: "🏠",
    color: "bg-emerald-100 text-emerald-800",
    stages: ['STARTED', 'WORK_IN_PROGRESS', 'COMPLETED']
  },
  { 
    value: "OTHER", 
    label: "Other", 
    icon: "📋",
    color: "bg-slate-100 text-slate-800",
    stages: ['STARTED', 'WORK_IN_PROGRESS', 'COMPLETED']
  },
];

// Stage definitions with enhanced metadata
const STAGE_DEFINITIONS: Record<string, { label: string; icon: string; color: string; description: string }> = {
  // Generic stages
  'STARTED': { label: 'Started', icon: '🚀', color: 'bg-blue-100 text-blue-800', description: 'Activity has begun' },
  'TRAVELING': { label: 'Traveling', icon: '🚗', color: 'bg-yellow-100 text-yellow-800', description: 'En route to location' },
  'ARRIVED': { label: 'Arrived', icon: '📍', color: 'bg-green-100 text-green-800', description: 'Reached destination' },
  'WORK_IN_PROGRESS': { label: 'In Progress', icon: '⚡', color: 'bg-orange-100 text-orange-800', description: 'Work is ongoing' },
  'COMPLETED': { label: 'Completed', icon: '✅', color: 'bg-green-100 text-green-800', description: 'Activity finished' },
  'ASSESSMENT': { label: 'Assessment', icon: '🔍', color: 'bg-purple-100 text-purple-800', description: 'Evaluating situation' },
  'PLANNING': { label: 'Planning', icon: '📋', color: 'bg-indigo-100 text-indigo-800', description: 'Planning approach' },
  'EXECUTION': { label: 'Execution', icon: '🔧', color: 'bg-red-100 text-red-800', description: 'Executing the work' },
  'TESTING': { label: 'Testing', icon: '🧪', color: 'bg-cyan-100 text-cyan-800', description: 'Testing results' },
  'DOCUMENTATION': { label: 'Documentation', icon: '📝', color: 'bg-gray-100 text-gray-800', description: 'Documenting work' },
  'CUSTOMER_HANDOVER': { label: 'Customer Handover', icon: '🤝', color: 'bg-pink-100 text-pink-800', description: 'Handing over to customer' },
  'PREPARATION': { label: 'Preparation', icon: '🧰', color: 'bg-violet-100 text-violet-800', description: 'Preparing for work' },
  'CLEANUP': { label: 'Cleanup', icon: '🧹', color: 'bg-amber-100 text-amber-800', description: 'Cleaning up work area' },
  
  // Ticket-specific workflow stages (using actual TicketStatus enum values)
  'IN_PROGRESS': { label: 'Start Work', icon: '🔧', color: 'bg-blue-100 text-blue-800', description: 'Begin working on this ticket' },
  'ONSITE_VISIT_STARTED': { label: 'Travel to Site', icon: '🚗', color: 'bg-yellow-100 text-yellow-800', description: 'Traveling to customer location' },
  'ONSITE_VISIT_REACHED': { label: 'Arrived at Site', icon: '📍', color: 'bg-green-100 text-green-800', description: 'Reached customer location' },
  'ONSITE_VISIT_IN_PROGRESS': { label: 'Working Onsite', icon: '🔨', color: 'bg-orange-100 text-orange-800', description: 'Currently working at customer site' },
  'ONSITE_VISIT_RESOLVED': { label: 'Complete Work', icon: '✅', color: 'bg-green-100 text-green-800', description: 'Work completed at customer site' },
  'ONSITE_VISIT_COMPLETED': { label: 'Onsite Visit Completed', icon: '🏁', color: 'bg-green-100 text-green-800', description: 'Onsite visit has been completed' },
  'CLOSED_PENDING': { label: 'Closed Pending', icon: '⏳', color: 'bg-yellow-100 text-yellow-800', description: 'Ticket closed pending final confirmation' },
  'WAITING_CUSTOMER': { label: 'Waiting for Customer', icon: '⏳', color: 'bg-amber-100 text-amber-800', description: 'Waiting for customer response or availability' },
};

interface Activity {
  id: number;
  activityType: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  metadata?: any;
  ticketId?: number;
  ticket?: {
    id: number;
    title: string;
    status: string;
    priority: string;
  };
  ActivityStage?: ActivityStage[];
}

interface ActivityStage {
  id: number;
  stage: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  location?: string;
  notes?: string;
}

interface ActivityStatusManagerProps {
  activities?: Activity[];
  onActivityChange?: () => void;
}

export default function ActivityStatusManager({ activities = [], onActivityChange }: ActivityStatusManagerProps) {
  const [activeActivities, setActiveActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showStageDialog, setShowStageDialog] = useState(false);
  const [showStageConfirmDialog, setShowStageConfirmDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [stageNotes, setStageNotes] = useState<string>('');
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [enhancedStageLocation, setEnhancedStageLocation] = useState<LocationData | null>(null);
  // Legacy location state (keeping for compatibility)
  const [stageLocation, setStageLocation] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [pendingStageData, setPendingStageData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Filter active activities (those without endTime, including WORK_FROM_HOME)
    const active = activities.filter(activity => !activity.endTime);
    setActiveActivities(active);
  }, [activities]);

  const getActivityType = (type: string) => {
    return ACTIVITY_TYPES.find(at => at.value === type) || ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];
  };

  const getCurrentStage = (activity: Activity): string => {
    if (!activity.ActivityStage || activity.ActivityStage.length === 0) {
      // Return appropriate starting stage based on activity type
      return activity.activityType === 'TICKET_WORK' ? 'IN_PROGRESS' : 'STARTED';
    }
    
    // Find the latest stage without endTime (current active stage)
    const activeStage = activity.ActivityStage.find(stage => !stage.endTime);
    if (activeStage) {
      return activeStage.stage;
    }
    
    // If all stages are completed, return the last one
    const sortedStages = activity.ActivityStage.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    return sortedStages[0]?.stage || (activity.activityType === 'TICKET_WORK' ? 'IN_PROGRESS' : 'STARTED');
  };

  const getNextAvailableStages = (activity: Activity): string[] => {
    const activityType = getActivityType(activity.activityType);
    const currentStage = getCurrentStage(activity);
    const currentIndex = activityType.stages.indexOf(currentStage);
    
    // Smart stage progression: Show next 2-3 logical stages + COMPLETED
    // This reduces confusion while maintaining flexibility
    
    if (currentIndex === -1) {
      // If current stage not found, show all stages
      return activityType.stages;
    }
    
    // For TICKET_WORK, show all stages (it's already flexible by nature)
    if (activity.activityType === 'TICKET_WORK') {
      return activityType.stages.filter(stage => stage !== currentStage);
    }
    
    // For other activities: Show next 2-3 stages + COMPLETED option
    const nextStages: string[] = [];
    
    // Add immediate next stage
    if (currentIndex + 1 < activityType.stages.length) {
      nextStages.push(activityType.stages[currentIndex + 1]);
    }
    
    // Add one more stage ahead (for flexibility)
    if (currentIndex + 2 < activityType.stages.length) {
      nextStages.push(activityType.stages[currentIndex + 2]);
    }
    
    // Always allow jumping to COMPLETED (for quick finish)
    const completedStage = activityType.stages[activityType.stages.length - 1];
    if (completedStage === 'COMPLETED' && !nextStages.includes('COMPLETED')) {
      nextStages.push('COMPLETED');
    }
    
    return nextStages;
  };

  // Check if a stage requires location capture - ALL stages now require location
  const requiresLocation = (stage: string): boolean => {
    // All stages require location tracking for better activity monitoring
    return true;
  };

  // Check if a stage requires photo capture (for verification and documentation)
  // Optimized to balance accountability with user experience
  const requiresPhoto = (stage: string): boolean => {
    const photoRequiredStages = [
      // Critical verification stages only
      'ARRIVED',                      // Proof of arrival at location
      'ONSITE_VISIT_REACHED',        // Proof of onsite arrival (TICKET_WORK)
      'ONSITE_VISIT_RESOLVED',       // Proof of issue resolution (TICKET_WORK)
      'EXECUTION',                    // During work execution (SPARE_REPLACEMENT, RELOCATION, MAINTENANCE, INSTALLATION)
      'CUSTOMER_HANDOVER',           // Final handover proof (INSTALLATION)
      'WORK_IN_PROGRESS',            // Work session proof (TRAINING, DOCUMENTATION, WORK_FROM_HOME, OTHER)
      'COMPLETED'                     // Final completion proof (most activities)
    ];
    return photoRequiredStages.includes(stage);
  };

  // Handle photo capture
  const handlePhotoCapture = (photos: CapturedPhoto[]) => {
    setCapturedPhotos(photos);
  };

  // Enhanced location capture handler
  const handleEnhancedLocationCapture = useCallback((location: LocationData) => {
    setEnhancedStageLocation(location);
    
    // Also set legacy location for backward compatibility
    setStageLocation({
      lat: location.latitude,
      lng: location.longitude,
      address: location.address
    });
  }, []);

  // Legacy GPS capture function (kept for compatibility)
  const captureStageLocation = async (): Promise<void> => {
    // This is now handled by the EnhancedLocationCapture component
    };

  // Auto-capture location when location-required stage is selected
  useEffect(() => {
    if (selectedStage && requiresLocation(selectedStage) && !stageLocation && !isCapturingLocation) {
      captureStageLocation();
    }
  }, [selectedStage]);

  const handleStageUpdate = async () => {
    if (!selectedActivity || !selectedStage) {
      return;
    }

    // Show confirmation dialog before updating
    setShowStageConfirmDialog(true);
  };

  const confirmStageUpdate = async () => {
    if (!selectedActivity || !selectedStage) {
      return;
    }

    setShowStageConfirmDialog(false);

    // Check if location is required but not captured (using enhanced location)
    if (requiresLocation(selectedStage) && !enhancedStageLocation) {
      toast({
        title: "Location Required",
        description: "Location is required for this stage. Please capture your location first.",
        variant: "destructive",
      });
      return;
    }

    // Check if photo is required but not captured
    if (requiresPhoto(selectedStage) && capturedPhotos.length === 0) {
      toast({
        title: "Photo Required",
        description: "Photo verification is required for this stage. Please take at least one photo.",
        variant: "destructive",
      });
      return;
    }

    // Check if this is a COMPLETED stage for non-TICKET_WORK activities - show report dialog
    const mandatoryReportActivities = [
      'BD_VISIT', 'INSTALLATION', 'MAINTENANCE', 'MAINTENANCE_PLANNED', 'SPARE_REPLACEMENT'
    ];
    
    if (selectedStage === 'COMPLETED' && 
        selectedActivity.activityType !== 'TICKET_WORK' &&
        mandatoryReportActivities.includes(selectedActivity.activityType)) {
      // Store the stage data for after report upload
      const stageData = {
        stage: selectedStage,
        notes: stageNotes || undefined,
        startTime: new Date().toISOString(),
        ...(enhancedStageLocation && {
          latitude: enhancedStageLocation.latitude,
          longitude: enhancedStageLocation.longitude,
          location: enhancedStageLocation.address || `${enhancedStageLocation.latitude}, ${enhancedStageLocation.longitude}`,
          accuracy: enhancedStageLocation.accuracy,
          locationSource: enhancedStageLocation.source
        }),
        ...(capturedPhotos.length > 0 && {
          photos: capturedPhotos.map(photo => ({
            filename: photo.filename,
            dataUrl: photo.dataUrl,
            size: photo.size,
            timestamp: photo.timestamp
          }))
        })
      };
      
      setPendingStageData(stageData);
      setShowStageDialog(false);
      setShowReportDialog(true);
      return;
    }

    try {
      setIsUpdatingStage(true);

      const startTime = new Date().toISOString();

      // Create stage data with enhanced location and photos if available
      const stageData = {
        stage: selectedStage,
        notes: stageNotes || undefined,
        startTime,
        ...(enhancedStageLocation && {
          latitude: enhancedStageLocation.latitude,
          longitude: enhancedStageLocation.longitude,
          location: enhancedStageLocation.address || `${enhancedStageLocation.latitude}, ${enhancedStageLocation.longitude}`,
          accuracy: enhancedStageLocation.accuracy,
          locationSource: enhancedStageLocation.source
        }),
        ...(capturedPhotos.length > 0 && {
          photos: capturedPhotos.map(photo => ({
            filename: photo.filename,
            dataUrl: photo.dataUrl,
            size: photo.size,
            timestamp: photo.timestamp
          }))
        })
      };

      // Create new stage - backend will automatically end any existing active stage
      const createResponse = await apiClient.post(`/activities/${selectedActivity.id}/stages`, stageData);
      console.log('Successfully created new stage:', createResponse.data?.id);

      // Close dialog and reset state
      setShowStageDialog(false);
      setSelectedActivity(null);
      setSelectedStage('');
      setStageNotes('');
      setStageLocation(null);
      setEnhancedStageLocation(null);
      setCapturedPhotos([]);

      // Delay to ensure backend processes the changes
      await new Promise(resolve => setTimeout(resolve, 800));

      // Refresh data - ensure it completes
      try {
        if (onActivityChange) {
          await onActivityChange();
          console.log('Activity change callback completed');
        }
      } catch (refreshError) {
        console.error('Error refreshing activities:', refreshError);
        // Still show success toast even if refresh fails
      }
    } catch (error: any) {
      console.error('Error updating activity stage:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = "Failed to update activity stage. Please try again.";
      
      if (error.response?.status === 404) {
        errorMessage = "Activity not found or already ended. Please refresh and try again.";
      } else if (error.response?.status === 409) {
        errorMessage = "Time slot conflict. Please try again.";
      } else if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (error.message?.includes('Network')) {
        errorMessage = "Network error. Please check your connection.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleReportUploadSuccess = async () => {
    if (!selectedActivity || !pendingStageData) {
      return;
    }

    try {
      setIsUpdatingStage(true);
      // Create new stage with pending data - backend will end any existing active stage
      await apiClient.post(`/activities/${selectedActivity.id}/stages`, pendingStageData);

      // Close dialogs and reset
      setShowReportDialog(false);
      setSelectedActivity(null);
      setSelectedStage('');
      setStageNotes('');
      setStageLocation(null);
      setEnhancedStageLocation(null);
      setCapturedPhotos([]);
      setPendingStageData(null);

      // Refresh data
      if (onActivityChange) {
        onActivityChange();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete activity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleStatusChange = async (status: TicketStatusType, comments?: string, location?: any, photos?: any) => {
    if (!selectedActivity) {
      return;
    }
    
    if (!selectedActivity.ticketId) {
      toast({
        title: "Error",
        description: "This activity is not associated with a ticket. Cannot update status.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the same approach as admin and zone users - update ticket status directly
      const requestData = {
        status,
        comments: comments || `Status changed to ${status}`,
        ...(location && {
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            timestamp: location.timestamp || new Date().toISOString()
          }
        }),
        ...(photos && {
          photos: {
            photos: photos.photos,
            timestamp: photos.timestamp || new Date().toISOString()
          }
        })
      };

      // Update ticket status using the same endpoint as admin/zone users
      const response = await apiClient.patch(`/tickets/${selectedActivity.ticketId}/status`, requestData);

      // Close dialog and refresh data
      setShowStatusDialog(false);
      setSelectedActivity(null);

      // Refresh data - call parent callback immediately for UI responsiveness
      if (onActivityChange) {
        onActivityChange();
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update ticket status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (activeActivities.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-sm text-gray-500">No active activities</p>
        <p className="text-xs text-gray-400 mt-1">Start an activity to manage its progress</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeActivities.map((activity) => {
        const activityType = getActivityType(activity.activityType);
        const currentStage = getCurrentStage(activity);
        const nextStages = getNextAvailableStages(activity);
        const stageInfo = STAGE_DEFINITIONS[currentStage];

        return (
          <div key={activity.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="space-y-3">
              {/* Header with Activity Type and Stage */}
              <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-base flex-shrink-0">{activityType.icon}</span>
                      <Badge className={`${activityType.color} text-xs px-2 py-1 truncate`}>
                        {activityType.label}
                      </Badge>
                    </div>
                    <Badge variant="outline" className={`${stageInfo?.color} text-xs px-2 py-1 flex-shrink-0`}>
                      {stageInfo?.icon} {stageInfo?.label}
                    </Badge>
                  </div>
                  
                  {/* Activity Title */}
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 line-clamp-2 leading-tight">{activity.title}</h3>
                    {activity.description && (
                      <p className="text-gray-600 text-xs sm:text-sm mt-1 line-clamp-2">{activity.description}</p>
                    )}
                  </div>
                  
                  {/* Current Ticket Status */}
                  {activity.ticket && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">Ticket Status:</span>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800">
                          {activity.ticket.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {/* Duration and Location */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Timer className="h-3 w-3 flex-shrink-0 text-gray-500" />
                      <span className="font-medium text-xs text-gray-500">{formatDuration(activity.startTime)}</span>
                    </div>
                    {activity.location && (
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-gray-500 mt-0.5" />
                        <span className="text-xs text-gray-600 break-words leading-relaxed">{activity.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons - Mobile Optimized */}
                  <div className="flex gap-2">
                    {/* Update Status button for TICKET_WORK activities */}
                    {activity.activityType === 'TICKET_WORK' && activity.ticketId && currentStage !== 'CLOSED_PENDING' && currentStage !== 'CLOSED' && currentStage !== 'RESOLVED' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedActivity(activity);
                          setShowStatusDialog(true);
                        }}
                        disabled={isUpdatingStage}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-xs font-semibold h-9 active:scale-95 transition-transform touch-manipulation"
                      >
                        {isUpdatingStage ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Settings className="h-3 w-3 mr-1" />
                            Update Status
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Update Stage button for non-TICKET_WORK activities (excluding WORK_FROM_HOME) */}
                    {activity.activityType !== 'TICKET_WORK' && activity.activityType !== 'WORK_FROM_HOME' && currentStage !== 'COMPLETED' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedActivity(activity);
                          setShowStageDialog(true);
                        }}
                        disabled={isUpdatingStage}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-xs font-semibold h-9 active:scale-95 transition-transform touch-manipulation"
                      >
                        {isUpdatingStage ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Update Stage
                          </>
                        )}
                      </Button>
                    )}
                  </div>
            </div>
          </div>
        );
      })}

      {/* Ticket Status Change Dialog */}
      <StatusChangeDialog
        isOpen={showStatusDialog}
        currentStatus={selectedActivity?.ticket?.status as TicketStatusType || 'IN_PROGRESS'}
        ticketId={selectedActivity?.ticketId}
        userRole={UserRole.SERVICE_PERSON}
        onClose={() => {
          setShowStatusDialog(false);
          setSelectedActivity(null);
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Activity Stage Update Dialog - Mobile Optimized */}
      <Dialog open={showStageDialog} onOpenChange={(open) => !open && setShowStageDialog(false)}>
        <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto mx-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="h-4 w-4 text-purple-600" />
              Update Stage
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Progress to next stage
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Current Stage - Mobile Optimized */}
            <div className="bg-muted p-3 rounded-xl">
              <p className="text-xs font-bold text-muted-foreground mb-2">Current Stage</p>
              <div className="flex items-center gap-2">
                <span className="text-base">{STAGE_DEFINITIONS[getCurrentStage(selectedActivity || {} as Activity)]?.icon}</span>
                <span className="font-bold text-sm">
                  {STAGE_DEFINITIONS[getCurrentStage(selectedActivity || {} as Activity)]?.label}
                </span>
              </div>
            </div>

            {/* Next Stage Selection - Mobile Optimized */}
            <div className="space-y-2">
              <label className="text-xs font-bold">Select Next Stage</label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose next stage..." />
                </SelectTrigger>
                <SelectContent>
                  {getNextAvailableStages(selectedActivity || {} as Activity).map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      <div className="flex items-center gap-2">
                        <span>{STAGE_DEFINITIONS[stage]?.icon}</span>
                        <span>{STAGE_DEFINITIONS[stage]?.label || stage}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage Notes - Mobile Optimized */}
            <div className="space-y-2">
              <label className="text-xs font-bold">Notes (Optional)</label>
              <Textarea
                value={stageNotes}
                onChange={(e) => setStageNotes(e.target.value)}
                placeholder="Add notes about this stage..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            {/* Enhanced Location Section */}
            {selectedStage && (
              <div className="space-y-3">
                <EnhancedLocationCapture
                  onLocationCapture={handleEnhancedLocationCapture}
                  previousLocation={selectedActivity ? {
                    latitude: selectedActivity.latitude || 0,
                    longitude: selectedActivity.longitude || 0,
                    accuracy: 100,
                    timestamp: new Date(selectedActivity.startTime).getTime(),
                    source: 'gps' as const,
                    address: selectedActivity.location || `${selectedActivity.latitude || 0}, ${selectedActivity.longitude || 0}`
                  } : undefined}
                  required={true}
                  enableJumpDetection={true}
                  className=""
                />
              </div>
            )}

            {/* Photo Capture Section */}
            {selectedStage && requiresPhoto(selectedStage) && (
              <PhotoCapture
                onPhotoCapture={handlePhotoCapture}
                maxPhotos={3}
                required={true}
                label="Activity Verification Photos"
                description="Take photos to verify your activity progress"
                className="mt-3"
              />
            )}

            {/* Preview */}
            {selectedStage && (
              <div className="bg-purple-50 border border-purple-200 p-2 rounded-lg">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowRight className="h-3 w-3 text-purple-600" />
                  <span className="text-xs font-medium text-purple-900">Next:</span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm">{STAGE_DEFINITIONS[selectedStage]?.icon}</span>
                  <span className="text-xs font-semibold text-purple-900">
                    {STAGE_DEFINITIONS[selectedStage]?.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowStageDialog(false);
                setSelectedActivity(null);
                setSelectedStage('');
                setStageNotes('');
                setStageLocation(null);
                setEnhancedStageLocation(null);
                setCapturedPhotos([]);
              }}
              disabled={isUpdatingStage}
              className="flex-1 h-11 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStageUpdate}
              disabled={
                !selectedStage || 
                isUpdatingStage || 
                (requiresLocation(selectedStage) && !enhancedStageLocation) ||
                (requiresPhoto(selectedStage) && capturedPhotos.length === 0)
              }
              className="flex-1 h-11 bg-purple-600 hover:bg-purple-700 text-sm font-semibold"
            >
              {isUpdatingStage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Stage
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Upload Dialog */}
      <Dialog open={showReportDialog} onOpenChange={(open) => {
        if (!open) {
          setShowReportDialog(false);
          setPendingStageData(null);
          setSelectedActivity(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-3">
          <DialogHeader>
            <DialogTitle>Upload Activity Report</DialogTitle>
            <DialogDescription>
              {pendingStageData?.stage === 'CLOSED_PENDING' 
                ? 'Upload a closure report (optional) or skip to proceed without a report'
                : 'Upload completion report before marking activity as completed'}
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && pendingStageData && (
            <ReportUpload
              activityId={selectedActivity.id}
              activityType={selectedActivity.activityType}
              reportType={
                pendingStageData.stage === 'CLOSED_PENDING' ? 'CLOSURE' : 'COMPLETION'
              }
              required={pendingStageData.stage !== 'CLOSED_PENDING'}
              onSuccess={handleReportUploadSuccess}
              onCancel={() => {
                setShowReportDialog(false);
                setPendingStageData(null);
                setShowStageDialog(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Stage Confirmation Dialog */}
      <Dialog open={showStageConfirmDialog} onOpenChange={setShowStageConfirmDialog}>
        <DialogContent className="sm:max-w-[400px] mx-3">
          <DialogHeader>
            <DialogTitle className="text-lg">Confirm Stage Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700">
                Are you sure you want to move to <span className="font-semibold">"{STAGE_DEFINITIONS[selectedStage]?.label || selectedStage}"</span> stage?
              </p>
              <p className="text-sm text-gray-600 mt-2">
                This will change the stage for this activity.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowStageConfirmDialog(false)}
                disabled={isUpdatingStage}
                className="flex-1 h-10"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmStageUpdate}
                disabled={isUpdatingStage}
                className="flex-1 h-10 bg-blue-600 hover:bg-blue-700"
              >
                {isUpdatingStage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'OK'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
