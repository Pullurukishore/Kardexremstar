// Location Service for GPS tracking and geocoding
export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: Date;
  isAccurate?: boolean;
  accuracyLevel?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface LocationResult {
  location: GPSLocation;
  address: string;
  source: 'backend' | 'frontend' | 'coordinates';
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  retryAttempts?: number;
  accuracyThreshold?: number; // Maximum acceptable accuracy in meters
  requireAccuracy?: boolean; // Whether to reject poor accuracy locations
}

class LocationService {
  private lastKnownLocation: GPSLocation | null = null;
  private watchId: number | null = null;

  /**
   * Get current GPS location with enhanced accuracy and validation
   */
  async getCurrentLocation(options: LocationOptions = {}): Promise<GPSLocation> {
    const {
      enableHighAccuracy = true,
      timeout = 15000, // Reduced timeout for faster response
      maximumAge = 0, // No cache by default for fresh location
      retryAttempts = 3,
      accuracyThreshold = 50, // Stricter 50m threshold for better accuracy
      requireAccuracy = false // Don't require accuracy by default
    } = options;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        console.log(`LocationService: Getting location (attempt ${attempt}/${retryAttempts})...`);
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy,
              timeout,
              maximumAge
            }
          );
        });

        const location: GPSLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
          isAccurate: this.isLocationAccurate({ 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude, 
            accuracy: position.coords.accuracy 
          }, accuracyThreshold),
          accuracyLevel: this.getAccuracyLevel(position.coords.accuracy || 999999)
        };

        console.log(`LocationService: Location obtained with accuracy: ±${Math.round(location.accuracy || 0)}m (${location.accuracyLevel})`);
        
        // Check if accuracy meets requirements
        if (requireAccuracy && !location.isAccurate) {
          console.warn(`LocationService: Accuracy ±${Math.round(location.accuracy || 0)}m exceeds threshold of ${accuracyThreshold}m`);
          if (attempt < retryAttempts) {
            console.log(`LocationService: Retrying for better accuracy...`);
            continue; // Try again for better accuracy
          } else {
            throw new Error(`GPS accuracy too poor: ±${Math.round(location.accuracy || 0)}m. Required: ±${accuracyThreshold}m or better.`);
          }
        }
        
        // Provide accuracy feedback
        if (location.accuracy && location.accuracy > 100) {
          console.warn(`LocationService: Poor GPS accuracy: ±${Math.round(location.accuracy)}m`);
        } else if (location.accuracy && location.accuracy <= 10) {
          console.log(`LocationService: Excellent GPS accuracy: ±${Math.round(location.accuracy)}m`);
        }

        // Cache the location
        this.lastKnownLocation = location;
        
        return location;
      } catch (error) {
        console.warn(`LocationService: Location attempt ${attempt} failed:`, error);
        
        if (attempt === retryAttempts) {
          throw new Error(`Failed to get location after ${retryAttempts} attempts: ${error}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }

    throw new Error('Failed to get location');
  }

  /**
   * Watch location changes (for continuous tracking)
   */
  watchLocation(callback: (location: GPSLocation) => void): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      };

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          };
          
          this.lastKnownLocation = location;
          callback(location);
        },
        (error) => {
          console.error('Location watch error:', error);
        },
        options
      );

      resolve(this.watchId);
    });
  }

  /**
   * Stop watching location
   */
  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Get last known location (cached)
   */
  getLastKnownLocation(): GPSLocation | null {
    return this.lastKnownLocation;
  }

  /**
   * Enhanced reverse geocoding with multiple fallback strategies
   * 1. Backend geocoding service (LocationIQ API)
   * 2. Frontend geocoding (browser's built-in service)
   * 3. Coordinates as final fallback
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{ address: string; source: 'backend' | 'frontend' | 'coordinates' }> {
    // Try backend geocoding first
    try {
      // Import apiClient dynamically to avoid circular dependencies
      const { apiClient } = await import('@/lib/api/api-client');
      
      console.log('LocationService: Calling backend geocoding service...');
      const response = await apiClient.get(`/geocoding/reverse?latitude=${latitude}&longitude=${longitude}`);
      
      if (response.data?.success && response.data?.data?.address) {
        console.log('LocationService: Backend geocoding successful:', response.data.data.address);
        return { address: response.data.data.address, source: 'backend' };
      }
    } catch (error) {
      console.warn('LocationService: Backend geocoding failed:', error);
    }

    // Try frontend geocoding as fallback
    try {
      console.log('LocationService: Trying frontend geocoding fallback...');
      const address = await this.frontendReverseGeocode(latitude, longitude);
      if (address && address !== `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`) {
        console.log('LocationService: Frontend geocoding successful:', address);
        return { address, source: 'frontend' };
      }
    } catch (error) {
      console.warn('LocationService: Frontend geocoding failed:', error);
    }

    // Final fallback to coordinates
    console.log('LocationService: Using coordinates as final fallback');
    return { 
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, 
      source: 'coordinates' 
    };
  }

  /**
   * Frontend geocoding using browser's built-in reverse geocoding
   * Note: This requires HTTPS and may not work in all browsers
   */
  private async frontendReverseGeocode(latitude: number, longitude: number): Promise<string> {
    // Check if we're in a secure context (required for some geocoding APIs)
    if (!window.isSecureContext) {
      throw new Error('Frontend geocoding requires HTTPS');
    }

    // Try using the Nominatim API (OpenStreetMap) as frontend fallback
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'KardexCare/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.display_name) {
        return data.display_name;
      }
      
      // Try to format address from components
      if (data && data.address) {
        const components = [
          data.address.house_number,
          data.address.road,
          data.address.neighbourhood,
          data.address.suburb,
          data.address.village || data.address.town || data.address.city,
          data.address.state,
          data.address.postcode,
          data.address.country
        ].filter(Boolean);
        
        if (components.length > 0) {
          return components.join(', ');
        }
      }
      
      throw new Error('No address found in response');
    } catch (error) {
      console.warn('Frontend geocoding with Nominatim failed:', error);
      throw error;
    }
  }

  /**
   * Get location with address - combines GPS and geocoding
   */
  async getLocationWithAddress(options: LocationOptions = {}): Promise<LocationResult> {
    const location = await this.getCurrentLocation(options);
    const geocodeResult = await this.reverseGeocode(location.latitude, location.longitude);
    
    return {
      location,
      address: geocodeResult.address,
      source: geocodeResult.source
    };
  }

  /**
   * Calculate distance between two points (in meters)
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  /**
   * Check if location permissions are granted
   */
  async checkLocationPermission(): Promise<PermissionState> {
    if (!navigator.permissions) {
      return 'prompt'; // Assume prompt if permissions API not available
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch (error) {
      console.error('Permission check error:', error);
      return 'prompt';
    }
  }

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const location = await this.getCurrentLocation();
      return !!location;
    } catch (error) {
      console.error('Location permission request failed:', error);
      return false;
    }
  }

  /**
   * Format location for display
   */
  formatLocation(location: GPSLocation): string {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  /**
   * Check if location is accurate enough based on threshold
   */
  isLocationAccurate(location: GPSLocation, threshold: number = 100): boolean {
    return !location.accuracy || location.accuracy <= threshold;
  }

  /**
   * Get accuracy level description
   */
  getAccuracyLevel(accuracy: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (accuracy <= 10) return 'excellent';
    if (accuracy <= 50) return 'good';
    if (accuracy <= 100) return 'fair';
    return 'poor';
  }

  /**
   * Get accuracy feedback message for users
   */
  getAccuracyFeedback(accuracy: number): { message: string; severity: 'success' | 'warning' | 'error' } {
    if (accuracy <= 10) {
      return {
        message: `Excellent GPS accuracy (±${Math.round(accuracy)}m). Perfect for location tracking.`,
        severity: 'success'
      };
    }
    if (accuracy <= 30) {
      return {
        message: `Good GPS accuracy (±${Math.round(accuracy)}m). Suitable for location tracking.`,
        severity: 'success'
      };
    }
    if (accuracy <= 100) {
      return {
        message: `Fair GPS accuracy (±${Math.round(accuracy)}m). Location may be less precise.`,
        severity: 'warning'
      };
    }
    if (accuracy <= 500) {
      return {
        message: `Poor GPS accuracy (±${Math.round(accuracy)}m). Please move to an open area for better signal.`,
        severity: 'error'
      };
    }
    return {
      message: `Very poor GPS accuracy (±${Math.round(accuracy)}m). Location may be off by several blocks. Move outdoors with clear sky view.`,
      severity: 'error'
    };
  }
}

// Export singleton instance
export default new LocationService();
