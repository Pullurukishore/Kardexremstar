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
      console.log('CleanAttendanceWidget: Fetched status:', response);
      const data = response.data || response;
      setAttendanceData(data);
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
  }, [toast]);

  // Fetch attendance stats
  const fetchAttendanceStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/attendance/stats');
      const data = response.data || response;
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
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
    
    toast({
      title: "Location Captured",
      description: `${location.source === 'manual' ? 'Manual' : 'GPS'} location set for attendance.`,
    });
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

      console.log('CleanAttendanceWidget: Starting GPS consistency check with multiple readings...');

      for (let i = 0; i < maxReadings; i++) {
        try {
          console.log(`CleanAttendanceWidget: GPS reading ${i + 1}/${maxReadings}`);
          const reading = await getSingleLocationReading();
          readings.push(reading);
          
          // If we get a very accurate reading early, we can use it
          if (reading.accuracy <= 50 && i > 0) {
            console.log(`CleanAttendanceWidget: Excellent accuracy (±${Math.round(reading.accuracy)}m) achieved, using this reading`);
            break;
          }
          
          // Wait before next reading (except for last one)
          if (i < maxReadings - 1) {
            await new Promise(resolve => setTimeout(resolve, readingDelay));
          }
        } catch (error) {
          console.error(`CleanAttendanceWidget: GPS reading ${i + 1} failed:`, error);
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

      console.log('CleanAttendanceWidget: Best location selected:', bestReading);
      return bestReading;

    } catch (error: any) {
      console.error('CleanAttendanceWidget: GPS consistency check failed:', error);
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

    console.log('CleanAttendanceWidget: Analyzing GPS readings for consistency:', readings.map(r => ({
      lat: r.latitude.toFixed(6),
      lng: r.longitude.toFixed(6),
      accuracy: `±${Math.round(r.accuracy)}m`,
      address: r.address.substring(0, 50) + '...'
    })));

    // Strategy 1: If we have a reading with excellent accuracy (<50m), prefer it
    const excellentReadings = readings.filter(r => r.accuracy <= 50);
    if (excellentReadings.length > 0) {
      const best = excellentReadings.reduce((best, current) => 
        current.accuracy < best.accuracy ? current : best
      );
      console.log('CleanAttendanceWidget: Using excellent accuracy reading:', `±${Math.round(best.accuracy)}m`);
      return best;
    }

    // Strategy 2: Check for consistency between readings
    const consistentReadings = findConsistentReadings(readings);
    if (consistentReadings.length > 0) {
      const best = consistentReadings.reduce((best, current) => 
        current.accuracy < best.accuracy ? current : best
      );
      console.log('CleanAttendanceWidget: Using consistent reading:', `±${Math.round(best.accuracy)}m`);
      return best;
    }

    // Strategy 3: Fall back to best accuracy
    const best = readings.reduce((best, current) => 
      current.accuracy < best.accuracy ? current : best
    );
    console.log('CleanAttendanceWidget: Using best accuracy reading (no consistency found):', `±${Math.round(best.accuracy)}m`);
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

    console.log(`CleanAttendanceWidget: Found ${consistent.length} consistent readings out of ${readings.length}`);
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

      console.log('CleanAttendanceWidget: Starting GPS capture...');
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          console.log(`CleanAttendanceWidget: GPS obtained - Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}, Accuracy: ±${Math.round(accuracy)}m`);
          
          // Warn about poor GPS accuracy and provide user guidance
          if (accuracy > 100) {
            console.warn(`CleanAttendanceWidget: Poor GPS accuracy (±${Math.round(accuracy)}m) - location may be imprecise`);
            // Show user warning for poor accuracy
            setLocationState(prev => ({
              ...prev,
              error: `Very poor GPS signal (±${Math.round(accuracy)}m). Please go outdoors with clear sky view for better accuracy. Location may be off by over 3km.`
            }));
          } else if (accuracy > 500) {
            console.warn(`CleanAttendanceWidget: Poor GPS accuracy (±${Math.round(accuracy)}m) - location may be imprecise`);
            // Show user warning for poor accuracy
            setLocationState(prev => ({
              ...prev,
              error: `Poor GPS signal (±${Math.round(accuracy)}m). Consider moving outdoors for better accuracy.`
            }));
          }
          
          // Get address from coordinates
          let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          try {
            console.log('CleanAttendanceWidget: Getting address from backend geocoding...');
            const response = await apiClient.get(`/geocoding/reverse?latitude=${latitude}&longitude=${longitude}`);
            
            console.log('CleanAttendanceWidget: Geocoding response:', {
              success: response.data?.success,
              hasAddress: !!response.data?.address,
              fullResponse: response.data
            });
            
            // Handle different response formats
            if (response.data?.address) {
              // Direct address in response
              address = response.data.address;
              console.log('CleanAttendanceWidget: Address resolved (direct):', address);
            } else if (response.data?.success && response.data?.data?.address) {
              // Nested address format
              address = response.data.data.address;
              console.log('CleanAttendanceWidget: Address resolved (nested):', address);
            } else {
              console.warn('CleanAttendanceWidget: Geocoding returned no address:', response.data);
            }
          } catch (error: any) {
            console.error('CleanAttendanceWidget: Geocoding API failed:', {
              error: error?.message || error,
              status: error?.response?.status,
              data: error?.response?.data
            });
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
          
          console.log('CleanAttendanceWidget: Location captured and stored in state:', locationData);
          resolve(locationData);
        },
        (error) => {
          console.error('CleanAttendanceWidget: GPS error:', error);
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
    if (location.source === 'gps' && location.accuracy > 100) {
      toast({
        title: "GPS Accuracy Too Poor",
        description: `GPS accuracy is ±${Math.round(location.accuracy)}m (requires ≤100m). Please move to an area with better GPS signal.`,
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

      console.log('CleanAttendanceWidget: Enhanced check-in with location:', checkInData);
      
      const response = await apiClient.post('/attendance/checkin', checkInData);
      
      toast({
        title: 'Checked In Successfully',
        description: `Location: ${location.address || 'Coordinates captured'} (±${Math.round(location.accuracy)}m)`,
      });

      // Reset enhanced location state
      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      await fetchAttendanceStatus();
      if (onStatusChange) onStatusChange();
    } catch (error: any) {
      console.error('Check-in failed:', error);
      
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
      console.log('CleanAttendanceWidget: Starting check-in process...');
      
      // Get location with visual feedback
      const location = await getCurrentLocation();
      console.log('CleanAttendanceWidget: Location captured:', location);

      // Send check-in request
      const response = await apiClient.post('/attendance/checkin', {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });

      const result = response.data || response;
      console.log('CleanAttendanceWidget: Check-in successful:', result);
      
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

      toast({
        title: 'Checked In Successfully',
        description: location.address,
      });

      // Notify parent and refresh data
      if (onStatusChange) {
        await onStatusChange();
      }
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
    } catch (error: any) {
      console.error('Check-in failed:', error);
      
      // If already checked in, refresh status to sync UI with backend
      if (error.response?.status === 400 && 
          (error.response?.data?.error === 'Already checked in' || 
           error.response?.data?.message?.includes('already checked in'))) {
        toast({
          title: 'Already Checked In',
          description: 'You are currently checked in. Refreshing status...',
          variant: 'destructive',
        });
        // Refresh to sync state
        await fetchAttendanceStatus();
        if (onStatusChange) {
          await onStatusChange();
        }
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
    if (location.source === 'gps' && location.accuracy > 100) {
      toast({
        title: "GPS Accuracy Too Poor",
        description: `GPS accuracy is ±${Math.round(location.accuracy)}m (requires ≤100m). Please move to an area with better GPS signal.`,
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
      console.log('CleanAttendanceWidget: Sending checkout data:', checkOutData);

      const response = await apiClient.post('/attendance/checkout', checkOutData);
      
      toast({
        title: 'Checked Out Successfully',
        description: `Location: ${location.address || 'Coordinates captured'} (±${Math.round(location.accuracy)}m)`,
      });

      // Reset enhanced location state
      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      await fetchAttendanceStatus();
      if (onStatusChange) onStatusChange();
    } catch (error: any) {
      console.error('Check-out failed:', error);
      
      // Handle early checkout confirmation first
      if (error.response?.status === 400 && error.response.data?.requiresConfirmation) {
        // Auto-confirm early checkout for better UX
        try {
          const confirmCheckOutData = {
            ...checkOutData,
            confirmEarlyCheckout: true
          };
          
          console.log('CleanAttendanceWidget: Auto-confirming early checkout:', confirmCheckOutData);
          
          const confirmResponse = await apiClient.post('/attendance/checkout', confirmCheckOutData);
          
          toast({
            title: 'Checked Out Successfully',
            description: `Early checkout completed. You can re-check-in anytime.`,
          });

          // Reset enhanced location state
          setEnhancedLocationState({
            isCapturing: false,
            capturedLocation: null,
            error: null,
            showLocationCapture: false
          });

          await fetchAttendanceStatus();
          if (onStatusChange) onStatusChange();
          setActionLoading(false);
          return; // Exit successfully
        } catch (confirmError: any) {
          console.error('Early checkout confirmation failed:', confirmError);
          toast({
            title: 'Check-out Failed',
            description: confirmError.response?.data?.message || 'Failed to confirm early checkout',
            variant: 'destructive',
          });
          setActionLoading(false);
          return;
        }
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
      console.log('CleanAttendanceWidget: Starting check-out process...');
      
      // Get location with visual feedback
      const location = await getCurrentLocation();
      console.log('CleanAttendanceWidget: Location captured:', location);

      // Send check-out request
      const response = await apiClient.post('/attendance/checkout', {
        attendanceId: attendanceData?.attendance?.id,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });

      const result = response.data || response;
      console.log('CleanAttendanceWidget: Check-out successful:', result);
      
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

      toast({
        title: 'Checked Out Successfully',
        description: `Total hours: ${formatHours(result.attendance?.totalHours)}h`,
      });

      // Notify parent and refresh data
      if (onStatusChange) {
        await onStatusChange();
      }
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
    } catch (error: any) {
      // Handle early checkout confirmation - Auto-confirm for better UX
      if (error.response?.status === 400 && error.response?.data?.requiresConfirmation) {
        
        // Automatically confirm early checkout instead of showing dialog
        try {
          const capturedLocation = enhancedLocationState.capturedLocation;
          if (!capturedLocation) {
            toast({
              title: 'Location Required',
              description: 'Please capture your location for checkout.',
              variant: 'destructive',
            });
            return;
          }
          
          const response = await apiClient.post('/attendance/checkout', {
            attendanceId: attendanceData?.attendance?.id,
            latitude: capturedLocation.latitude,
            longitude: capturedLocation.longitude,
            address: capturedLocation.address || `${capturedLocation.latitude.toFixed(6)}, ${capturedLocation.longitude.toFixed(6)}`,
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
            title: 'Checked Out Successfully',
            description: `Early checkout completed. Total hours: ${formatHours(result.attendance?.totalHours)}h. You can re-check-in anytime.`,
          });

          // Reset enhanced location state
          setEnhancedLocationState({
            isCapturing: false,
            capturedLocation: null,
            error: null,
            showLocationCapture: false
          });

          if (onStatusChange) {
            await onStatusChange();
          }
          await fetchAttendanceStatus();
          await fetchAttendanceStats();
          return;
        } catch (confirmError: any) {
          toast({
            title: 'Check-out Failed',
            description: confirmError.response?.data?.message || 'Failed to confirm early checkout',
            variant: 'destructive',
          });
          return;
        }
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
    if (location.source === 'gps' && location.accuracy > 100) {
      toast({
        title: "GPS Accuracy Too Poor",
        description: `GPS accuracy is ±${Math.round(location.accuracy)}m (requires ≤100m). Please move to an area with better GPS signal.`,
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

      console.log('CleanAttendanceWidget: Enhanced re-check-in with location:', reCheckInData);
      
      const response = await apiClient.post('/attendance/re-checkin', reCheckInData);
      
      const result = response.data || response;
      console.log('CleanAttendanceWidget: Re-check-in successful:', result);
      
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

      toast({
        title: 'Re-Checked In Successfully',
        description: `Location: ${location.address || 'Coordinates captured'} (±${Math.round(location.accuracy)}m)`,
      });

      // Reset enhanced location state
      setEnhancedLocationState({
        isCapturing: false,
        capturedLocation: null,
        error: null,
        showLocationCapture: false
      });

      // Notify parent and refresh data
      if (onStatusChange) {
        await onStatusChange();
      }
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
    } catch (error: any) {
      console.error('Re-check-in failed:', error);
      
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
      console.log('CleanAttendanceWidget: Starting legacy re-check-in process...');
      
      // Get location with visual feedback
      const location = await getCurrentLocation();
      console.log('CleanAttendanceWidget: Location captured:', location);

      // Send re-check-in request
      const response = await apiClient.post('/attendance/re-checkin', {
        attendanceId: attendanceData?.attendance?.id,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });

      const result = response.data || response;
      console.log('CleanAttendanceWidget: Legacy re-check-in successful:', result);
      
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

      toast({
        title: 'Re-Checked In Successfully',
        description: location.address,
      });

      // Notify parent and refresh data
      if (onStatusChange) {
        await onStatusChange();
      }
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
    } catch (error: any) {
      console.error('Legacy re-check-in failed:', error);
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
      return;
    }

    setActionLoading(true);
    try {
      const { location } = earlyCheckoutData;
      
      const response = await apiClient.post('/attendance/checkout', {
        attendanceId: attendanceData?.attendance?.id,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
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
        title: 'Checked Out Successfully',
        description: `Total hours: ${formatHours(result.attendance?.totalHours)}h`,
      });

      if (onStatusChange) {
        await onStatusChange();
      }
      await fetchAttendanceStatus();
      await fetchAttendanceStats();
    } catch (error: any) {
      console.error('Early checkout failed:', error);
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
        <Button disabled className="w-full h-12 text-sm font-semibold">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading...
        </Button>
      );
    }

    const isCheckedIn = attendanceData.isCheckedIn;
    const hasAttendanceToday = attendanceData.attendance && 
      (attendanceData.attendance.status === 'CHECKED_OUT' || attendanceData.attendance.status === 'EARLY_CHECKOUT');
    
    // Debug logging
    console.log('CleanAttendanceWidget Button State:', {
      isCheckedIn,
      hasAttendanceToday,
      attendanceStatus: attendanceData.attendance?.status,
      attendanceData: attendanceData
    });

    if (isCheckedIn) {
      return (
        <Button
          onClick={handleCheckOut}
          disabled={actionLoading}
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-sm font-bold shadow-lg active:scale-95 transition-transform touch-manipulation"
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-5 h-5 mr-2" />
          )}
          {actionLoading ? 'Checking Out...' : '🚪 Check Out'}
        </Button>
      );
    } else if (hasAttendanceToday) {
      return (
        <div className="space-y-2">
          <div className="text-xs text-blue-600 font-semibold text-center bg-blue-50 py-2 px-3 rounded-lg border border-blue-200">
            ✅ Checked out today • Tap to resume work
          </div>
          <Button
            onClick={handleReCheckIn}
            disabled={actionLoading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-sm font-bold shadow-lg active:scale-95 transition-transform touch-manipulation"
          >
            {actionLoading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5 mr-2" />
            )}
            {actionLoading ? 'Re-Checking In...' : '🔄 Re-Check In'}
          </Button>
        </div>
      );
    } else {
      return (
        <Button
          onClick={handleCheckIn}
          disabled={actionLoading}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-sm font-bold shadow-lg active:scale-95 transition-transform touch-manipulation"
        >
          {actionLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5 mr-2" />
          )}
          {actionLoading ? 'Checking In...' : '✅ Check In'}
        </Button>
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
      {/* Early Checkout Confirmation Modal */}
      {showEarlyCheckoutConfirm && earlyCheckoutData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                  Early Check-out Confirmation
                </h2>
                <button
                  onClick={() => handleEarlyCheckoutConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  {earlyCheckoutData.confirmationData.message}
                </p>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-800">
                      Current time: {new Date(earlyCheckoutData.confirmationData.checkoutTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm mt-1">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-800">
                      Scheduled end: {new Date(earlyCheckoutData.confirmationData.scheduledTime).toLocaleTimeString('en-US', {
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
                    Confirm Early Check-out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Attendance Card - Mobile Optimized */}
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900 truncate">Attendance</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600 truncate">Track your daily work hours</CardDescription>
            </div>
            <div className="flex-shrink-0 ml-2">
              {getStatusBadge()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6 pb-4">
          {/* Current Status - Mobile Optimized */}
          {attendanceData?.attendance && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600 font-medium">Check-in:</span>
                <span className="font-bold text-green-700">{formatTime(attendanceData.attendance.checkInAt)}</span>
              </div>
              
              {attendanceData.attendance.checkOutAt && (
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600 font-medium">Check-out:</span>
                  <span className="font-bold text-red-700">{formatTime(attendanceData.attendance.checkOutAt)}</span>
                </div>
              )}
              
              {attendanceData.attendance.totalHours && (
                <div className="flex items-center justify-between text-xs sm:text-sm border-t border-gray-200 pt-2">
                  <span className="text-gray-600 font-medium">Total Hours:</span>
                  <span className="font-bold text-blue-700 text-sm">{formatHours(attendanceData.attendance.totalHours)}h</span>
                </div>
              )}

              {/* Location Capture Status - Mobile Optimized */}
              {locationState.isCapturing && (
                <div className="mt-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="flex items-center space-x-2">
                      <Navigation className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
                      <span className="text-sm font-semibold text-blue-800">Capturing Location...</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Taking multiple GPS readings for accuracy</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      <span className="text-xs text-blue-500">Checking GPS consistency</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Captured Location Display */}
              {locationState.capturedLocation && !locationState.isCapturing && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Latest Location Captured</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 py-0 h-5 ${
                          locationState.capturedLocation.accuracy > 100 
                            ? 'bg-red-100 text-red-700 border-red-300' 
                            : locationState.capturedLocation.accuracy > 50 
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                            : 'bg-green-100 text-green-700 border-green-300'
                        }`}
                      >
                        ±{Math.round(locationState.capturedLocation.accuracy)}m
                      </Badge>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="mb-2">
                      <p className="text-xs text-green-700">
                        🕒 {new Date(locationState.capturedLocation.timestamp).toLocaleString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    {/* GPS Accuracy Warning */}
                    {locationState.capturedLocation.accuracy > 50 && (
                      <div className={`mb-2 p-2 rounded text-xs ${
                        locationState.capturedLocation.accuracy > 100 
                          ? 'bg-red-50 border border-red-200 text-red-700' 
                          : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                      }`}>
                        <div className="flex items-center space-x-1">
                          <AlertCircle className="h-3 w-3" />
                          <span className="font-medium">
                            {locationState.capturedLocation.accuracy > 100 
                              ? 'Poor GPS Signal' 
                              : 'Fair GPS Signal'
                            }
                          </span>
                        </div>
                        <p className="mt-1">
                          {locationState.capturedLocation.accuracy > 100 
                            ? 'GPS accuracy is poor (±' + Math.round(locationState.capturedLocation.accuracy) + 'm). Please go outdoors with clear sky view.' 
                            : 'GPS accuracy is fair (±' + Math.round(locationState.capturedLocation.accuracy) + 'm). Consider moving outdoors for better accuracy.'
                          }
                        </p>
                      </div>
                    )}
                    
                    {/* Coordinates Display */}
                    <div className="space-y-1">
                      <div className="bg-white bg-opacity-70 rounded px-2 py-1">
                        <p className="text-xs font-mono text-gray-700">
                          📍 {locationState.capturedLocation.latitude.toFixed(6)}, {locationState.capturedLocation.longitude.toFixed(6)}
                        </p>
                      </div>
                      <div className="bg-white bg-opacity-70 rounded px-2 py-1">
                        <p className="text-xs text-gray-700 break-words">
                          🏠 {locationState.capturedLocation.address}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Error */}
              {locationState.error && !locationState.isCapturing && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Location Error</span>
                    </div>
                    <p className="text-xs text-red-600 mt-1">{locationState.error}</p>
                  </div>
                </div>
              )}

              {/* Stored Location Info - Only show if no fresh location captured */}
              {!locationState.isCapturing && !locationState.capturedLocation && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="space-y-2">
                    {/* Check-in Location */}
                    {attendanceData.attendance.checkInAddress && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600">Check-in Location:</p>
                          <p className="text-xs text-gray-800 break-words">
                            {attendanceData.attendance.checkInAddress}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Check-out Location */}
                    {attendanceData.attendance.checkOutAddress && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-blue-600">Check-out Location:</p>
                          <p className="text-xs text-gray-800 break-words">
                            {attendanceData.attendance.checkOutAddress}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Location Capture Dialog - Mobile Optimized */}
          {enhancedLocationState.showLocationCapture && (
            <div className="space-y-3 p-3 border border-blue-200 rounded-xl bg-blue-50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-blue-900 truncate">📍 Location Required</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnhancedLocationState(prev => ({ ...prev, showLocationCapture: false }))}
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 flex-shrink-0 rounded-full"
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
                className=""
              />
            </div>
          )}

          {/* Enhanced Location Status - Mobile Optimized */}
          {enhancedLocationState.capturedLocation && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-bold text-green-800 truncate">✅ Location Ready</span>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {enhancedLocationState.capturedLocation.source === 'manual' ? (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 px-2 py-1">
                      <MapPin className="h-3 w-3 mr-1" />
                      Manual
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 px-2 py-1">
                      <Navigation className="h-3 w-3 mr-1" />
                      ±{Math.round(enhancedLocationState.capturedLocation.accuracy)}m
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xs sm:text-sm text-green-700 break-words">
                📍 {enhancedLocationState.capturedLocation.address || 
                 `${enhancedLocationState.capturedLocation.latitude.toFixed(6)}, ${enhancedLocationState.capturedLocation.longitude.toFixed(6)}`}
              </div>
              <div className="text-xs text-green-600 mt-1">
                🕒 {new Date(enhancedLocationState.capturedLocation.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex gap-2">
            <div className="flex-1">
              {renderActionButton()}
            </div>
            
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                fetchAttendanceStatus();
                fetchAttendanceStats();
                // Only clear error state on refresh, preserve captured location
                setLocationState(prev => ({
                  ...prev,
                  isCapturing: false,
                  error: null
                }));
              }}
              disabled={actionLoading || locationState.isCapturing}
              className="px-3 py-2 h-10 min-w-[44px] touch-manipulation active:scale-95 transition-transform"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
