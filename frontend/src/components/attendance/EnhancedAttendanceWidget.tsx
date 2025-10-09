'use client';

import { useState, useEffect } from 'react';
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
  AlertTriangle,
  Navigation
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import LocationCapture from '@/components/location/LocationCapture';
import { LocationResult } from '@/services/LocationService';

interface AttendanceStatus {
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

interface EnhancedAttendanceWidgetProps {
  onStatusChange?: () => void;
  showLocationCapture?: boolean;
  accuracyThreshold?: number;
}

export function EnhancedAttendanceWidget({ 
  onStatusChange,
  showLocationCapture = true,
  accuracyThreshold = 100 // 100m default for attendance
}: EnhancedAttendanceWidgetProps = {}) {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showLocationUI, setShowLocationUI] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState<LocationResult | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAttendanceStatus();
    fetchAttendanceStats();
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const response = await apiClient.get('/attendance/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance status:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch attendance status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const response = await apiClient.get('/attendance/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
    }
  };

  const handleLocationCapture = (result: LocationResult) => {
    console.log('EnhancedAttendanceWidget: Location captured:', result);
    setCapturedLocation(result);
    setShowLocationUI(false);
    
    // Show success message
    toast({
      title: 'Location Captured',
      description: `Location accuracy: ±${Math.round(result.location.accuracy || 0)}m`,
    });
  };

  const handleLocationError = (error: string) => {
    console.error('EnhancedAttendanceWidget: Location error:', error);
    toast({
      title: 'Location Error',
      description: error,
      variant: 'destructive',
    });
  };

  const handleCheckIn = async () => {
    if (showLocationCapture && !capturedLocation) {
      setShowLocationUI(true);
      return;
    }

    setActionLoading(true);
    try {
      const locationData = capturedLocation ? {
        latitude: capturedLocation.location.latitude,
        longitude: capturedLocation.location.longitude,
        address: capturedLocation.address,
        accuracy: capturedLocation.location.accuracy,
        timestamp: capturedLocation.location.timestamp?.toISOString()
      } : undefined;

      const response = await apiClient.post('/attendance/checkin', {
        location: locationData
      });

      if (response.data.success) {
        await fetchAttendanceStatus();
        await fetchAttendanceStats();
        setCapturedLocation(null);
        
        toast({
          title: 'Checked In Successfully',
          description: capturedLocation?.address || 'Location recorded',
        });

        if (onStatusChange) {
          onStatusChange();
        }
      }
    } catch (error: any) {
      console.error('Check-in failed:', error);
      toast({
        title: 'Check-in Failed',
        description: error.response?.data?.message || 'Failed to check in',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (showLocationCapture && !capturedLocation) {
      setShowLocationUI(true);
      return;
    }

    setActionLoading(true);
    try {
      const locationData = capturedLocation ? {
        latitude: capturedLocation.location.latitude,
        longitude: capturedLocation.location.longitude,
        address: capturedLocation.address,
        accuracy: capturedLocation.location.accuracy,
        timestamp: capturedLocation.location.timestamp?.toISOString()
      } : undefined;

      const response = await apiClient.post('/attendance/checkout', {
        location: locationData
      });

      if (response.data.success) {
        await fetchAttendanceStatus();
        await fetchAttendanceStats();
        setCapturedLocation(null);
        
        toast({
          title: 'Checked Out Successfully',
          description: `Total hours: ${response.data.data?.totalHours?.toFixed(2) || 0}h`,
        });

        if (onStatusChange) {
          onStatusChange();
        }
      }
    } catch (error: any) {
      console.error('Check-out failed:', error);
      toast({
        title: 'Check-out Failed',
        description: error.response?.data?.message || 'Failed to check out',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (status.isCheckedIn) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Checked In
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
          <Clock className="w-3 h-3 mr-1" />
          Checked Out
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading attendance...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Attendance</CardTitle>
              <CardDescription>Track your daily work hours</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          {status?.attendance && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Check-in Time:</span>
                <span className="font-medium">{formatTime(status.attendance.checkInAt)}</span>
              </div>
              
              {status.attendance.checkOutAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Check-out Time:</span>
                  <span className="font-medium">{formatTime(status.attendance.checkOutAt)}</span>
                </div>
              )}
              
              {status.attendance.totalHours && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Hours:</span>
                  <span className="font-medium">{status.attendance.totalHours.toFixed(2)}h</span>
                </div>
              )}

              {/* Location Info */}
              {(status.attendance.checkInAddress || capturedLocation) && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Location:</p>
                      <p className="text-xs text-gray-800 truncate">
                        {capturedLocation?.address || status.attendance.checkInAddress || 'Not available'}
                      </p>
                      {capturedLocation?.location.accuracy && (
                        <p className="text-xs text-gray-500">
                          Accuracy: ±{Math.round(capturedLocation.location.accuracy)}m
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Location Capture UI */}
          {showLocationUI && showLocationCapture && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <LocationCapture
                onLocationCapture={handleLocationCapture}
                onError={handleLocationError}
                accuracyThreshold={accuracyThreshold}
                showAddress={true}
                title="Capture Location for Attendance"
                subtitle="We need your location to record attendance"
                className="space-y-3"
              />
              <div className="mt-3 pt-3 border-t border-blue-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLocationUI(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Captured Location Preview */}
          {capturedLocation && !showLocationUI && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Location Ready</span>
              </div>
              <p className="text-xs text-green-700 truncate">{capturedLocation.address}</p>
              <p className="text-xs text-green-600">
                Accuracy: ±{Math.round(capturedLocation.location.accuracy || 0)}m
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCapturedLocation(null);
                  setShowLocationUI(true);
                }}
                className="mt-2 text-xs h-7"
              >
                <Navigation className="h-3 w-3 mr-1" />
                Change Location
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {status?.isCheckedIn ? (
              <Button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Check Out
              </Button>
            ) : (
              <Button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Check In
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => {
                fetchAttendanceStatus();
                fetchAttendanceStats();
              }}
              disabled={actionLoading}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Weekly Stats */}
          {stats && (
            <div className="pt-3 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-2">This Week</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-blue-600">{stats.totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-gray-600">Total Hours</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-600">{stats.avgHoursPerDay.toFixed(1)}h</p>
                  <p className="text-xs text-gray-600">Avg/Day</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-purple-600">{stats.totalDaysWorked}</p>
                  <p className="text-xs text-gray-600">Days Worked</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EnhancedAttendanceWidget;
