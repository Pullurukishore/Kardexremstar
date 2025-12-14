'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  LogIn, 
  LogOut,
  Loader2,
  AlertCircle,
  RotateCcw,
  Navigation,
  X,
  ChevronDown,
  Play,
  Pause
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import EnhancedLocationCapture from '@/components/activity/EnhancedLocationCapture';
import { LocationData as EnhancedLocationData } from '@/hooks/useEnhancedLocation';

interface AttendanceData {
  isCheckedIn: boolean;
  attendance?: {
    id: number;
    checkInAt: string;
    checkOutAt?: string;
    checkInAddress?: string;
    checkOutAddress?: string;
    totalHours?: number;
    status: 'CHECKED_IN' | 'CHECKED_OUT' | 'EARLY_CHECKOUT';
  };
}

interface AttendanceStats {
  totalHours: number;
  avgHoursPerDay: number;
  totalDaysWorked: number;
}

interface AttendanceLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  timestamp: number;
  source: 'gps' | 'manual' | 'network';
}

interface ModernAttendanceWidgetProps {
  onStatusChange?: () => void;
  initialData?: AttendanceData;
}

interface EnhancedLocationCaptureState {
  isCapturing: boolean;
  capturedLocation: AttendanceLocationData | null;
  error: string | null;
  showLocationCapture: boolean;
}

/**
 * Modern Attendance Widget - Inspired by industry leaders
 * 
 * Design patterns from:
 * - Slack: Floating action buttons, minimal UI
 * - Figma: Status indicators, smooth transitions
 * - Linear: Keyboard shortcuts, quick actions
 * - Notion: Expandable sections, clean hierarchy
 * 
 * Features:
 * 1. Floating Action Button (FAB) - Primary action always accessible
 * 2. Minimal Status Display - Only essential info visible
 * 3. Expandable Details - Click to see full information
 * 4. Quick Actions - Keyboard shortcuts (Space to toggle)
 * 5. Smooth Transitions - Professional animations
 * 6. Mobile-First - Touch-optimized with 44px+ targets
 */
export default function ModernAttendanceWidget({ 
  onStatusChange,
  initialData
}: ModernAttendanceWidgetProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(initialData || null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEarlyCheckoutConfirm, setShowEarlyCheckoutConfirm] = useState(false);
  const [earlyCheckoutData, setEarlyCheckoutData] = useState<any>(null);
  
  // Enhanced location state
  const [enhancedLocationState, setEnhancedLocationState] = useState<EnhancedLocationCaptureState>({
    isCapturing: false,
    capturedLocation: null,
    error: null,
    showLocationCapture: false
  });
  
  const [lastKnownLocation, setLastKnownLocation] = useState<AttendanceLocationData | null>(null);
  const { toast } = useToast();

  // Fetch attendance status
  const fetchAttendanceStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/attendance/status');
      const data = response.data || response;
      setAttendanceData(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch attendance status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch attendance stats
  const fetchAttendanceStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/attendance/stats');
      const data = response.data || response;
      setStats(data);
    } catch (error) {
      // Silent fail for stats
    }
  }, []);

  // Initialize data
  useEffect(() => {
    if (!initialData) {
      fetchAttendanceStatus();
    }
    fetchAttendanceStats();
  }, [initialData, fetchAttendanceStatus, fetchAttendanceStats]);

  // Update when initial data changes
  useEffect(() => {
    if (initialData) {
      setAttendanceData(initialData);
    }
  }, [initialData]);

  // Keyboard shortcut: Space to toggle check-in/out
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if Space is pressed and no input is focused
      if (e.code === 'Space' && 
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (attendanceData?.isCheckedIn) {
          handleCheckOut();
        } else {
          handleCheckIn();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [attendanceData?.isCheckedIn]);

  // Enhanced location capture handler
  const handleEnhancedLocationCapture = (location: EnhancedLocationData) => {
    setEnhancedLocationState(prev => ({
      ...prev,
      capturedLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: location.address,
        timestamp: location.timestamp,
        source: location.source
      },
      error: null,
      showLocationCapture: false
    }));
    setLastKnownLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      address: location.address,
      timestamp: location.timestamp,
      source: location.source
    });
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (!enhancedLocationState.capturedLocation) {
      setEnhancedLocationState(prev => ({
        ...prev,
        showLocationCapture: true,
        error: null
      }));
      
      toast({
        title: "Location Required",
        description: "Please capture your location for check-in.",
        variant: "destructive",
      });
      return;
    }

    const location = enhancedLocationState.capturedLocation;
    
    if (location.source === 'gps' && location.accuracy > 2000) {
      toast({
        title: "GPS Accuracy Too Poor",
        description: `GPS accuracy is ±${Math.round(location.accuracy)}m. Please move to an area with better GPS signal.`,
        variant: "destructive",
      });
      
      setEnhancedLocationState(prev => ({
        ...prev,
        showLocationCapture: true
      }));
      return;
    }

    setActionLoading(true);
    try {
      const checkInData = {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        accuracy: location.accuracy,
        locationSource: location.source,
        timestamp: new Date(location.timestamp).toISOString()
      };

      await apiClient.post('/attendance/checkin', checkInData);
      
      toast({
        title: '✅ Checked In',
        description: `${location.address || 'Location captured'}`,
      });

      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      await fetchAttendanceStatus();
      onStatusChange?.();
    } catch (error: any) {
      let errorMessage = 'Failed to check in. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: 'Check-in Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (!enhancedLocationState.capturedLocation) {
      setEnhancedLocationState(prev => ({
        ...prev,
        showLocationCapture: true,
        error: null
      }));
      
      toast({
        title: "Location Required",
        description: "Please capture your location for check-out.",
        variant: "destructive",
      });
      return;
    }

    const location = enhancedLocationState.capturedLocation;

    setActionLoading(true);
    try {
      const checkOutData = {
        attendanceId: attendanceData?.attendance?.id,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        accuracy: location.accuracy,
        locationSource: location.source,
        timestamp: new Date(location.timestamp).toISOString()
      };

      const response = await apiClient.post('/attendance/checkout', checkOutData);
      
      const result = response.data || response;
      const newData: AttendanceData = {
        isCheckedIn: false,
        attendance: result.attendance ? {
          id: result.attendance.id,
          checkInAt: result.attendance.checkInAt,
          checkOutAt: result.attendance.checkOutAt,
          checkInAddress: result.attendance.checkInAddress,
          checkOutAddress: result.attendance.checkOutAddress,
          status: result.attendance.status || 'CHECKED_OUT',
          totalHours: result.attendance.totalHours
        } : attendanceData?.attendance
      };
      setAttendanceData(newData);

      toast({
        title: '✅ Checked Out',
        description: `Total hours: ${formatHours(result.attendance?.totalHours)}h`,
      });

      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      await fetchAttendanceStatus();
      await fetchAttendanceStats();
      onStatusChange?.();
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.requiresConfirmation) {
        setEarlyCheckoutData({
          location: location,
          confirmationData: error.response.data
        });
        setShowEarlyCheckoutConfirm(true);
        setActionLoading(false);
        return;
      }
      
      toast({
        title: 'Check-out Failed',
        description: error.response?.data?.message || 'Failed to check out',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle re-check-in
  const handleReCheckIn = async () => {
    if (!enhancedLocationState.capturedLocation) {
      setEnhancedLocationState(prev => ({
        ...prev,
        showLocationCapture: true,
        error: null
      }));
      
      toast({
        title: "Location Required",
        description: "Please capture your location for re-check-in.",
        variant: "destructive",
      });
      return;
    }

    const location = enhancedLocationState.capturedLocation;
    
    if (location.source === 'gps' && location.accuracy > 2000) {
      toast({
        title: "GPS Accuracy Too Poor",
        description: `GPS accuracy is ±${Math.round(location.accuracy)}m. Please move to an area with better GPS signal.`,
        variant: "destructive",
      });
      
      setEnhancedLocationState(prev => ({
        ...prev,
        showLocationCapture: true
      }));
      return;
    }

    setActionLoading(true);
    try {
      const reCheckInData = {
        attendanceId: attendanceData?.attendance?.id,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        accuracy: location.accuracy,
        locationSource: location.source,
        timestamp: new Date(location.timestamp).toISOString()
      };

      const response = await apiClient.post('/attendance/re-checkin', reCheckInData);
      
      const result = response.data || response;
      const newData: AttendanceData = {
        isCheckedIn: true,
        attendance: result.attendance ? {
          id: result.attendance.id,
          checkInAt: result.attendance.checkInAt,
          checkInAddress: result.attendance.checkInAddress || location.address,
          status: 'CHECKED_IN'
        } : {
          id: 0,
          checkInAt: new Date().toISOString(),
          checkInAddress: location.address,
          status: 'CHECKED_IN'
        }
      };
      setAttendanceData(newData);

      toast({
        title: '✅ Re-Checked In',
        description: `${location.address || 'Location captured'}`,
      });

      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      await fetchAttendanceStatus();
      await fetchAttendanceStats();
      onStatusChange?.();
    } catch (error: any) {
      let errorMessage = 'Failed to re-check in. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: 'Re-Check-in Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle early checkout confirmation
  const handleEarlyCheckoutConfirm = async (confirmed: boolean) => {
    setShowEarlyCheckoutConfirm(false);
    
    if (!confirmed || !earlyCheckoutData) {
      setEarlyCheckoutData(null);
      setActionLoading(false);
      return;
    }

    setActionLoading(true);
    try {
      const { location } = earlyCheckoutData;
      
      const response = await apiClient.post('/attendance/checkout', {
        attendanceId: attendanceData?.attendance?.id,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        locationSource: location.source,
        confirmEarlyCheckout: true
      });

      const result = response.data || response;
      const newData: AttendanceData = {
        isCheckedIn: false,
        attendance: result.attendance ? {
          id: result.attendance.id,
          checkInAt: result.attendance.checkInAt,
          checkOutAt: result.attendance.checkOutAt,
          checkInAddress: result.attendance.checkInAddress,
          checkOutAddress: result.attendance.checkOutAddress,
          status: result.attendance.status || 'EARLY_CHECKOUT',
          totalHours: result.attendance.totalHours
        } : attendanceData?.attendance
      };
      setAttendanceData(newData);

      toast({
        title: '✅ Checked Out',
        description: `Early checkout confirmed. Total hours: ${formatHours(result.attendance?.totalHours)}h`,
      });

      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      await fetchAttendanceStatus();
      await fetchAttendanceStats();
      onStatusChange?.();
    } catch (error: any) {
      toast({
        title: 'Check-out Failed',
        description: error.response?.data?.message || 'Failed to check out',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setEarlyCheckoutData(null);
    }
  };

  // Utility functions
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatHours = (hours: string | number | undefined, decimals: number = 2): string => {
    if (!hours) return '0';
    const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
    return isNaN(numHours) ? '0' : numHours.toFixed(decimals);
  };

  const getElapsedTime = () => {
    if (!attendanceData?.attendance?.checkInAt) return '0h 0m';
    
    const checkInTime = new Date(attendanceData.attendance.checkInAt).getTime();
    const now = new Date().getTime();
    const diffMs = now - checkInTime;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm">Loading attendance...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isCheckedIn = attendanceData?.isCheckedIn;
  const hasAttendanceToday = attendanceData?.attendance && 
    (attendanceData.attendance.status === 'CHECKED_OUT' || attendanceData.attendance.status === 'EARLY_CHECKOUT');

  return (
    <div className="space-y-3">
      {/* Early Checkout Confirmation Modal */}
      {showEarlyCheckoutConfirm && earlyCheckoutData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                  Early Check-out?
                </h2>
                <button
                  onClick={() => handleEarlyCheckoutConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {earlyCheckoutData.confirmationData.message}
                </p>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-800">
                      Current: {new Date(earlyCheckoutData.confirmationData.checkoutTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm mt-1">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-800">
                      Scheduled: {new Date(earlyCheckoutData.confirmationData.scheduledTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleEarlyCheckoutConfirm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleEarlyCheckoutConfirm(true)}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Status Card - Always Visible */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-slate-100">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Left: Status + Time */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isCheckedIn ? (
                <>
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-600">Checked In</p>
                    <p className="text-sm font-bold text-green-700">{getElapsedTime()}</p>
                  </div>
                </>
              ) : hasAttendanceToday ? (
                <>
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-600">Checked Out</p>
                    <p className="text-sm font-bold text-blue-700">{formatHours(attendanceData?.attendance?.totalHours)}h worked</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-600">Not Checked In</p>
                    <p className="text-sm font-bold text-gray-700">Ready to start</p>
                  </div>
                </>
              )}
            </div>

            {/* Right: Action Button + Expand */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Primary Action Button - Floating Style */}
              {isCheckedIn ? (
                <Button
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  size="sm"
                  className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                </Button>
              ) : hasAttendanceToday ? (
                <Button
                  onClick={handleReCheckIn}
                  disabled={actionLoading}
                  size="sm"
                  className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  size="sm"
                  className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                </Button>
              )}

              {/* Expand Button */}
              <Button
                onClick={() => setShowDetails(!showDetails)}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-white/50"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Keyboard Shortcut Hint */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            Press <kbd className="px-2 py-1 bg-white rounded border border-gray-300">Space</kbd> to toggle
          </div>
        </CardContent>
      </Card>

      {/* Expandable Details Section */}
      {showDetails && (
        <Card className="border-0 shadow-sm animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-4 space-y-4">
            {/* Location Capture Section */}
            {enhancedLocationState.showLocationCapture && (
              <div className="space-y-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-blue-900">📍 Location Required</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEnhancedLocationState(prev => ({ ...prev, showLocationCapture: false }))}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <EnhancedLocationCapture
                  onLocationCapture={handleEnhancedLocationCapture}
                  previousLocation={lastKnownLocation ? {
                    latitude: lastKnownLocation.latitude,
                    longitude: lastKnownLocation.longitude,
                    accuracy: lastKnownLocation.accuracy,
                    timestamp: lastKnownLocation.timestamp,
                    source: lastKnownLocation.source === 'network' ? 'gps' : lastKnownLocation.source,
                    address: lastKnownLocation.address || `${lastKnownLocation.latitude.toFixed(6)}, ${lastKnownLocation.longitude.toFixed(6)}`
                  } : undefined}
                  required={true}
                  enableJumpDetection={true}
                />
              </div>
            )}

            {/* Captured Location Display */}
            {enhancedLocationState.capturedLocation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">Location Ready</span>
                  </div>
                  {enhancedLocationState.capturedLocation.source === 'manual' ? (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                      Manual
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      ±{Math.round(enhancedLocationState.capturedLocation.accuracy)}m
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-green-700 break-words">
                  📍 {enhancedLocationState.capturedLocation.address || 
                   `${enhancedLocationState.capturedLocation.latitude.toFixed(6)}, ${enhancedLocationState.capturedLocation.longitude.toFixed(6)}`}
                </p>
              </div>
            )}

            {/* Attendance Details */}
            {attendanceData?.attendance && (
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Check-in:</span>
                  <span className="font-semibold text-gray-900">{formatTime(attendanceData.attendance.checkInAt)}</span>
                </div>
                
                {attendanceData.attendance.checkOutAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Check-out:</span>
                    <span className="font-semibold text-gray-900">{formatTime(attendanceData.attendance.checkOutAt)}</span>
                  </div>
                )}
                
                {attendanceData.attendance.totalHours && (
                  <div className="flex items-center justify-between text-xs border-t border-gray-200 pt-2">
                    <span className="text-gray-600">Total Hours:</span>
                    <span className="font-semibold text-gray-900">{formatHours(attendanceData.attendance.totalHours)}h</span>
                  </div>
                )}
              </div>
            )}

            {/* Location History */}
            {attendanceData?.attendance?.checkInAddress && (
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-600">Check-in Location:</p>
                    <p className="text-gray-800 break-words">{attendanceData.attendance.checkInAddress}</p>
                  </div>
                </div>
                
                {attendanceData.attendance.checkOutAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-600">Check-out Location:</p>
                      <p className="text-gray-800 break-words">{attendanceData.attendance.checkOutAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
                <div className="text-center">
                  <p className="text-xs text-gray-600">Total Hours</p>
                  <p className="text-sm font-bold text-blue-700">{formatHours(stats.totalHours)}h</p>
                </div>
                <div className="text-center border-l border-r border-gray-200">
                  <p className="text-xs text-gray-600">Avg/Day</p>
                  <p className="text-sm font-bold text-indigo-700">{formatHours(stats.avgHoursPerDay)}h</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600">Days Worked</p>
                  <p className="text-sm font-bold text-purple-700">{stats.totalDaysWorked}</p>
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchAttendanceStatus();
                fetchAttendanceStats();
              }}
              disabled={actionLoading}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
