"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Clock,
  MapPin,
  Activity,
  Loader2,
  Calendar,
  User,
  FileText,
  Play,
  Square,
  CheckCircle,
  Navigation,
} from "lucide-react";
import { apiClient } from "@/lib/api/api-client";
import { cn } from "@/lib/utils";
import EnhancedLocationCapture from './EnhancedLocationCapture';
import { LocationData as EnhancedLocationData } from '@/hooks/useEnhancedLocation';

interface ActivityLog {
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
  ticket?: {
    id: number;
    title: string;
    status?: string;
    priority?: string;
    customer?: {
      companyName?: string;
    };
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

const ACTIVITY_TYPES = [
  { value: "TICKET_WORK", label: "Ticket Work", icon: "🎫" },
  { value: "PO_DISCUSSION", label: "PO Discussion", icon: "💼" },
  { value: "SPARE_REPLACEMENT", label: "Spare Replacement", icon: "🔧" },
  { value: "TRAVEL", label: "Travel", icon: "🚗" },
  { value: "TRAINING", label: "Training", icon: "📚" },
  { value: "REVIEW_MEETING", label: "Review Meeting", icon: "👥" },
  { value: "RELOCATION", label: "Relocation", icon: "📦" },
  { value: "MAINTENANCE_PLANNED", label: "Maintenance Planned", icon: "🔧" },
  { value: "INSTALLATION", label: "Installation", icon: "🔨" },
  { value: "DOCUMENTATION", label: "Documentation", icon: "📝" },
  { value: "WORK_FROM_HOME", label: "Work From Home", icon: "🏠" },
  { value: "OTHER", label: "Other", icon: "📋" },
];

// Stage templates for different activity types (dual-flow system)
const ACTIVITY_STAGE_TEMPLATES: Record<string, Array<{
  stage: string;
  label: string;
  description: string;
  required: boolean;
  icon: string;
}>> = {
  PO_DISCUSSION: [
    { stage: 'STARTED', label: 'Started', description: 'Begin PO discussion', required: true, icon: '🚀' },
    { stage: 'TRAVELING', label: 'Traveling', description: 'Travel to location', required: true, icon: '🚗' },
    { stage: 'ARRIVED', label: 'Arrived', description: 'Arrive at customer location', required: true, icon: '📍' },
    { stage: 'PLANNING', label: 'Planning', description: 'Discuss PO requirements', required: true, icon: '📋' },
    { stage: 'DOCUMENTATION', label: 'Documentation', description: 'Document discussion outcomes', required: true, icon: '📝' },
    { stage: 'COMPLETED', label: 'Completed', description: 'Complete PO discussion', required: true, icon: '✅' }
  ],
  
  SPARE_REPLACEMENT: [
    { stage: 'STARTED', label: 'Started', description: 'Begin spare replacement', required: true, icon: '🚀' },
    { stage: 'TRAVELING', label: 'Traveling', description: 'Travel to location', required: true, icon: '🚗' },
    { stage: 'ARRIVED', label: 'Arrived', description: 'Arrive at customer location', required: true, icon: '📍' },
    { stage: 'ASSESSMENT', label: 'Assessment', description: 'Assess what needs replacement', required: true, icon: '🔍' },
    { stage: 'EXECUTION', label: 'Execution', description: 'Replace the spare part', required: true, icon: '🔧' },
    { stage: 'TESTING', label: 'Testing', description: 'Test the replacement', required: true, icon: '🧪' },
    { stage: 'CUSTOMER_HANDOVER', label: 'Customer Handover', description: 'Customer handover', required: false, icon: '🤝' },
    { stage: 'COMPLETED', label: 'Completed', description: 'Complete replacement', required: true, icon: '✅' }
  ],
  
  INSTALLATION: [
    { stage: 'STARTED', label: 'Started', description: 'Begin installation', required: true, icon: '🚀' },
    { stage: 'TRAVELING', label: 'Traveling', description: 'Travel to location', required: true, icon: '🚗' },
    { stage: 'ARRIVED', label: 'Arrived', description: 'Arrive at installation site', required: true, icon: '📍' },
    { stage: 'ASSESSMENT', label: 'Assessment', description: 'Site assessment', required: true, icon: '🔍' },
    { stage: 'PREPARATION', label: 'Preparation', description: 'Prepare for installation', required: true, icon: '🛠️' },
    { stage: 'EXECUTION', label: 'Execution', description: 'Perform installation', required: true, icon: '🔨' },
    { stage: 'TESTING', label: 'Testing', description: 'Test installation', required: true, icon: '🧪' },
    { stage: 'CUSTOMER_HANDOVER', label: 'Customer Handover', description: 'Customer training/handover', required: true, icon: '🤝' },
    { stage: 'DOCUMENTATION', label: 'Documentation', description: 'Document installation', required: true, icon: '📝' },
    { stage: 'COMPLETED', label: 'Completed', description: 'Complete installation', required: true, icon: '✅' }
  ],

  MAINTENANCE_PLANNED: [
    { stage: 'STARTED', label: 'Started', description: 'Begin maintenance', required: true, icon: '🚀' },
    { stage: 'TRAVELING', label: 'Traveling', description: 'Travel to location', required: true, icon: '🚗' },
    { stage: 'ARRIVED', label: 'Arrived', description: 'Arrive at maintenance site', required: true, icon: '📍' },
    { stage: 'PREPARATION', label: 'Preparation', description: 'Prepare maintenance tools', required: true, icon: '🛠️' },
    { stage: 'EXECUTION', label: 'Execution', description: 'Perform maintenance', required: true, icon: '🔧' },
    { stage: 'TESTING', label: 'Testing', description: 'Test after maintenance', required: true, icon: '🧪' },
    { stage: 'DOCUMENTATION', label: 'Documentation', description: 'Document maintenance', required: true, icon: '📝' },
    { stage: 'COMPLETED', label: 'Completed', description: 'Complete maintenance', required: true, icon: '✅' }
  ],

  // Default template for other activity types
  DEFAULT: [
    { stage: 'STARTED', label: 'Started', description: 'Begin activity', required: true, icon: '🚀' },
    { stage: 'TRAVELING', label: 'Traveling', description: 'Travel to location', required: false, icon: '🚗' },
    { stage: 'ARRIVED', label: 'Arrived', description: 'Arrive at location', required: false, icon: '📍' },
    { stage: 'WORK_IN_PROGRESS', label: 'Work in Progress', description: 'Work in progress', required: true, icon: '⚡' },
    { stage: 'COMPLETED', label: 'Completed', description: 'Complete activity', required: true, icon: '✅' }
  ]
};

interface ActivityLoggerProps {
  onActivityChange?: () => Promise<void> | void;
  activities?: ActivityLog[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void> | void;
}

interface ApiResponse {
  activities: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Enhanced activity flow management
const getActivityFlow = (activityType: string, ticketId?: number) => {
  if (activityType === 'TICKET_WORK' && ticketId) {
    return 'TICKET_STATUS_FLOW'; // Use existing ticket status progression
  } else {
    return 'ACTIVITY_STAGE_FLOW'; // Use new stage progression with stages
  }
};

// Activity stages for non-ticket activities
const ACTIVITY_STAGES = {
  MAINTENANCE_PLANNED: ['PLANNING', 'IN_PROGRESS', 'TESTING', 'COMPLETED'],
  MAINTENANCE_EMERGENCY: ['ASSESSMENT', 'IN_PROGRESS', 'TESTING', 'COMPLETED'],
  INSPECTION: ['PREPARATION', 'INSPECTION', 'DOCUMENTATION', 'COMPLETED'],
  TRAINING: ['SETUP', 'DELIVERY', 'EVALUATION', 'COMPLETED'],
  TRAVEL: ['STARTED', 'IN_TRANSIT', 'ARRIVED', 'COMPLETED'],
  BREAK: ['STARTED', 'COMPLETED'],
  WORK_FROM_HOME: ['STARTED', 'IN_PROGRESS', 'COMPLETED'],
  OTHER: ['STARTED', 'IN_PROGRESS', 'COMPLETED']
};

// Get next stage for activity
const getNextStage = (activityType: string, currentStage?: string) => {
  const stages = ACTIVITY_STAGES[activityType as keyof typeof ACTIVITY_STAGES] || ACTIVITY_STAGES.OTHER;
  if (!currentStage) return stages[0];
  const currentIndex = stages.indexOf(currentStage);
  return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;
};

// Get all stages for activity type
const getActivityStages = (activityType: string) => {
  return ACTIVITY_STAGES[activityType as keyof typeof ACTIVITY_STAGES] || ACTIVITY_STAGES.OTHER;
};

// Memoize the component to prevent unnecessary re-renders
function ActivityLoggerComponent({
  onActivityChange,
  activities: propActivities,
}: ActivityLoggerProps) {
  const [activities, setActivities] = useState<ActivityLog[]>(
    propActivities || []
  );
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeActivity, setActiveActivity] = useState<ActivityLog | null>(
    null
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  
  // Dual-flow system state
  const [selectedActivityType, setSelectedActivityType] = useState<string>('');
  const [currentStage, setCurrentStage] = useState<string>('');
  const [stageTemplate, setStageTemplate] = useState<any[]>([]);
  const [activityFlow, setActivityFlow] = useState<'TICKET_STATUS_FLOW' | 'ACTIVITY_STAGE_FLOW'>('ACTIVITY_STAGE_FLOW');
  
  const { toast } = useToast();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading]);

  // Track if we've already triggered an activity change in the current render cycle
  const activityChangeInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const justEndedActivity = useRef(false);
  const initialLoadComplete = useRef(false);
  const FETCH_COOLDOWN = 1000; // 1 second cooldown between fetches (reduced from 2000ms)

  // Form state
  const [formData, setFormData] = useState({
    activityType: "",
    title: "",
    ticketId: "",
  });

  // Location state for activity logging
  const [activityLocation, setActivityLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationCapture, setShowLocationCapture] = useState(false);
  const [enhancedLocation, setEnhancedLocation] = useState<EnhancedLocationData | null>(null);

  // Tickets state for dropdown
  const [allTickets, setAllTickets] = useState<
    {
      id: number;
      title: string;
      status?: string;
      priority?: string;
      customer?: { companyName?: string };
    }[]
  >([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Get current location for activity logging with enhanced features
  const getCurrentLocationForActivity = async () => {
    if (!navigator.geolocation) {
      const errorMsg = "Geolocation is not supported by this browser";
      setLocationError(errorMsg);
      return null;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000, // Reduced timeout - shorter timeouts often give better accuracy
            maximumAge: 0 // No cache - always get fresh location
          });
        }
      );

      const { latitude, longitude } = position.coords;
      const accuracy = position.coords.accuracy || 999999;
      
      console.log('Activity location GPS Details:', {
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        accuracy: `±${Math.round(accuracy)}m`,
        timestamp: new Date(position.timestamp).toISOString()
      });
      
      // Provide detailed accuracy feedback
      if (accuracy > 1000) {
        console.error('Activity location: Very poor GPS accuracy (>1km):', accuracy, 'meters');
        toast({
          title: "Very Poor GPS Signal",
          description: `GPS accuracy is very poor (±${Math.round(accuracy)}m). Please move outdoors with clear sky view for better accuracy.`,
          variant: "destructive",
        });
      } else if (accuracy > 100) {
        console.warn('Activity location: Poor GPS accuracy:', accuracy, 'meters');
        toast({
          title: "Poor GPS Accuracy",
          description: `GPS accuracy is poor (±${Math.round(accuracy)}m). Location may be less precise. Try moving to an open area.`,
          variant: "destructive",
        });
      } else if (accuracy > 50) {
        console.warn('Activity location: Fair GPS accuracy:', accuracy, 'meters');
        toast({
          title: "Fair GPS Accuracy",
          description: `GPS accuracy is fair (±${Math.round(accuracy)}m). Location should be reasonably accurate.`,
        });
      } else if (accuracy <= 10) {
        console.log('Activity location: Excellent GPS accuracy:', accuracy, 'meters');
        toast({
          title: "Excellent GPS Signal",
          description: `GPS accuracy is excellent (±${Math.round(accuracy)}m). Perfect for location tracking.`,
        });
      } else {
        console.log('Activity location: Good GPS accuracy:', accuracy, 'meters');
      }

      // Try to get address from coordinates using backend geocoding service
      let address = '';
      try {
        console.log('Activity location: Calling backend geocoding service...');
        const response = await apiClient.get(`/geocoding/reverse?latitude=${latitude}&longitude=${longitude}`);
        
        if (response.data?.success && response.data?.data?.address) {
          address = response.data.data.address;
          console.log('Activity location: Backend geocoding successful:', address);
        } else {
          console.log('Activity location: Backend geocoding returned no address');
        }
      } catch (geocodeError) {
        console.warn('Activity location: Backend geocoding failed:', geocodeError);
      }

      const locationData = { 
        lat: latitude, 
        lng: longitude, 
        address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` 
      };
      
      setActivityLocation(locationData);
      setLocationError(null);

      toast({
        title: "Location Captured",
        description: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      });

      return locationData;
    } catch (error: any) {
      let errorMessage = "Could not get your current location.";

      if (error.code === 1) {
        errorMessage = "Location access denied. Please ensure location services are enabled.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your GPS/network connection.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      }

      console.error('Activity location capture error:', error);
      setLocationError(errorMessage);
      
      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  // Fetch activities from backend API with cooldown to prevent infinite loops
  const fetchActivities = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    // Skip cooldown if this is the first fetch (lastFetchTime is 0) or if force refresh is requested
    if (
      !forceRefresh &&
      lastFetchTime.current > 0 &&
      now - lastFetchTime.current < FETCH_COOLDOWN
    ) {
      return activities; // Return current activities
    }

    lastFetchTime.current = now;

    try {
      setLoading(true);

      const responseData = await apiClient.get("/activities");

      // Handle the response structure - could be direct data or wrapped in ApiResponse
      const activitiesData = (responseData as any)?.activities || responseData || [];

      // Update activities state - force update even if same data
      setActivities([...activitiesData]);

      // Find and set active activity (one without endTime)
      const activeActivity = activitiesData.find(
        (activity: ActivityLog) => !activity.endTime
      );
      setActiveActivity(activeActivity || null);

      return activitiesData;
    } catch (error: any) {
      // Show user-friendly error message
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to load activities";
      toast({
        title: "Error Loading Activities",
        description: `${errorMessage} (Status: ${
          error.response?.status || "Unknown"
        })`,
        variant: "destructive",
      });

      // Don't clear activities on error, return current activities to maintain state
      return activities;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch workable tickets for dropdown (excludes closed/pending)
  const fetchWorkableTickets = useCallback(async () => {
    try {
      setTicketsLoading(true);

      const response = await apiClient.get("/tickets?view=assigned-to-service-person&limit=50");

      // Parse tickets from response
      const responseData = response.data;
      let ticketsData = [];

      if (Array.isArray(responseData)) {
        ticketsData = responseData;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        ticketsData = responseData.data;
      } else if (responseData?.tickets && Array.isArray(responseData.tickets)) {
        ticketsData = responseData.tickets;
      }

      // Filter tickets - exclude closed, resolved, pending, and cancelled statuses
      const workableTicketsData = ticketsData.filter(
        (ticket: any) =>
          ticket &&
          ticket.status &&
          !["CLOSED", "RESOLVED", "CLOSED_PENDING", "PENDING", "CANCELLED"].includes(ticket.status)
      );

      setAllTickets(workableTicketsData);
    } catch (error: any) {
      // Don't show error toast for tickets as it's not critical
      setAllTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  // Start new activity
  const handleStartActivity = async () => {
    if (!formData.activityType || !formData.title) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Activity Type and Title)",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Get current location if not already available
      let locationData = activityLocation;
      if (!locationData) {
        locationData = await getCurrentLocationForActivity();
        if (!locationData) {
          toast({
            title: "Location Required",
            description:
              "Unable to get your location. Please allow location access to log activity.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }

      // Prepare activity data for backend
      const activityData = {
        activityType: formData.activityType,
        title: formData.title,
        latitude: locationData.lat,
        longitude: locationData.lng,
        ticketId: formData.ticketId ? parseInt(formData.ticketId) : undefined,
        startTime: new Date().toISOString(),
      };

      // Create activity via backend API
      const response = await apiClient.post("/activities", activityData);

      // Reset form and close dialog
      setFormData({
        activityType: "",
        title: "",
        ticketId: "",
      });
      setActivityLocation(null);
      setLocationError(null);
      setDialogOpen(false);

      // Force refresh activities immediately after creating new activity
      await fetchActivities(true);

      // Notify parent component immediately for faster UI updates
      if (onActivityChange) {
        await onActivityChange();
      }

      toast({
        title: "Activity Started",
        description: `Started "${formData.title}" successfully`,
      });
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.data?.error === "Check-in required") {
        toast({
          title: "Check-in Required",
          description:
            error.response.data.message ||
            "You must check in before logging activities. Please check in first with your location.",
          variant: "destructive",
        });
      } else {
        const errorMessage =
          error.response?.data?.error ||
          error.message ||
          "Failed to start activity";
        toast({
          title: "Error Starting Activity",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // End active activity
  const handleEndActivity = async () => {
    if (!activeActivity) {
      toast({
        title: "Error",
        description: "No active activity to end.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Store activity info for success message
      const activityToEnd = { ...activeActivity };

      // Make API call to end the activity
      const response = await apiClient.put(`/activities/${activeActivity.id}`, {
        endTime: new Date().toISOString(),
      });

      console.log('End Activity Response:', response);

      // Get updated activity data from response
      // Handle different response structures from apiClient
      const responseData = response as any;
      const updatedActivity = responseData.activity || responseData.data?.activity || responseData.data || responseData;
      
      console.log('Updated Activity Data:', updatedActivity);

      // Immediately update local state for instant UI feedback
      const endTime = new Date().toISOString();
      const updatedActivityWithEndTime = {
        ...activityToEnd,
        endTime: endTime,
        duration:
          updatedActivity.duration ||
          Math.round(
            (new Date(endTime).getTime() -
              new Date(activityToEnd.startTime).getTime()) /
              (1000 * 60)
          ),
      };

      // Set flag to prevent fetch from overriding local state
      justEndedActivity.current = true;

      // Clear active activity immediately
      setActiveActivity(null);

      // Update activities list immediately - replace the ended activity
      setActivities((prevActivities) => {
        const updatedActivities = prevActivities.map((activity) =>
          activity.id === activeActivity.id
            ? updatedActivityWithEndTime
            : activity
        );
        return [...updatedActivities]; // Create new array to force re-render
      });

      // Reset fetch cooldown to allow immediate refresh
      lastFetchTime.current = 0;

      // Reset flag after a delay to allow for proper state updates
      setTimeout(() => {
        justEndedActivity.current = false;
      }, 2500);

      // Show success message with duration if available
      const durationText = updatedActivity.duration
        ? `${updatedActivity.duration} minutes`
        : "completed";
      toast({
        title: "Activity Completed",
        description: `"${activityToEnd.title}" - ${durationText}`,
      });

      // Force refresh of activity data with reduced delay
      setTimeout(async () => {
        console.log('ActivityLogger: Refreshing activities after end...');
        
        // Force refresh with immediate update
        const freshActivities = await fetchActivities(true);
        
        // Notify parent to refresh dashboard stats
        if (onActivityChange) {
          console.log('ActivityLogger: Calling onActivityChange callback...');
          await onActivityChange();
        } else {
          console.log('ActivityLogger: No onActivityChange callback provided');
        }
      }, 500);
    } catch (error: any) {
      // Determine appropriate error message
      let errorMessage = "Failed to end activity";

      if (error.response) {
        errorMessage =
          error.response.data?.error ||
          error.response.data?.message ||
          errorMessage;

        if (error.response.status === 404) {
          errorMessage = "Activity not found or already ended";
        } else if (error.response.status === 400) {
          errorMessage = "Invalid request - activity may already be completed";
        } else if (error.response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (error.request) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      toast({
        title: "Error Ending Activity",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Format duration with live time calculation for ongoing activities
  const formatDuration = (minutes?: number, ongoing?: boolean, startTime?: string, endTime?: string) => {
    if (ongoing && startTime) {
      // Calculate live duration for ongoing activities
      const start = new Date(startTime);
      const now = currentTime;
      const diffMs = now.getTime() - start.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      if (diffMinutes < 60) {
        return `${diffMinutes}m ${diffSeconds}s`;
      }
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      return `${hours}h ${mins}m ${diffSeconds}s`;
    }
    
    // If not ongoing, try to calculate duration from start/end times if duration is not provided
    if (!ongoing && startTime && endTime && (!minutes || minutes <= 0)) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = Math.ceil(diffMs / (1000 * 60)); // Use ceil to round up to at least 1 minute
      
      // Always show at least 1 minute for any completed activity
      const finalMinutes = Math.max(diffMinutes, 1);
      
      if (finalMinutes < 60) {
        return `${finalMinutes}m`;
      }
      const hours = Math.floor(finalMinutes / 60);
      const mins = finalMinutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    
    if (ongoing) return "Ongoing";

    // Check for valid duration - must be a positive number
    if (minutes === undefined || minutes === null || minutes <= 0) {
      return "N/A";
    }

    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Get activity type info
  const getActivityTypeInfo = (type: string) => {
    return (
      ACTIVITY_TYPES.find((t) => t.value === type) || {
        label: type,
        icon: "📋",
      }
    );
  };

  // Update activities when prop changes with improved change detection
  useEffect(() => {
    // Don't override local state if we just ended an activity
    if (justEndedActivity.current) {
      return;
    }

    // Always use propActivities when provided, with change detection to prevent unnecessary re-renders
    if (propActivities !== undefined && Array.isArray(propActivities)) {
      // Check if activities actually changed to prevent unnecessary updates
      const currentIds = activities.map(a => a.id).sort();
      const newIds = propActivities.map(a => a.id).sort();
      const hasChanged = currentIds.length !== newIds.length || 
                        currentIds.some((id, index) => id !== newIds[index]);
      
      if (hasChanged || !initialLoadComplete.current) {
        setActivities([...propActivities]); // Create new array to force re-render
        setLoading(false);
        initialLoadComplete.current = true;

        // Find active activity from props
        const activeActivity = propActivities.find(
          (activity: ActivityLog) => !activity.endTime
        );
        setActiveActivity(activeActivity || null);
      }
    }
    // Don't fetch activities here to avoid infinite loops
    // Let the initial load effect handle fetching when no props are provided
  }, [propActivities, activities]);

  // Handle activity changes and refresh data
  const handleActivityChange = useCallback(async () => {
    if (activityChangeInProgress.current) {
      return;
    }

    try {
      activityChangeInProgress.current = true;

      // Only notify parent component, don't fetch activities here to avoid loops
      if (onActivityChange) {
        await onActivityChange();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to update activities",
        variant: "destructive",
      });
    } finally {
      // Reset the flag after a longer delay to prevent rapid successive calls
      setTimeout(() => {
        activityChangeInProgress.current = false;
      }, 1000); // Increased to 1 second
    }
  }, [onActivityChange, toast]);

  // Timer for live duration updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Initial load - only run once on mount when no props are provided
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!mounted) return;

      // Add small delay to ensure parent component finishes loading first
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!mounted) return;

      // Only fetch activities if no props are provided
      // If props are provided, the propActivities useEffect will handle the data
      if (!propActivities || !Array.isArray(propActivities)) {
        try {
          await fetchActivities();
          initialLoadComplete.current = true;
        } catch (error) {
          if (mounted) {
            setLoading(false);
            initialLoadComplete.current = true;
          }
        }
      } else {
        setLoading(false);
        initialLoadComplete.current = true;
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Force re-render if activities is not an array
  if (!Array.isArray(activities)) {
    setActivities([]);
  }

  // Memoize the component's JSX to prevent unnecessary re-renders
  const activityLoggerContent = useMemo(
    () => (
      <Card className="w-full">
        <CardHeader className={isMobile ? "p-4" : "p-6"}>
          <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-3' : 'flex-row'}`}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <Activity className={isMobile ? "h-4 w-4" : "h-5 w-5"} />
              Activity Log
            </CardTitle>
            <div className={`flex gap-2 ${isMobile ? 'w-full flex-col' : 'flex-row'}`}>
              {activeActivity && (
                <Button
                  onClick={handleEndActivity}
                  disabled={submitting}
                  variant="destructive"
                  size={isMobile ? "default" : "sm"}
                  className={`${isMobile ? 'w-full h-12 text-base touch-manipulation' : ''}`}
                >
                  {submitting ? (
                    <Loader2 className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2 animate-spin`} />
                  ) : (
                    <Square className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2`} />
                  )}
                  End Activity
                </Button>
              )}
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (open) {
                    // Fetch workable tickets when dialog opens
                    fetchWorkableTickets();
                  } else {
                    // Reset location state when dialog closes
                    setActivityLocation(null);
                    setLocationError(null);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button 
                    size={isMobile ? "default" : "sm"} 
                    disabled={!!activeActivity}
                    className={`${isMobile ? 'w-full h-12 text-base touch-manipulation' : ''}`}
                  >
                    <Plus className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2`} />
                    Log Activity
                  </Button>
                </DialogTrigger>
                <DialogContent className={isMobile ? "w-[95vw] max-w-[95vw] h-[85vh] p-4" : "sm:max-w-[500px]"}>
                  <DialogHeader className={isMobile ? "pb-4" : ""}>
                    <DialogTitle className={isMobile ? "text-lg" : "text-xl"}>Log New Activity</DialogTitle>
                  </DialogHeader>
                  <div className={`space-y-4 py-4 ${isMobile ? 'space-y-3' : 'space-y-4'}`}>
                    <div className="space-y-2">
                      <Label htmlFor="activityType" className={isMobile ? "text-sm font-medium" : ""}>Activity Type *</Label>
                      <Select
                        value={formData.activityType}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            activityType: value,
                            ticketId: "",
                          }))
                        }
                      >
                        <SelectTrigger className={isMobile ? "h-12 text-base" : "h-10"}>
                          <SelectValue placeholder="Select activity type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title" className={isMobile ? "text-sm font-medium" : ""}>Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Brief description of the activity"
                        className={isMobile ? "h-12 text-base" : "h-10"}
                      />
                    </div>

                    {/* Show tickets dropdown only for Ticket Work */}
                    {formData.activityType === "TICKET_WORK" && (
                      <div className="space-y-2">
                        <Label htmlFor="ticketId" className={isMobile ? "text-sm font-medium" : ""}>Ticket</Label>
                        <Select
                          value={formData.ticketId}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              ticketId: value,
                            }))
                          }
                        >
                          <SelectTrigger className={isMobile ? "h-12 text-base" : "h-10"}>
                            <SelectValue placeholder="Select ticket" />
                          </SelectTrigger>
                          <SelectContent>
                            {allTickets.length === 0 ? (
                              <SelectItem value="" disabled>
                                No tickets available
                              </SelectItem>
                            ) : (
                              allTickets.map((ticket) => (
                                <SelectItem
                                  key={ticket.id}
                                  value={ticket.id.toString()}
                                >
                                  <div className="flex flex-col">
                                    <span>
                                      #{ticket.id} - {ticket.title}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Badge
                                        className={`text-xs ${
                                          ticket.status === "OPEN"
                                            ? "bg-blue-100 text-blue-800"
                                            : ticket.status === "IN_PROGRESS"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : ticket.status === "ASSIGNED"
                                            ? "bg-purple-100 text-purple-800"
                                            : ticket.status === "RESOLVED"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {ticket.status || "OPEN"}
                                      </Badge>
                                      <Badge
                                        className={`text-xs ${
                                          ticket.priority === "CRITICAL"
                                            ? "bg-red-100 text-red-800"
                                            : ticket.priority === "HIGH"
                                            ? "bg-orange-100 text-orange-800"
                                            : ticket.priority === "MEDIUM"
                                            ? "bg-blue-100 text-blue-800"
                                            : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {ticket.priority || "MEDIUM"}
                                      </Badge>
                                      {ticket.customer?.companyName && (
                                        <span>
                                          {ticket.customer.companyName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Location Section - Same as Check-in/Checkout with Manual Entry */}
                    <div className="space-y-2">
                      <Label className={isMobile ? "text-sm font-medium" : ""}>Location *</Label>
                      
                      {/* Show location capture dialog when needed */}
                      {showLocationCapture ? (
                        <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-blue-900">Capture Location for Activity</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowLocationCapture(false)}
                              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                            >
                              ✕
                            </Button>
                          </div>
                          <EnhancedLocationCapture
                            onLocationCapture={(location) => {
                              setEnhancedLocation(location);
                              // Convert to legacy format for compatibility
                              setActivityLocation({
                                lat: location.latitude,
                                lng: location.longitude,
                                address: location.address
                              });
                              setShowLocationCapture(false);
                              setLocationError(null);
                              toast({
                                title: "Location Captured",
                                description: `${location.source === 'manual' ? 'Manual' : 'GPS'} location set successfully.`,
                              });
                            }}
                            previousLocation={enhancedLocation || undefined}
                            required={true}
                            enableJumpDetection={true}
                            autoCapture={false}
                            className=""
                          />
                        </div>
                      ) : (
                        /* Show captured location or capture button */
                        <div className="space-y-2">
                          {(activityLocation || enhancedLocation) ? (
                            /* Location captured - show details */
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-800">Location Ready</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {enhancedLocation?.source === 'manual' ? (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      Manual
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                      <Navigation className="h-3 w-3 mr-1" />
                                      GPS
                                    </Badge>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowLocationCapture(true)}
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                  >
                                    <MapPin className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-sm text-green-700">
                                {(enhancedLocation?.address || activityLocation?.address) || 
                                 `${(enhancedLocation?.latitude || activityLocation?.lat)?.toFixed(6)}, ${(enhancedLocation?.longitude || activityLocation?.lng)?.toFixed(6)}`}
                              </div>
                              <div className="text-xs text-green-600 mt-1">
                                Captured: {enhancedLocation ? new Date(enhancedLocation.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                              </div>
                            </div>
                          ) : (
                            /* No location - show capture button */
                            <Button
                              variant="outline"
                              onClick={() => setShowLocationCapture(true)}
                              className="w-full border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              Capture Location
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={`flex gap-2 pt-4 ${isMobile ? 'flex-col' : 'justify-end flex-row'}`}>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDialogOpen(false);
                          setShowLocationCapture(false);
                          setEnhancedLocation(null);
                        }}
                        disabled={submitting}
                        className={`${isMobile ? 'w-full h-12 text-base order-2 touch-manipulation' : ''}`}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleStartActivity}
                        disabled={submitting}
                        className={`${isMobile ? 'w-full h-12 text-base order-1 touch-manipulation' : ''}`}
                      >
                        {submitting ? (
                          <Loader2 className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2 animate-spin`} />
                        ) : (
                          <Play className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} mr-2`} />
                        )}
                        Start Activity
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`space-y-4 ${isMobile ? 'p-4' : 'p-6'}`}>
          {/* Active Activity */}
          {activeActivity && (
            <div className={`${isMobile ? 'p-3' : 'p-4'} bg-green-50 border border-green-200 rounded-lg`}>
              <div className={`flex items-center justify-between mb-2 ${isMobile ? 'flex-col gap-2' : 'flex-row'}`}>
                <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800"
                  >
                    {formatDuration(undefined, true, activeActivity.startTime)}
                  </Badge>
                  <span className={`${isMobile ? 'text-base' : 'text-sm'} font-medium`}>
                    {getActivityTypeInfo(activeActivity.activityType).icon}
                  </span>
                  <span className={`${isMobile ? 'text-base' : 'text-sm'} font-medium`}>
                    {getActivityTypeInfo(activeActivity.activityType).label}
                  </span>
                </div>
                <span className={`${isMobile ? 'text-sm' : 'text-sm'} text-muted-foreground ${isMobile ? 'w-full text-center' : ''}`}>
                  Started{" "}
                  {new Date(activeActivity.startTime).toLocaleTimeString()}
                </span>
              </div>
              <h4 className={`font-medium ${isMobile ? 'text-base' : 'text-sm'}`}>{activeActivity.title}</h4>
              {activeActivity.description && (
                <p className={`${isMobile ? 'text-sm' : 'text-sm'} text-muted-foreground mt-1`}>
                  {activeActivity.description}
                </p>
              )}
              {activeActivity.location && (
                <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span
                    className="truncate max-w-[300px]"
                    title={activeActivity.location}
                  >
                    {activeActivity.location}
                  </span>
                </div>
              )}
              {activeActivity.ticket && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        Ticket #{activeActivity.ticket.id}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Badge
                        className={`text-xs ${
                          activeActivity.ticket.status === "OPEN"
                            ? "bg-blue-100 text-blue-800"
                            : activeActivity.ticket.status === "IN_PROGRESS"
                            ? "bg-yellow-100 text-yellow-800"
                            : activeActivity.ticket.status === "ASSIGNED"
                            ? "bg-purple-100 text-purple-800"
                            : activeActivity.ticket.status === "RESOLVED"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {activeActivity.ticket.status || "OPEN"}
                      </Badge>
                      <Badge
                        className={`text-xs ${
                          activeActivity.ticket.priority === "CRITICAL"
                            ? "bg-red-100 text-red-800"
                            : activeActivity.ticket.priority === "HIGH"
                            ? "bg-orange-100 text-orange-800"
                            : activeActivity.ticket.priority === "MEDIUM"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {activeActivity.ticket.priority || "MEDIUM"}
                      </Badge>
                    </div>
                  </div>
                  <h5 className="text-sm font-medium text-blue-900 mb-1">
                    {activeActivity.ticket.title}
                  </h5>
                  <p className="text-xs text-blue-700">
                    Customer:{" "}
                    {activeActivity.ticket.customer?.companyName ||
                      "Unknown Customer"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recent Activities */}
          <div className={`space-y-3 ${isMobile ? 'space-y-2' : 'space-y-3'}`}>
            {(() => {
              // Filter activities for today and yesterday only
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
              
              const recentActivities = activities.filter((activity) => {
                // Exclude active activity
                if (activity.id === activeActivity?.id) return false;
                
                // Filter for today and yesterday only
                const activityDate = new Date(activity.startTime);
                return activityDate >= yesterday;
              });

              return (
                <>
                  <h4 className={`${isMobile ? 'text-base' : 'text-sm'} font-medium text-muted-foreground`}>
                    Recent Activities - Today & Yesterday ({recentActivities.length} activities)
                  </h4>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p className="text-sm text-muted-foreground mt-2">
                        Loading activities...
                      </p>
                    </div>
                  ) : recentActivities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No recent activities (today & yesterday)</p>
                    </div>
                  ) : (
                    recentActivities
                      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()) // Most recent first
                      .map((activity) => {
                  const isOngoing = !activity.endTime || activity.endTime === null || activity.endTime === '';
                  return (
                    <div
                      key={activity.id}
                      className={`${isMobile ? 'p-3' : 'p-3'} border rounded-lg hover:bg-gray-50 touch-manipulation`}
                    >
                      <div className={`flex items-center justify-between mb-2 ${isMobile ? 'flex-col gap-2' : 'flex-row'}`}>
                        <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap w-full justify-center' : ''}`}>
                          <span className={isMobile ? "text-base" : "text-sm"}>
                            {getActivityTypeInfo(activity.activityType).icon}
                          </span>
                          <Badge variant="outline" className={isMobile ? "text-sm" : "text-xs"}>
                            {getActivityTypeInfo(activity.activityType).label}
                          </Badge>
                          {isOngoing ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300"
                            >
                              {formatDuration(undefined, true, activity.startTime)}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {formatDuration(activity.duration, false, activity.startTime, activity.endTime)}
                            </Badge>
                          )}
                        </div>
                        <span className={`${isMobile ? 'text-sm w-full text-center' : 'text-xs'} text-muted-foreground`}>
                          {new Date(activity.startTime).toLocaleDateString()}
                        </span>
                      </div>
                      <h5 className={`${isMobile ? 'text-base' : 'text-sm'} font-medium ${isMobile ? 'text-center' : ''}`}>{activity.title}</h5>
                      {activity.description && (
                        <p className={`${isMobile ? 'text-sm text-center' : 'text-xs'} text-muted-foreground mt-1`}>
                          {activity.description}
                        </p>
                      )}
                      <div className={`flex items-center gap-4 mt-2 text-muted-foreground ${isMobile ? 'flex-col gap-2 text-sm' : 'text-xs flex-row'}`}>
                        <div className="flex items-center gap-1">
                          <Clock className={isMobile ? "h-4 w-4" : "h-3 w-3"} />
                          <span>
                            {new Date(activity.startTime).toLocaleTimeString()}
                          </span>
                          {activity.endTime && (
                            <span>
                              {" "}
                              -{" "}
                              {new Date(activity.endTime).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        {activity.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className={isMobile ? "h-4 w-4" : "h-3 w-3"} />
                            <span className={`truncate ${isMobile ? 'max-w-[250px]' : 'max-w-[200px]'}`}>
                              {activity.location}
                            </span>
                          </div>
                        )}
                      </div>
                      {activity.ticket && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-medium text-blue-900">
                                Ticket #{activity.ticket.id}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Badge
                                className={`text-xs ${
                                  activity.ticket.status === "OPEN"
                                    ? "bg-blue-100 text-blue-800"
                                    : activity.ticket.status === "IN_PROGRESS"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : activity.ticket.status === "ASSIGNED"
                                    ? "bg-purple-100 text-purple-800"
                                    : activity.ticket.status === "RESOLVED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {activity.ticket.status || "OPEN"}
                              </Badge>
                              <Badge
                                className={`text-xs ${
                                  activity.ticket.priority === "CRITICAL"
                                    ? "bg-red-100 text-red-800"
                                    : activity.ticket.priority === "HIGH"
                                    ? "bg-orange-100 text-orange-800"
                                    : activity.ticket.priority === "MEDIUM"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {activity.ticket.priority || "MEDIUM"}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-blue-900 font-medium mb-1">
                            {activity.ticket.title}
                          </p>
                          <p className="text-xs text-blue-700">
                            {activity.ticket.customer?.companyName ||
                              "Unknown Customer"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                      })
                  )}
                </>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    ),
    [
      loading,
      submitting,
      activeActivity,
      activities,
      dialogOpen,
      formData,
      activityLocation,
      locationLoading,
      locationError,
      allTickets,
      fetchActivities,
      handleEndActivity,
      handleStartActivity,
      getCurrentLocationForActivity,
    ]
  );

  return activityLoggerContent;
}

const ActivityLogger = React.memo(ActivityLoggerComponent);

export default ActivityLogger;
