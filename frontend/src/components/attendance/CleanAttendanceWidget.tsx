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
  X
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

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  timestamp: string;
}

// Enhanced location data from our new system
interface AttendanceLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  timestamp: number;
  source: 'gps' | 'manual' | 'network';
}

interface CleanAttendanceWidgetProps {
  onStatusChange?: () => void;
  initialData?: AttendanceData;
}

interface LocationCaptureState {
  isCapturing: boolean;
  capturedLocation: LocationData | null;
  error: string | null;
}

interface EnhancedLocationCaptureState {
  isCapturing: boolean;
  capturedLocation: AttendanceLocationData | null;
  error: string | null;
  showLocationCapture: boolean;
}

export default function CleanAttendanceWidget({ 
  onStatusChange,
  initialData
}: CleanAttendanceWidgetProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(initialData || null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEarlyCheckoutConfirm, setShowEarlyCheckoutConfirm] = useState(false);
  const [earlyCheckoutData, setEarlyCheckoutData] = useState<any>(null);
  const [locationState, setLocationState] = useState<LocationCaptureState>({
    isCapturing: false,
    capturedLocation: null,
    error: null
  });
  
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

  // Enhanced location capture handler
  const handleEnhancedLocationCapture = (location: EnhancedLocationData) => {
    const attendanceLocation: AttendanceLocationData = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      address: location.address,
      timestamp: location.timestamp,
      source: location.source === 'network' ? 'gps' : location.source
    };
    
    setEnhancedLocationState(prev => ({
      ...prev,
      capturedLocation: attendanceLocation,
      error: null,
      showLocationCapture: false
    }));
    
    setLastKnownLocation(attendanceLocation);
  };

  // Legacy location capture (keeping for backward compatibility)
  const getCurrentLocation = async (): Promise<LocationData> => {
    setLocationState({
      isCapturing: true,
      capturedLocation: null,
      error: null
    });

    try {
      // Take multiple GPS readings to handle intermittent issues
      const readings: LocationData[] = [];
      const maxReadings = 3;
      const readingDelay = 2000; // 2 seconds between readings

      for (let i = 0; i < maxReadings; i++) {
        try {
          const reading = await getSingleLocationReading();
          readings.push(reading);
          
          // If we get a very accurate reading early, we can use it
          if (reading.accuracy <= 50 && i > 0) {
            break;
          }
          
          // Wait before next reading (except for last one)
          if (i < maxReadings - 1) {
            await new Promise(resolve => setTimeout(resolve, readingDelay));
          }
        } catch (error) {
          // Continue with other readings even if one fails
        }
      }

      if (readings.length === 0) {
        throw new Error('All GPS readings failed');
      }

      // Analyze readings for consistency
      const bestReading = selectBestLocationReading(readings);
      
      // Update location state with the best reading
      setLocationState({
        isCapturing: false,
        capturedLocation: bestReading,
        error: null
      });

      return bestReading;

    } catch (error: any) {
      setLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: error.message || 'Failed to get consistent GPS location'
      });
      throw error;
    }
  };

  // Select the best location reading from multiple GPS attempts
  const selectBestLocationReading = (readings: LocationData[]): LocationData => {
    if (readings.length === 1) {
      return readings[0];
    }

    // Strategy 1: If we have a reading with excellent accuracy (<50m), prefer it
    const excellentReadings = readings.filter(r => r.accuracy <= 50);
    if (excellentReadings.length > 0) {
      const best = excellentReadings.reduce((best, current) => 
        current.accuracy < best.accuracy ? current : best
      );
      return best;
    }

    // Strategy 2: Check for consistency between readings
    const consistentReadings = findConsistentReadings(readings);
    if (consistentReadings.length > 0) {
      const best = consistentReadings.reduce((best, current) => 
        current.accuracy < best.accuracy ? current : best
      );
      return best;
    }

    // Strategy 3: Fall back to best accuracy
    const best = readings.reduce((best, current) => 
      current.accuracy < best.accuracy ? current : best
    );
    return best;
  };

  // Find readings that are geographically consistent (within reasonable distance)
  const findConsistentReadings = (readings: LocationData[]): LocationData[] => {
    if (readings.length < 2) return readings;

    const CONSISTENCY_THRESHOLD = 500; // 500 meters threshold for consistency
    const consistent: LocationData[] = [];

    for (let i = 0; i < readings.length; i++) {
      let consistentCount = 1; // Count itself
      
      for (let j = 0; j < readings.length; j++) {
        if (i !== j) {
          const distance = calculateDistance(
            readings[i].latitude, readings[i].longitude,
            readings[j].latitude, readings[j].longitude
          );
          
          if (distance <= CONSISTENCY_THRESHOLD) {
            consistentCount++;
          }
        }
      }
      
      // If this reading is consistent with at least one other reading
      if (consistentCount > 1) {
        consistent.push(readings[i]);
      }
    }

    return consistent;
  };

  // Calculate distance between two GPS coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get a single GPS reading
  const getSingleLocationReading = async (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by this browser';
        setLocationState({
          isCapturing: false,
          capturedLocation: null,
          error
        });
        reject(new Error(error));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Warn about poor GPS accuracy and provide user guidance
          if (accuracy > 100) {
            // Show user warning for poor accuracy
            setLocationState(prev => ({
              ...prev,
              error: `Very poor GPS signal (±${Math.round(accuracy)}m). Please go outdoors with clear sky view for better accuracy. Location may be off by over 3km.`
            }));
          } else if (accuracy > 500) {
            // Show user warning for poor accuracy
            setLocationState(prev => ({
              ...prev,
              error: `Poor GPS signal (±${Math.round(accuracy)}m). Consider moving outdoors for better accuracy.`
            }));
          }
          
          // Get address from coordinates
          let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          try {
            const response = await apiClient.get(`/geocoding/reverse?latitude=${latitude}&longitude=${longitude}`);
            
            // Handle different response formats
            if (response.data?.address) {
              // Direct address in response
              address = response.data.address;
              } else if (response.data?.success && response.data?.data?.address) {
              // Nested address format
              address = response.data.data.address;
              } else {
              }
          } catch (error: any) {
            }

          const locationData = { 
            latitude, 
            longitude, 
            accuracy, 
            address,
            timestamp: new Date().toISOString()
          };
          
          // Update location state with captured location and clear capturing state
          setLocationState({
            isCapturing: false,
            capturedLocation: locationData,
            error: null
          });
          
          resolve(locationData);
        },
        (error) => {
          const errorMessage = `Location error: ${error.message}`;
          setLocationState({
            isCapturing: false,
            capturedLocation: null,
            error: errorMessage
          });
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout for better accuracy
          maximumAge: 0 // Always get fresh location
        }
      );
    });
  };

  // Handle check-in with enhanced location validation
  const handleCheckIn = async () => {
    // Check if we have enhanced location data
    if (!enhancedLocationState.capturedLocation) {
      // Show enhanced location capture dialog
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
    
    // Validate GPS accuracy (reject if > 100m for GPS sources)
    if (location.source === 'gps' && location.accuracy > 2000) {
      toast({
        title: "GPS Accuracy Too Poor",
        description: `GPS accuracy is ±${Math.round(location.accuracy)}m (requires ≤2000m). Please move to an area with better GPS signal.`,
        variant: "destructive",
      });
      
      // Show location capture again for manual selection
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

      const response = await apiClient.post('/attendance/checkin', checkInData);
      
      // Reset enhanced location state
      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      await fetchAttendanceStatus();
    } catch (error: any) {
      let errorMessage = 'Failed to check in. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid location data. Please try capturing location again.';
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

  // Legacy check-in handler (keeping for fallback)
  const handleLegacyCheckIn = async () => {
    setActionLoading(true);
    try {
      // Get location with visual feedback
      const location = await getCurrentLocation();
      // Send check-in request
      const response = await apiClient.post('/attendance/checkin', {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });

      const result = response.data || response;
      // Update local state immediately
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

      // Refresh local data
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
    } catch (error: any) {
      // If already checked in, refresh status to sync UI with backend
      if (error.response?.status === 400 && 
          (error.response?.data?.error === 'Already checked in' || 
           error.response?.data?.message?.includes('already checked in'))) {
        toast({
          title: 'Already Checked In',
          description: 'You are currently checked in. Refreshing status...',
          variant: 'destructive',
        });
        // Refresh local data
      await fetchAttendanceStatus();
      } else {
        toast({
          title: 'Check-in Failed',
          description: error.response?.data?.message || error.message || 'Failed to check in',
          variant: 'destructive',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle check-out with enhanced location validation
  const handleCheckOut = async () => {
    // Check if user is actually checked in
    if (!attendanceData?.isCheckedIn || !attendanceData?.attendance?.id) {
      toast({
        title: "Cannot Check Out",
        description: "You are not currently checked in or attendance record not found.",
        variant: "destructive",
      });
      
      // Refresh attendance status to sync with backend
      await fetchAttendanceStatus();
      return;
    }

    // Check if we have enhanced location data
    if (!enhancedLocationState.capturedLocation) {
      // Show enhanced location capture dialog
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
    
    // Validate GPS accuracy (reject if > 100m for GPS sources)
    if (location.source === 'gps' && location.accuracy > 2000) {
      toast({
        title: "GPS Accuracy Too Poor",
        description: `GPS accuracy is ±${Math.round(location.accuracy)}m (requires ≤2000m). Please move to an area with better GPS signal.`,
        variant: "destructive",
      });
      
      // Show location capture again for manual selection
      setEnhancedLocationState(prev => ({
        ...prev,
        showLocationCapture: true
      }));
      return;
    }

    const checkOutData = {
      attendanceId: attendanceData.attendance.id,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
      locationSource: location.source // 'gps' or 'manual'
    };

    setActionLoading(true);
    try {
      const response = await apiClient.post('/attendance/checkout', checkOutData);
      
      // Reset enhanced location state
      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      await fetchAttendanceStatus();
    } catch (error: any) {
      // Handle early checkout confirmation - Show dialog to user
      if (error.response?.status === 400 && error.response.data?.requiresConfirmation) {
        // Store the checkout data and show confirmation dialog
        setEarlyCheckoutData({
          location: location,
          confirmationData: error.response.data
        });
        setShowEarlyCheckoutConfirm(true);
        setActionLoading(false);
        return; // Wait for user confirmation
      }
      
      // Handle other errors
      let errorMessage = 'Failed to check out. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 404) {
        errorMessage = 'Active attendance record not found. Please refresh and try again.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid checkout data. Please try again.';
      }
      
      toast({
        title: 'Check-out Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setActionLoading(false);
    }
  };

  // Legacy check-out handler (keeping for fallback)
  const handleLegacyCheckOut = async () => {
    setActionLoading(true);
    try {
      // Get location with visual feedback
      const location = await getCurrentLocation();
      // Send check-out request
      const response = await apiClient.post('/attendance/checkout', {
        attendanceId: attendanceData?.attendance?.id,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });

      const result = response.data || response;
      // Update local state immediately
      const newData: AttendanceData = {
        isCheckedIn: false,
        attendance: result.attendance ? {
          id: result.attendance.id,
          checkInAt: result.attendance.checkInAt,
          checkOutAt: result.attendance.checkOutAt,
          checkInAddress: result.attendance.checkInAddress,
          checkOutAddress: result.attendance.checkOutAddress || location.address,
          status: result.attendance.status || 'CHECKED_OUT',
          totalHours: result.attendance.totalHours
        } : attendanceData?.attendance
      };
      setAttendanceData(newData);

      // Refresh local data
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
    } catch (error: any) {
      // Handle early checkout confirmation - Show dialog to user
      if (error.response?.status === 400 && error.response?.data?.requiresConfirmation) {
        const capturedLocation = enhancedLocationState.capturedLocation;
        if (!capturedLocation) {
          toast({
            title: 'Location Required',
            description: 'Please capture your location for checkout.',
            variant: 'destructive',
          });
          setActionLoading(false);
          return;
        }
        
        // Store the checkout data and show confirmation dialog
        setEarlyCheckoutData({
          location: capturedLocation,
          confirmationData: error.response.data
        });
        setShowEarlyCheckoutConfirm(true);
        setActionLoading(false);
        return; // Wait for user confirmation
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

  // Handle re-check-in with enhanced location validation
  const handleReCheckIn = async () => {
    // Check if we have enhanced location data
    if (!enhancedLocationState.capturedLocation) {
      // Show enhanced location capture dialog
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
    
    // Validate GPS accuracy (reject if > 100m for GPS sources)
    if (location.source === 'gps' && location.accuracy > 2000) {
      toast({
        title: "GPS Accuracy Too Poor",
        description: `GPS accuracy is ±${Math.round(location.accuracy)}m (requires ≤2000m). Please move to an area with better GPS signal.`,
        variant: "destructive",
      });
      
      // Show location capture again for manual selection
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
      // Update local state immediately
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

      // Reset enhanced location state
      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      // Refresh local data
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
    } catch (error: any) {
      let errorMessage = 'Failed to re-check in. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid location data. Please try capturing location again.';
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

  // Legacy re-check-in handler (keeping for fallback)
  const handleLegacyReCheckIn = async () => {
    setActionLoading(true);
    try {
      // Get location with visual feedback
      const location = await getCurrentLocation();
      // Send re-check-in request
      const response = await apiClient.post('/attendance/re-checkin', {
        attendanceId: attendanceData?.attendance?.id,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });

      const result = response.data || response;
      // Update local state immediately
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

      // Refresh local data
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
    } catch (error: any) {
      toast({
        title: 'Re-Check-in Failed',
        description: error.response?.data?.message || 'Failed to re-check in',
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

      // Reset enhanced location state
      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      // Refresh local data
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
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

  const getStatusBadge = () => {
    if (!attendanceData) return null;

    if (attendanceData.isCheckedIn) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Checked In
        </Badge>
      );
    } else {
      const hasAttendanceToday = attendanceData.attendance && 
        (attendanceData.attendance.status === 'CHECKED_OUT' || attendanceData.attendance.status === 'EARLY_CHECKOUT');
      
      if (hasAttendanceToday) {
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            Can Re-Check In
          </Badge>
        );
      } else {
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
            <Clock className="w-3 h-3 mr-1" />
            Ready to Check In
          </Badge>
        );
      }
    }
  };

  const renderActionButton = () => {
    if (loading) {
      return (
        <Button disabled className="w-full h-12 text-sm font-semibold">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </Button>
      );
    }

    if (!attendanceData) {
      return (
        <Button disabled className="w-full h-12 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Loading...
        </Button>
      );
    }

    const isCheckedIn = attendanceData.isCheckedIn;
    const hasAttendanceToday = attendanceData.attendance && 
      (attendanceData.attendance.status === 'CHECKED_OUT' || attendanceData.attendance.status === 'EARLY_CHECKOUT');
    
    // Debug logging
    if (isCheckedIn) {
      return (
        <Button
          onClick={handleCheckOut}
          disabled={actionLoading}
          className="w-full h-14 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-sm font-bold shadow-lg shadow-red-500/30 active:scale-[0.98] transition-all duration-200 touch-manipulation rounded-xl"
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-5 h-5 mr-2" />
          )}
          {actionLoading ? 'Checking Out...' : 'Check Out'}
        </Button>
      );
    } else if (hasAttendanceToday) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs text-blue-700 font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 py-2.5 px-4 rounded-xl border border-blue-200">
            <CheckCircle className="w-4 h-4" />
            <span>Checked out today • Tap to resume work</span>
          </div>
          <Button
            onClick={handleReCheckIn}
            disabled={actionLoading}
            className="w-full h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-bold shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all duration-200 touch-manipulation rounded-xl"
          >
            {actionLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5 mr-2" />
            )}
            {actionLoading ? 'Re-Checking In...' : 'Re-Check In'}
          </Button>
        </div>
      );
    } else {
      return (
        <Button
          onClick={handleCheckIn}
          disabled={actionLoading}
          className="w-full h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-bold shadow-lg shadow-green-500/30 active:scale-[0.98] transition-all duration-200 touch-manipulation rounded-xl"
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5 mr-2" />
          )}
          {actionLoading ? 'Checking In...' : 'Check In'}
        </Button>
      );
    }
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
        {/* Premium Loading State */}
        <div className="bg-gradient-to-r from-[#3d5a78] via-[#507295] to-[#6889ab] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl animate-pulse"></div>
            <div className="space-y-2 flex-1">
              <div className="h-5 w-32 bg-white/30 rounded-lg animate-pulse"></div>
              <div className="h-3 w-24 bg-white/20 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6">
          <div className="space-y-3">
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
            <div className="h-14 bg-gray-100 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Early Checkout Confirmation Modal */}
      {showEarlyCheckoutConfirm && earlyCheckoutData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Early Check-out</h2>
                </div>
                <button
                  onClick={() => handleEarlyCheckoutConfirm(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-5 space-y-4">
              <p className="text-gray-600 text-sm sm:text-base">
                {earlyCheckoutData.confirmationData.message}
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-800 font-medium">
                    Current: {new Date(earlyCheckoutData.confirmationData.checkoutTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-800 font-medium">
                    Scheduled: {new Date(earlyCheckoutData.confirmationData.scheduledTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => handleEarlyCheckoutConfirm(false)}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-2"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleEarlyCheckoutConfirm(true)}
                  className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl font-bold"
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
      )}

      {/* Premium Attendance Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        {/* Premium Header */}
        <div className="relative bg-gradient-to-r from-[#3d5a78] via-[#507295] to-[#6889ab] p-4 sm:p-6 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Attendance</h2>
                <p className="text-white/70 text-xs sm:text-sm">Track your daily work hours</p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm border ${
              attendanceData?.isCheckedIn 
                ? 'bg-green-500/20 border-green-400/50' 
                : attendanceData?.attendance?.status === 'EARLY_CHECKOUT'
                ? 'bg-amber-500/20 border-amber-400/50'
                : 'bg-white/10 border-white/30'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                attendanceData?.isCheckedIn 
                  ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' 
                  : attendanceData?.attendance?.status === 'EARLY_CHECKOUT'
                  ? 'bg-amber-400'
                  : 'bg-white/50'
              }`}></div>
              <span className={`text-xs sm:text-sm font-semibold ${
                attendanceData?.isCheckedIn 
                  ? 'text-green-100' 
                  : attendanceData?.attendance?.status === 'EARLY_CHECKOUT'
                  ? 'text-amber-100'
                  : 'text-white/80'
              }`}>
                {attendanceData?.isCheckedIn 
                  ? 'Checked In' 
                  : attendanceData?.attendance?.status === 'EARLY_CHECKOUT'
                  ? 'Early Out'
                  : 'Ready to Check In'}
              </span>
            </div>
          </div>
          
          {/* Time Info for Checked-in State */}
          {attendanceData?.attendance && (
            <div className="relative z-10 mt-4 pt-4 border-t border-white/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 sm:px-4 sm:py-3">
                  <p className="text-white/60 text-xs font-medium">Check-in</p>
                  <p className="text-white font-bold text-sm sm:text-base">
                    {formatTime(attendanceData.attendance.checkInAt)}
                  </p>
                </div>
                {attendanceData.attendance.checkOutAt && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 sm:px-4 sm:py-3">
                    <p className="text-white/60 text-xs font-medium">Check-out</p>
                    <p className="text-white font-bold text-sm sm:text-base">
                      {formatTime(attendanceData.attendance.checkOutAt)}
                    </p>
                  </div>
                )}
                {attendanceData.attendance.totalHours && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 sm:px-4 sm:py-3">
                    <p className="text-white/60 text-xs font-medium">Total Hours</p>
                    <p className="text-white font-bold text-sm sm:text-base">
                      {formatHours(attendanceData.attendance.totalHours)}h
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Location Capture Status */}
          {locationState.isCapturing && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Navigation className="h-5 w-5 text-white animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">Capturing Location...</p>
                  <p className="text-xs text-gray-600">Taking multiple GPS readings for accuracy</p>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Location Capture Dialog */}
          {enhancedLocationState.showLocationCapture && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Location Required</h3>
                    <p className="text-xs text-gray-500">Capture your current location</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnhancedLocationState(prev => ({ ...prev, showLocationCapture: false }))}
                  className="h-9 w-9 p-0 rounded-full hover:bg-gray-200"
                >
                  <X className="h-4 w-4 text-gray-500" />
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
                className=""
              />
            </div>
          )}

          {/* Captured Location Status */}
          {enhancedLocationState.capturedLocation && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-green-800 text-sm">Location Ready</span>
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-xs px-2 py-1 ${
                    enhancedLocationState.capturedLocation.source === 'manual' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {enhancedLocationState.capturedLocation.source === 'manual' ? (
                    <>
                      <MapPin className="h-3 w-3 mr-1" />
                      Manual
                    </>
                  ) : (
                    <>
                      <Navigation className="h-3 w-3 mr-1" />
                      ±{Math.round(enhancedLocationState.capturedLocation.accuracy)}m
                    </>
                  )}
                </Badge>
              </div>
              <div className="bg-white/60 rounded-lg p-3 space-y-1">
                <p className="text-sm text-gray-700 break-words">
                  📍 {enhancedLocationState.capturedLocation.address || 
                   `${enhancedLocationState.capturedLocation.latitude.toFixed(6)}, ${enhancedLocationState.capturedLocation.longitude.toFixed(6)}`}
                </p>
                <p className="text-xs text-gray-500">
                  🕒 {new Date(enhancedLocationState.capturedLocation.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          {/* Location Error */}
          {locationState.error && !locationState.isCapturing && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-800 text-sm">Location Error</p>
                  <p className="text-xs text-red-600 mt-0.5">{locationState.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stored Location Info - when no fresh location */}
          {attendanceData?.attendance && !locationState.isCapturing && !locationState.capturedLocation && !enhancedLocationState.capturedLocation && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {attendanceData.attendance.checkInAddress && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <LogIn className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-medium">Check-in Location</p>
                    <p className="text-sm text-gray-800 break-words mt-0.5">
                      {attendanceData.attendance.checkInAddress}
                    </p>
                  </div>
                </div>
              )}
              {attendanceData.attendance.checkOutAddress && (
                <div className="flex items-start gap-3 pt-3 border-t border-gray-200">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <LogOut className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-medium">Check-out Location</p>
                    <p className="text-sm text-gray-800 break-words mt-0.5">
                      {attendanceData.attendance.checkOutAddress}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <div className="flex-1">
              {renderActionButton()}
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                fetchAttendanceStatus();
                fetchAttendanceStats();
                setLocationState(prev => ({
                  ...prev,
                  isCapturing: false,
                  error: null
                }));
              }}
              disabled={actionLoading || locationState.isCapturing}
              className="w-12 h-12 p-0 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <RotateCcw className={`w-5 h-5 text-gray-600 ${actionLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

