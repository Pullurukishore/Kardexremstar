"use client";

import { useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/use-toast';
import { EnhancedGPSService, GPSValidationResult, GPSLocation } from '@/services/gps-validation.service';
import { SimpleLocationData } from '@/components/location/SimpleAddressEntry';
import { apiClient } from '@/lib/api/api-client';

export interface LocationCaptureState {
  isLoading: boolean;
  isManualAddressOpen: boolean;
  currentLocation: LocationData | null;
  error: string | null;
  lastAttempt: GPSValidationResult | null;
  gpsRetryCount: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address: string;
  timestamp: number;
  source: 'gps' | 'manual' | 'network';
}

export interface UseEnhancedLocationOptions {
  maxAccuracy?: number;
  maxRetries?: number;
  timeout?: number;
  autoCapture?: boolean;
  enableJumpDetection?: boolean;
  previousLocation?: LocationData;
}

export const useEnhancedLocation = (options: UseEnhancedLocationOptions = {}) => {
  const {
    maxAccuracy = 100, // Reduced to 100m for better coordinate validation
    maxRetries = 3, // 3 GPS attempts before manual entry
    timeout = 15000,
    autoCapture = false,
    enableJumpDetection = true,
    previousLocation
  } = options;

  const [state, setState] = useState<LocationCaptureState>({
    isLoading: false,
    isManualAddressOpen: false,
    currentLocation: null,
    error: null,
    lastAttempt: null,
    gpsRetryCount: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Note: Using setState directly to avoid dependency issues

  // Capture GPS location - single attempt, if fails show manual entry immediately
  const captureGPSLocation = useCallback(async (): Promise<LocationData | null> => {
    // Cancel any ongoing capture
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      currentLocation: null,
      gpsRetryCount: 1 // Single attempt
    }));

    try {
      // Get validated GPS location with coordinate-based validation
      const result = await EnhancedGPSService.getLocationWithCoordinateValidation(
        previousLocation ? {
          latitude: previousLocation.latitude,
          longitude: previousLocation.longitude
        } : undefined,
        5, // 5km max distance from expected location
        maxAccuracy // Use configured accuracy threshold
      );

      setState(prev => ({ ...prev, lastAttempt: result }));

      // CASE 1: GPS Success - got a valid location
      if (result.success && result.location) {
        // Get address for the location
        const locationWithAddress = await enrichLocationWithAddress(result.location);

        // Check for unrealistic jumps if previous location exists
        if (enableJumpDetection && previousLocation && result.coordinateValidation) {
          if (!result.coordinateValidation.isValid) {
            const warnings = result.coordinateValidation.warnings || [];
            toast({
              title: "Location Validation Failed",
              description: `${warnings.join('. ')}. Please verify your location manually.`,
              variant: "destructive",
            });

            setState(prev => ({
              ...prev,
              isLoading: false,
              isManualAddressOpen: true,
              error: warnings.join('. ') || 'Location validation failed',
              gpsRetryCount: 1
            }));
            return null;
          }
        }

        // Show warning if present (for poor accuracy but still accepted)
        if (result.warning) {
          toast({
            title: "📍 GPS Location Captured",
            description: result.warning,
            variant: "default",
          });
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          currentLocation: locationWithAddress,
          error: null,
          gpsRetryCount: 0 // Reset on success
        }));

        return locationWithAddress;
      }

      // CASE 2: GPS Failed but got a location (poor accuracy > 2000m)
      else if (!result.success && result.location) {
        const accuracy = result.location.accuracy;
        const errorMsg = result.error || `GPS accuracy too poor: ±${Math.round(accuracy)}m`;

        setState(prev => ({
          ...prev,
          isLoading: false,
          isManualAddressOpen: true,
          error: errorMsg,
          gpsRetryCount: 1
        }));

        toast({
          title: "📍 GPS Accuracy Too Poor",
          description: `Got ±${Math.round(accuracy)}m accuracy (need < 2km). Please enter address manually.`,
          variant: "destructive",
        });

        return null;
      }

      // CASE 3: GPS Failed completely - use the error from service
      else {
        const errorMsg = result.error || "GPS location unavailable";

        setState(prev => ({
          ...prev,
          isLoading: false,
          isManualAddressOpen: true,
          error: errorMsg,
          gpsRetryCount: 1
        }));

        toast({
          title: "📍 GPS Failed",
          description: errorMsg,
          variant: "destructive",
        });

        return null;
      }

    } catch (error: any) {
      // Unexpected error - provide specific reason
      console.error('[GPS] Unexpected error:', error);

      let errorReason = "GPS service error";
      let helpfulTip = "Please enter your address manually";

      if (error.message?.includes('permission') || error.code === 1) {
        errorReason = "Location permission denied";
        helpfulTip = "Enable location access in your browser/device settings";
      } else if (error.message?.includes('timeout') || error.code === 3) {
        errorReason = "GPS timeout - took too long to get location";
        helpfulTip = "You may be indoors with weak signal";
      } else if (error.message?.includes('unavailable') || error.code === 2) {
        errorReason = "GPS position unavailable";
        helpfulTip = "Check if location services are on";
      } else if (error.message) {
        errorReason = error.message;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `${errorReason}. ${helpfulTip}`,
        isManualAddressOpen: true,
        gpsRetryCount: 1
      }));

      toast({
        title: "📍 GPS Error",
        description: `${errorReason}. ${helpfulTip}`,
        variant: "destructive",
      });

      return null;
    }
  }, [maxAccuracy, timeout, enableJumpDetection, previousLocation]);

  // Enrich location with address information
  const enrichLocationWithAddress = useCallback(async (location: GPSLocation): Promise<LocationData> => {
    try {
      const response = await apiClient.get('/geocoding/reverse', {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          source: 'gps',
          maxDistance: 5 // 5km max distance for coordinate validation
        }
      });

      // Handle both response formats: wrapped {success, data} and direct data
      const geocodingData = response.data.success ? response.data.data : response.data;

      if (geocodingData && geocodingData.address) {
        // Check coordinate validation from geocoding service
        const coordinateValidation = geocodingData.coordinateValidation;
        let finalAddress = geocodingData.address;

        // If coordinate validation failed, use coordinates as address
        if (coordinateValidation && !coordinateValidation.isValid) {
          finalAddress = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;

          // Show warning to user about address accuracy
          toast({
            title: "Address Accuracy Warning",
            description: "Using GPS coordinates due to address validation issues.",
            variant: "default",
          });
        }

        return {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          address: finalAddress,
          timestamp: location.timestamp,
          source: 'gps'
        };
      }
    } catch (error) {
      // Silently fail and fallback to coordinates
    }

    // Fallback to coordinates if geocoding fails
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      address: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
      timestamp: location.timestamp,
      source: 'gps'
    };
  }, []);

  // Validate location jump
  const validateLocationJump = useCallback(async (
    prevLocation: LocationData,
    newLocation: LocationData
  ): Promise<{ isUnrealistic: boolean; reason?: string }> => {
    try {
      const response = await apiClient.post('/geocoding/validate-jump', {
        previousLocation: {
          latitude: prevLocation.latitude,
          longitude: prevLocation.longitude,
          accuracy: prevLocation.accuracy,
          timestamp: prevLocation.timestamp,
          source: prevLocation.source
        },
        newLocation: {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          accuracy: newLocation.accuracy,
          timestamp: newLocation.timestamp,
          source: newLocation.source
        }
      });

      if (response.data.success) {
        return {
          isUnrealistic: response.data.data.isUnrealisticJump,
          reason: response.data.data.reason
        };
      }
    } catch (error) {
    }

    return { isUnrealistic: false };
  }, []);

  // Handle manual address entry
  const handleManualAddressSelect = useCallback((addressLocation: SimpleLocationData) => {
    const locationData: LocationData = {
      latitude: addressLocation.latitude,
      longitude: addressLocation.longitude,
      accuracy: addressLocation.accuracy,
      address: addressLocation.address,
      timestamp: addressLocation.timestamp,
      source: 'manual'
    };

    setState(prev => ({
      ...prev,
      isManualAddressOpen: false,
      currentLocation: locationData,
      error: null,
      gpsRetryCount: 0 // Reset retry count
    }));

    toast({
      title: "Address Confirmed",
      description: "Your location has been successfully set.",
    });
  }, []);

  // Open manual address entry
  const openManualAddress = useCallback(() => {
    setState(prev => ({ ...prev, isManualAddressOpen: true }));
  }, []);

  // Close manual address entry
  const closeManualAddress = useCallback(() => {
    setState(prev => ({ ...prev, isManualAddressOpen: false }));
  }, []);

  // Reset location state
  const resetLocation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      isManualAddressOpen: false,
      currentLocation: null,
      error: null,
      lastAttempt: null,
      gpsRetryCount: 0
    }));
  }, []);

  // Get location quality info
  const getLocationQuality = useCallback((location: LocationData) => {
    return EnhancedGPSService.getAccuracyQuality(location.accuracy);
  }, []);

  // Auto-capture on mount if enabled
  // useEffect(() => {
  //   if (autoCapture) {
  //     captureGPSLocation();
  //   }
  // }, [autoCapture, captureGPSLocation]);

  return {
    // State
    ...state,

    // Actions
    captureGPSLocation,
    handleManualAddressSelect,
    openManualAddress,
    closeManualAddress,
    resetLocation,

    // Utilities
    getLocationQuality,
    validateLocationJump,

    // Computed values
    hasValidLocation: !!state.currentLocation,
    isGPSLocation: state.currentLocation?.source === 'gps',
    isManualLocation: state.currentLocation?.source === 'manual',
    locationQuality: state.currentLocation ? EnhancedGPSService.getAccuracyQuality(state.currentLocation.accuracy) : null
  };
};
