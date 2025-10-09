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
      console.log('GPS single attempt starting...');
      
      const location = await this.attemptGPSCapture(finalConfig, 1);
      
      // Check if this location meets our accuracy requirements
      console.log(`GPS Validation Check: accuracy=${location.accuracy}m, maxAccuracy=${finalConfig.maxAccuracy}m`);
      
      if (location.accuracy <= finalConfig.maxAccuracy) {
        console.log(`✅ GPS ACCEPTED: ±${location.accuracy}m (threshold: ${finalConfig.maxAccuracy}m)`);
        
        return {
          success: true,
          location,
          attemptsMade: 1
        };
      } else {
        console.log(`❌ GPS REJECTED: ±${location.accuracy}m exceeds threshold of ${finalConfig.maxAccuracy}m`);
        
        return {
          success: false,
          location,
          error: `GPS accuracy insufficient: ±${Math.round(location.accuracy)}m (requires ≤${finalConfig.maxAccuracy}m)`,
          requiresManualSelection: true,
          attemptsMade: 1
        };
      }
    } catch (error: any) {
      console.log('GPS attempt failed:', error.message);
      
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
      // Progressive timeout increase for better accuracy
      const adjustedTimeout = config.timeout + (attemptNumber - 1) * 5000;
      
      const options: PositionOptions = {
        // Enhanced GPS settings for field service
        enableHighAccuracy: true, // Always use high accuracy
        timeout: adjustedTimeout,
        maximumAge: 0 // Always get fresh location
      };
        
      // Add additional GPS options for mobile devices
      if ('permissions' in navigator) {
        // Request precise location permission on supported browsers
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
          if (result.state === 'granted') {
            console.log('High accuracy GPS permission granted');
          }
        }).catch(err => {
          console.warn('Could not check GPS permissions:', err);
        });
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          
          console.log(`GPS captured: ${location.latitude}, ${location.longitude} (±${location.accuracy}m)`);
          
          // Enhanced coordinate validation
          const validation = this.validateLocationByCoordinates(location);
          if (!validation.isValid) {
            reject(new Error(`Invalid GPS coordinates: ${validation.warnings.join(', ')}`));
            return;
          }
          
          resolve(location);
        },
        (error) => {
          console.error(`GPS attempt ${attemptNumber} failed:`, error);
          reject(error);
        },
        options
      );
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
      console.warn(`Coordinates ${lat}, ${lng} appear to be outside India`);
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
    
    console.log(`Location jump check: ${distance.toFixed(2)}km in ${timeElapsedHours.toFixed(2)}h = ${speedKmh.toFixed(2)}km/h`);
    
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
   */
  static async getLocationWithCoordinateValidation(
    expectedLocation?: { latitude: number; longitude: number },
    maxDistanceKm: number = 5,
    maxAccuracyM: number = 100
  ): Promise<GPSValidationResult & { coordinateValidation?: any }> {
    const result = await this.getValidatedLocation({
      maxAccuracy: maxAccuracyM,
      enableHighAccuracy: true,
      timeout: 15000
    });
    
    if (result.success && result.location) {
      const coordinateValidation = this.validateLocationByCoordinates(
        result.location,
        expectedLocation,
        maxDistanceKm
      );
      
      return {
        ...result,
        coordinateValidation,
        // Override success based on coordinate validation
        success: result.success && coordinateValidation.isValid
      };
    }
    
    return result;
  }
}
