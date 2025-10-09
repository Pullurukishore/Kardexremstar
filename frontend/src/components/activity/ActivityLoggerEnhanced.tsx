"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Target,
  Shield,
} from "lucide-react";
import { apiClient } from "@/lib/api/api-client";
import { cn } from "@/lib/utils";
import EnhancedLocationCapture from "./EnhancedLocationCapture";
import { LocationData } from "@/hooks/useEnhancedLocation";

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
  accuracy?: number;
  locationSource?: string;
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

interface ActivityLoggerEnhancedProps {
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

function ActivityLoggerEnhancedComponent({
  onActivityChange,
  activities: propActivities,
}: ActivityLoggerEnhancedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>(propActivities || []);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeActivity, setActiveActivity] = useState<ActivityLog | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    activityType: "",
    title: "",
    description: "",
    ticketId: "",
  });
  
  // Enhanced location state
  const [activityLocation, setActivityLocation] = useState<LocationData | null>(null);
  const [lastKnownLocation, setLastKnownLocation] = useState<LocationData | null>(null);
  const [showLocationCapture, setShowLocationCapture] = useState(false);
  
  const { toast } = useToast();
  const mounted = useRef(true);
  const initialLoadComplete = useRef(false);

  // Update current time every second for live duration calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check mobile status
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768);
  };

  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load activities
  const fetchActivities = useCallback(async () => {
    if (!mounted.current) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get('/activities?limit=50&page=1');
      const data: ApiResponse = response.data;
      
      if (mounted.current) {
        setActivities(data.activities || []);
        
        // Find active activity
        const active = data.activities?.find(activity => !activity.endTime);
        setActiveActivity(active || null);
        
        // Set last known location from most recent activity
        if (data.activities?.length > 0) {
          const recentActivity = data.activities[0];
          if (recentActivity.latitude && recentActivity.longitude) {
            setLastKnownLocation({
              latitude: recentActivity.latitude,
              longitude: recentActivity.longitude,
              accuracy: recentActivity.accuracy || 100,
              timestamp: new Date(recentActivity.startTime).getTime(),
              source: (recentActivity.locationSource as 'gps' | 'manual') || 'gps',
              address: recentActivity.location || `${recentActivity.latitude.toFixed(6)}, ${recentActivity.longitude.toFixed(6)}`
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      if (mounted.current) {
        toast({
          title: "Error",
          description: "Failed to load activities. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [toast]);

  // Load data on mount
  useEffect(() => {
    if (!initialLoadComplete.current) {
      fetchActivities();
      initialLoadComplete.current = true;
    }
  }, [fetchActivities]);

  // Handle prop activities update
  useEffect(() => {
    if (propActivities && Array.isArray(propActivities)) {
      setActivities(propActivities);
      const active = propActivities.find(activity => !activity.endTime);
      setActiveActivity(active || null);
      setLoading(false);
    }
  }, [propActivities]);

  // Enhanced location capture handler
  const handleLocationCapture = useCallback((location: LocationData) => {
    setActivityLocation(location);
    setLastKnownLocation(location);
    setShowLocationCapture(false); // Close the location capture dialog
    
    toast({
      title: "Location Captured",
      description: `${location.source === 'manual' ? 'Manual' : 'GPS'} location set successfully.`,
    });
  }, [toast]);

  // Start new activity with enhanced location
  const handleStartActivity = async () => {
    if (!formData.activityType || !formData.title) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Activity Type and Title)",
        variant: "destructive",
      });
      return;
    }

    if (!activityLocation) {
      toast({
        title: "Location Required",
        description: "Please capture your location before starting the activity.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const activityData = {
        activityType: formData.activityType,
        title: formData.title,
        description: formData.description || undefined,
        ticketId: formData.ticketId ? parseInt(formData.ticketId) : undefined,
        startTime: new Date().toISOString(),
        latitude: activityLocation.latitude,
        longitude: activityLocation.longitude,
        location: activityLocation.address,
        accuracy: activityLocation.accuracy,
        locationSource: activityLocation.source,
      };

      console.log('Starting activity with enhanced location:', activityData);

      const response = await apiClient.post('/activities', activityData);
      console.log('Activity started successfully:', response.data);

      toast({
        title: "Activity Started",
        description: `${formData.title} has been started with ${activityLocation.source === 'manual' ? 'manual' : 'GPS'} location.`,
      });

      // Reset form and close dialog
      setFormData({
        activityType: "",
        title: "",
        description: "",
        ticketId: "",
      });
      setActivityLocation(null);
      setDialogOpen(false);

      // Refresh activities
      await fetchActivities();
      if (onActivityChange) {
        await onActivityChange();
      }
    } catch (error: any) {
      console.error('Failed to start activity:', error);
      
      if (error.response?.status === 400 && error.response?.data?.message?.includes('check in')) {
        toast({
          title: "Check-in Required",
          description: "You must check in before logging activities. Please check in first with your location.",
          variant: "destructive",
        });
      } else {
        const errorMessage = error.response?.data?.error || error.message || "Failed to start activity";
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

      const response = await apiClient.put(`/activities/${activeActivity.id}`, {
        endTime: new Date().toISOString(),
      });

      console.log('Activity ended successfully:', response.data);

      toast({
        title: "Activity Completed",
        description: `${activeActivity.title} has been completed.`,
      });

      // Refresh activities
      await fetchActivities();
      if (onActivityChange) {
        await onActivityChange();
      }
    } catch (error: any) {
      console.error('Failed to end activity:', error);
      
      let errorMessage = "Failed to end activity. Please try again.";
      if (error.response?.status === 404) {
        errorMessage = "Activity not found or already ended";
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid request - activity may already be completed";
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

  // Get activity type info
  const getActivityTypeInfo = (type: string) => {
    return ACTIVITY_TYPES.find((t) => t.value === type) || {
      label: type,
      icon: "📋",
    };
  };

  // Format duration with live calculation
  const formatDuration = (minutes?: number, ongoing?: boolean, startTime?: string) => {
    if (ongoing && startTime) {
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
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    
    if (ongoing) return "Ongoing";
    if (!minutes || minutes <= 0) return "N/A";
    
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading && !initialLoadComplete.current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Logger
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!!activeActivity}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isMobile ? "Add" : "Add Activity"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-600" />
                    Start New Activity
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Activity Type */}
                  <div className="space-y-2">
                    <Label htmlFor="activityType">Activity Type *</Label>
                    <Select
                      value={formData.activityType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, activityType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity type..." />
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

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Enter activity title..."
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Enter activity description..."
                      rows={3}
                    />
                  </div>

                  {/* Ticket ID (for TICKET_WORK) */}
                  {formData.activityType === "TICKET_WORK" && (
                    <div className="space-y-2">
                      <Label htmlFor="ticketId">Ticket ID</Label>
                      <Input
                        id="ticketId"
                        type="number"
                        value={formData.ticketId}
                        onChange={(e) =>
                          setFormData({ ...formData, ticketId: e.target.value })
                        }
                        placeholder="Enter ticket ID..."
                      />
                    </div>
                  )}

                  {/* Location Section */}
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    
                    {/* Show location capture only when needed */}
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
                          onLocationCapture={handleLocationCapture}
                          previousLocation={lastKnownLocation || undefined}
                          required={true}
                          enableJumpDetection={true}
                          autoCapture={false}
                          className=""
                        />
                      </div>
                    ) : (
                      /* Show captured location or capture button */
                      <div className="space-y-2">
                        {activityLocation ? (
                          /* Location captured - show details */
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">Location Ready</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {activityLocation.source === 'manual' ? (
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    Manual
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    <Navigation className="h-3 w-3 mr-1" />
                                    GPS ±{Math.round(activityLocation.accuracy)}m
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowLocationCapture(true)}
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                >
                                  <Target className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-green-700">
                              {activityLocation.address || 
                               `${activityLocation.latitude.toFixed(6)}, ${activityLocation.longitude.toFixed(6)}`}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                              Captured: {new Date(activityLocation.timestamp).toLocaleTimeString()}
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
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setFormData({
                        activityType: "",
                        title: "",
                        description: "",
                        ticketId: "",
                      });
                      setActivityLocation(null);
                      setShowLocationCapture(false);
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStartActivity}
                    disabled={submitting || !activityLocation}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Activity
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Active Activity */}
          {activeActivity && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-green-700">
                  Active Activity
                </h3>
                <Button
                  size="sm"
                  onClick={handleEndActivity}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  End Activity
                </Button>
              </div>
              
              <Card className="border-l-4 border-l-green-500 bg-green-50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {getActivityTypeInfo(activeActivity.activityType).icon}
                        </span>
                        <Badge className="bg-green-100 text-green-800">
                          {getActivityTypeInfo(activeActivity.activityType).label}
                        </Badge>
                        <Badge variant="outline" className="animate-pulse">
                          <Clock className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      </div>
                      
                      <h4 className="font-semibold text-lg mb-1">
                        {activeActivity.title}
                      </h4>
                      
                      {activeActivity.description && (
                        <p className="text-gray-600 text-sm mb-2">
                          {activeActivity.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(
                            undefined,
                            true,
                            activeActivity.startTime
                          )}
                        </div>
                        {activeActivity.location && (
                          <div className="flex items-center gap-1">
                            {activeActivity.locationSource === 'manual' ? (
                              <Navigation className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Target className="h-4 w-4 text-green-600" />
                            )}
                            <span className="truncate max-w-48">
                              {activeActivity.location}
                            </span>
                            {activeActivity.accuracy && (
                              <Badge variant="secondary" className="text-xs">
                                ±{Math.round(activeActivity.accuracy)}m
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activities */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Recent Activities ({activities.length})
            </h3>
            
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No activities logged yet.</p>
                <p className="text-sm">Start your first activity to begin tracking.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => {
                  const typeInfo = getActivityTypeInfo(activity.activityType);
                  const isActive = !activity.endTime;
                  
                  return (
                    <Card 
                      key={activity.id} 
                      className={cn(
                        "border-l-4",
                        isActive ? "border-l-green-500 bg-green-50" : "border-l-gray-300"
                      )}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{typeInfo.icon}</span>
                              <Badge 
                                className={cn(
                                  isActive 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-gray-100 text-gray-800"
                                )}
                              >
                                {typeInfo.label}
                              </Badge>
                              {isActive && (
                                <Badge variant="outline" className="animate-pulse">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            
                            <h4 className="font-semibold mb-1">{activity.title}</h4>
                            
                            {activity.description && (
                              <p className="text-gray-600 text-sm mb-2">
                                {activity.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatDuration(
                                  activity.duration,
                                  isActive,
                                  activity.startTime
                                )}
                              </div>
                              
                              {activity.location && (
                                <div className="flex items-center gap-1">
                                  {activity.locationSource === 'manual' ? (
                                    <Navigation className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <Target className="h-4 w-4 text-green-600" />
                                  )}
                                  <span className="truncate max-w-32">
                                    {activity.location}
                                  </span>
                                  {activity.accuracy && (
                                    <Badge variant="secondary" className="text-xs">
                                      ±{Math.round(activity.accuracy)}m
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(activity.startTime).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const ActivityLoggerEnhanced = React.memo(ActivityLoggerEnhancedComponent);

export default ActivityLoggerEnhanced;
