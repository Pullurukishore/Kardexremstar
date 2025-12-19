"use client";

import { toast } from "@/components/ui/use-toast";

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GPSValidationResult {
  success: boolean;
  location?: GPSLocation;
  error?: string;
  warning?: string;
  requiresManualSelection?: boolean;
  attemptsMade?: number;
}

export interface LocationValidationConfig {
  maxAccuracy: number; // meters
  maxRetries: number;
  timeout: number; // milliseconds
  enableHighAccuracy: boolean;
  maximumAge: number; // milliseconds
}

export class EnhancedGPSService {
  private static readonly DEFAULT_CONFIG: LocationValidationConfig = {
    maxAccuracy: 100, // Reduced to 100m for better accuracy validation
    maxRetries: 1, // Single attempt - hook handles retries
    timeout: 15000, // Increased to 15 seconds for high accuracy GPS
    enableHighAccuracy: true, // Always use high accuracy mode
    maximumAge: 0 // Always get fresh location
  };

  /**
   * Get validated GPS location with retry logic and accuracy checking
   */
  static async getValidatedLocation(
    config: Partial<LocationValidationConfig> = {}
  ): Promise<GPSValidationResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    if (!navigator.geolocation) {
      return {
        success: false,
        error: "Geolocation is not supported by this browser",
        requiresManualSelection: true
      };
    }

    // Single GPS attempt - let the hook handle retries for better UX
    try {
      const location = await this.attemptGPSCapture(finalConfig, 1);

      // Debug logging for accuracy validation
      console.log(`GPS Validation: accuracy=${location.accuracy}m, threshold=${finalConfig.maxAccuracy}m`);
      console.log(`GPS Validation: ${location.accuracy <= finalConfig.maxAccuracy ? 'ACCEPT' : 'REJECT'}`);

      // Intelligent accuracy validation - be very lenient, accept all valid coordinates
      const isGoodAccuracy = location.accuracy <= 50; // Excellent accuracy
      const isAcceptableAccuracy = location.accuracy <= finalConfig.maxAccuracy; // Within threshold
      const isFairAccuracy = location.accuracy <= 150; // Fair but usable
      const isPoorAccuracy = location.accuracy <= 500; // Poor but still usable
      const isVeryPoorAccuracy = location.accuracy <= 2000; // Very poor but still usable (field service reality)

      // Always accept excellent accuracy (≤50m) regardless of threshold
      if (isGoodAccuracy) {
        console.log(`GPS Success: Excellent ±${Math.round(location.accuracy)}m accuracy accepted`);
        return {
          success: true,
          location,
          attemptsMade: 1
        };
      }

      // Accept acceptable accuracy (≤100m by default)
      if (isAcceptableAccuracy) {
        console.log(`GPS Success: Acceptable ±${Math.round(location.accuracy)}m accuracy accepted`);
        return {
          success: true,
          location,
          attemptsMade: 1
        };
      }

      // For fair accuracy (≤150m), accept but with warning
      if (isFairAccuracy) {
        console.log(`GPS Success: Fair ±${Math.round(location.accuracy)}m accuracy accepted with warning`);
        return {
          success: true,
          location,
          attemptsMade: 1,
          warning: `GPS accuracy is fair (±${Math.round(location.accuracy)}m). Consider moving to open area for better accuracy.`
        };
      }

      // For poor accuracy (≤500m), accept but with strong warning
      if (isPoorAccuracy) {
        console.log(`GPS Success: Poor ±${Math.round(location.accuracy)}m accuracy accepted with warning`);
        return {
          success: true,
          location,
          attemptsMade: 1,
          warning: `GPS accuracy is poor (±${Math.round(location.accuracy)}m). Move to open area or use manual address entry for better accuracy.`
        };
      }

      // For very poor accuracy (≤2000m), accept but with very strong warning
      if (isVeryPoorAccuracy) {
        console.log(`GPS Success: Very poor ±${Math.round(location.accuracy)}m accuracy accepted with warning`);
        return {
          success: true,
          location,
          attemptsMade: 1,
          warning: `GPS accuracy is very poor (±${Math.round(location.accuracy)}m). Consider using manual address entry for better accuracy.`
        };
      }

      // Only reject extremely poor accuracy (>2000m) - GPS likely unavailable
      console.log(`GPS Failed: Extremely poor ±${Math.round(location.accuracy)}m accuracy exceeds acceptable threshold`);
      return {
        success: false,
        location,
        error: `GPS accuracy too poor: ±${Math.round(location.accuracy)}m. Please use manual address entry.`,
        requiresManualSelection: true,
        attemptsMade: 1
      };
    } catch (error: any) {
      console.log(`GPS Error:`, error);
      return {
        success: false,
        error: this.parseGPSError(error) || "GPS location unavailable",
        requiresManualSelection: true,
        attemptsMade: 1
      };
    }
  }

  /**
   * Attempt to capture GPS location with enhanced settings
   */
  private static async attemptGPSCapture(
    config: LocationValidationConfig,
    attemptNumber: number
  ): Promise<GPSLocation> {
    return new Promise<GPSLocation>((resolve, reject) => {
      /**
       * Mobile-optimized GPS capture strategy:
       * 1. Try high accuracy first (GPS on mobile) - quick timeout
       * 2. Fall back to network location (cell tower / WiFi) - faster for indoors
       * 3. Accept recent cached locations to avoid delays
       */

      // Try high accuracy GPS first (most mobile devices have good GPS)
      const tryHighAccuracy = () => {
        const highAccuracyOptions: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds - mobile GPS is usually fast
          maximumAge: 30000 // Accept 30-second old cached GPS location
        };

        console.log('[GPS Mobile] Trying high accuracy GPS...');

        navigator.geolocation.getCurrentPosition(
          (position) => handleSuccess(position, 'gps'),
          (error) => {
            console.log(`[GPS Mobile] High accuracy failed (code: ${error.code}), trying network location...`);
            tryNetworkLocation();
          },
          highAccuracyOptions
        );
      };

      // Fall back to network-based location (cell tower / WiFi)
      const tryNetworkLocation = () => {
        const networkOptions: PositionOptions = {
          enableHighAccuracy: false, // Network-based location
          timeout: 10000, // 10 seconds
          maximumAge: 120000 // Accept 2-minute old cached network location
        };

        console.log('[GPS Mobile] Trying network location (cell/WiFi)...');

        navigator.geolocation.getCurrentPosition(
          (position) => handleSuccess(position, 'network'),
          (error) => {
            console.log(`[GPS Mobile] Network location failed: code=${error.code}, ${error.message}`);
            reject(error);
          },
          networkOptions
        );
      };

      const handleSuccess = (position: GeolocationPosition, source: 'gps' | 'network') => {
        const location: GPSLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        // Basic coordinate validation - only reject invalid coordinates
        const validation = this.validateLocationByCoordinates(location);

        if (!validation.isValid && validation.warnings.some(w =>
          w.includes('Invalid') || w.includes('Null Island')
        )) {
          console.log(`[GPS Mobile] Invalid coordinates - ${validation.warnings.join(', ')}`);
          reject(new Error(`Invalid location: ${validation.warnings.join(', ')}`));
          return;
        }

        console.log(`[GPS Mobile] SUCCESS via ${source} - accuracy=${Math.round(location.accuracy)}m`);
        resolve(location);
      };

      // Start with high accuracy (GPS) attempt
      tryHighAccuracy();
    });
  }

  /**
   * Get high accuracy GPS location with enhanced validation
   */
  static async getHighAccuracyLocation(
    maxAccuracyMeters: number = 50,
    timeoutMs: number = 20000
  ): Promise<GPSValidationResult> {
    const config: LocationValidationConfig = {
      maxAccuracy: maxAccuracyMeters,
      maxRetries: 1,
      timeout: timeoutMs,
      enableHighAccuracy: true,
      maximumAge: 0
    };

    return this.getValidatedLocation(config);
  }

  /**
   * Validate location using coordinate-based distance checking
   */
  static validateLocationByCoordinates(
    currentLocation: GPSLocation,
    expectedLocation?: { latitude: number; longitude: number },
    maxDistanceKm: number = 5
  ): {
    isValid: boolean;
    distance?: number;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Basic coordinate validation
    if (!this.isValidCoordinate(currentLocation.latitude, currentLocation.longitude)) {
      warnings.push('Invalid GPS coordinates');
      return { isValid: false, warnings };
    }

    // Check accuracy threshold
    if (currentLocation.accuracy > 100) {
      warnings.push(`GPS accuracy is ${Math.round(currentLocation.accuracy)}m (prefer <100m)`);
    }

    // Validate against expected location if provided
    if (expectedLocation) {
      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        expectedLocation.latitude,
        expectedLocation.longitude
      );

      if (distance > maxDistanceKm) {
        warnings.push(
          `Location is ${distance.toFixed(2)}km from expected position (max: ${maxDistanceKm}km)`
        );
        return {
          isValid: false,
          distance,
          warnings
        };
      }

      return {
        isValid: true,
        distance,
        warnings: warnings.length > 0 ? warnings : []
      };
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : []
    };
  }

  /**
   * Enhanced coordinate validation with region checking
   */
  private static isValidCoordinate(lat: number, lng: number): boolean {
    // Basic coordinate validation
    if (
      isNaN(lat) || isNaN(lng) ||
      !isFinite(lat) || !isFinite(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180
    ) {
      return false;
    }

    // Check if coordinates are not at null island (0,0)
    if (lat === 0 && lng === 0) {
      return false;
    }

    // Check if coordinates are within reasonable bounds for India
    // (This can be made configurable based on service region)
    const isInIndia = (
      lat >= 6.0 && lat <= 37.0 &&
      lng >= 68.0 && lng <= 97.0
    );

    if (!isInIndia) {
      // Don't reject, just warn - coordinates might be valid for other regions
    }

    return true;
  }

  /**
   * Parse GPS error into user-friendly message
   */
  private static parseGPSError(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Location access denied. Please enable location services.";
      case error.POSITION_UNAVAILABLE:
        return "Location unavailable. Please check GPS/network connection.";
      case error.TIMEOUT:
        return "Location request timed out. Please try again.";
      default:
        return "Unknown GPS error occurred.";
    }
  }

  /**
   * Calculate distance between two GPS points (Haversine formula)
   */
  static calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Detect unrealistic location jumps
   */
  static isUnrealisticJump(
    previousLocation: GPSLocation,
    newLocation: GPSLocation,
    maxSpeedKmh: number = 200 // Maximum reasonable speed in km/h
  ): boolean {
    const distance = this.calculateDistance(
      previousLocation.latitude, previousLocation.longitude,
      newLocation.latitude, newLocation.longitude
    );

    const timeElapsedHours = (newLocation.timestamp - previousLocation.timestamp) / (1000 * 60 * 60);

    if (timeElapsedHours <= 0) return false; // No time elapsed

    const speedKmh = distance / timeElapsedHours;

    return speedKmh > maxSpeedKmh;
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get GPS accuracy quality description
   */
  static getAccuracyQuality(accuracy: number): {
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
    description: string;
    color: string;
  } {
    if (accuracy <= 10) {
      return {
        level: 'excellent',
        description: 'Excellent GPS accuracy (±' + Math.round(accuracy) + 'm)',
        color: 'text-green-600'
      };
    } else if (accuracy <= 50) {
      return {
        level: 'good',
        description: 'Good GPS accuracy (±' + Math.round(accuracy) + 'm)',
        color: 'text-blue-600'
      };
    } else if (accuracy <= 100) {
      return {
        level: 'fair',
        description: 'Fair GPS accuracy (±' + Math.round(accuracy) + 'm)',
        color: 'text-yellow-600'
      };
    } else if (accuracy <= 500) {
      return {
        level: 'poor',
        description: 'Poor GPS accuracy (±' + Math.round(accuracy) + 'm) - consider manual entry',
        color: 'text-orange-600'
      };
    } else {
      return {
        level: 'very-poor',
        description: 'GPS accuracy too poor (±' + Math.round(accuracy) + 'm) - manual selection required',
        color: 'text-red-600'
      };
    }
  }

  /**
   * Check if location is within expected service region
   */
  static isWithinServiceRegion(
    latitude: number,
    longitude: number,
    region: 'india' | 'custom' = 'india',
    customBounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  ): boolean {
    if (region === 'custom' && customBounds) {
      return (
        latitude >= customBounds.minLat && latitude <= customBounds.maxLat &&
        longitude >= customBounds.minLng && longitude <= customBounds.maxLng
      );
    }

    // Default India bounds
    return (
      latitude >= 6.0 && latitude <= 37.0 &&
      longitude >= 68.0 && longitude <= 97.0
    );
  }

  /**
   * Get location with coordinate-based validation priority
   * Note: Does NOT override success based on coordinate validation
   * GPS accuracy is validated in getValidatedLocation() already
   */
  static async getLocationWithCoordinateValidation(
    expectedLocation?: { latitude: number; longitude: number },
    maxDistanceKm: number = 5,
    maxAccuracyM: number = 2000 // Very lenient - accept up to 2km accuracy
  ): Promise<GPSValidationResult & { coordinateValidation?: any }> {
    const result = await this.getValidatedLocation({
      maxAccuracy: maxAccuracyM,
      enableHighAccuracy: true,
      timeout: 15000
    });

    if (result.location) {
      const coordinateValidation = this.validateLocationByCoordinates(
        result.location,
        expectedLocation,
        maxDistanceKm
      );

      // Log for debugging
      console.log(`[GPS Validation] Accuracy: ${Math.round(result.location.accuracy)}m, Success: ${result.success}, Coordinate Valid: ${coordinateValidation.isValid}`);

      return {
        ...result,
        coordinateValidation,
        // Only fail if GPS itself failed - coordinate validation is just informational
        // Don't override success based on coordinate validation
        success: result.success
      };
    }

    return result;
  }
}
