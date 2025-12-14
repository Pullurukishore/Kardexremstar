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

  // Capture GPS location with enhanced validation
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
      gpsRetryCount: 0 // Reset retry count at start
    }));

    // Retry loop instead of recursion
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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

        setState(prev => ({ ...prev, lastAttempt: result, gpsRetryCount: attempt }));

        if (result.success && result.location) {
          // Get address for the location
          const locationWithAddress = await enrichLocationWithAddress(result.location);
          
          // Enhanced coordinate validation already performed by service
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
                gpsRetryCount: attempt
              }));
              return null;
            }
          }

          setState(prev => ({ 
            ...prev,
            isLoading: false,
            currentLocation: locationWithAddress,
            error: null,
            gpsRetryCount: 0 // Reset retry count on success
          }));
          
          return locationWithAddress;
        } else {
          // Handle GPS failure - check if we should retry or show manual entry
          if (attempt >= maxRetries) {
            // All retries exhausted, show manual address entry
            setState(prev => ({ 
              ...prev,
              isLoading: false,
              isManualAddressOpen: true,
              error: `GPS failed after ${attempt} attempts`,
              gpsRetryCount: attempt
            }));
            
            toast({
              title: "🛰️ GPS Signal Too Weak",
              description: `Tried ${attempt} times but GPS signal is too poor. Please enter your address manually.`,
              variant: "destructive",
            });
            
            return null;
          } else {
            // Show retry attempt with helpful guidance
            const remainingAttempts = maxRetries - attempt;
            const accuracy = result.location?.accuracy;
            
            let failureReason = "GPS signal is weak";
            let helpfulTip = "Try moving outdoors with clear sky view";
            
            if (accuracy && accuracy > 2000) {
              failureReason = "GPS signal is very poor";
              helpfulTip = "Go outdoors away from buildings for better signal";
            } else if (accuracy && accuracy > 3000) {
              failureReason = "GPS accuracy is insufficient";
              helpfulTip = "Move to an open area with clear sky view";
            } else if (!result.location) {
              failureReason = "GPS not available";
              helpfulTip = "Check if location services are enabled";
            }
            
            console.log(`[Location] Attempt ${attempt}/${maxRetries} failed - ${failureReason}, ${remainingAttempts} remaining`);
            
            toast({
              title: `🔄 GPS Attempt ${attempt}/${maxRetries} Failed`,
              description: `${failureReason}. ${helpfulTip}. ${remainingAttempts} attempts remaining.`,
              variant: "destructive",
            });
            
            // Faster retry - 500ms wait instead of 2 seconds
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Continue to next attempt
            continue;
          }
        }
      } catch (error: any) {
        if (attempt >= maxRetries) {
          // All retries exhausted due to errors
          setState(prev => ({ 
            ...prev,
            isLoading: false,
            error: `GPS failed after ${attempt} attempts`,
            isManualAddressOpen: true,
            gpsRetryCount: attempt
          }));
          
          toast({
            title: "🚫 GPS Unavailable",
            description: `GPS failed after ${attempt} attempts. Please enter your address manually.`,
            variant: "destructive",
          });
          
          return null;
        } else {
          // Retry with user-friendly error messaging
          const remainingAttempts = maxRetries - attempt;
          let errorReason = "GPS service error";
          let helpfulTip = "Check location permissions and try again";
          
          if (error.message?.includes('permission')) {
            errorReason = "Location permission denied";
            helpfulTip = "Please enable location access in your browser/device settings";
          } else if (error.message?.includes('timeout')) {
            errorReason = "GPS timeout";
            helpfulTip = "Move to an area with better GPS signal";
          } else if (error.message?.includes('unavailable')) {
            errorReason = "GPS unavailable";
            helpfulTip = "Check if location services are enabled on your device";
          }
          
          console.log(`[Location] Attempt ${attempt}/${maxRetries} error - ${errorReason}, ${remainingAttempts} remaining`);
          
          toast({
            title: `⚠️ GPS Attempt ${attempt}/${maxRetries} Error`,
            description: `${errorReason}. ${helpfulTip}. ${remainingAttempts} attempts remaining.`,
            variant: "destructive",
          });
          
          // Faster retry - 500ms wait instead of 2 seconds
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Continue to next attempt
          continue;
        }
      }
    }
    
    // Should never reach here, but just in case
    return null;
  }, [maxAccuracy, maxRetries, timeout, enableJumpDetection, previousLocation]);

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
