import axios from 'axios';
import { logger } from '../utils/logger';
import { LocationValidationService } from './location-validation.service';

export type ReverseGeocodeResult = {
  address: string | null;
  source?: 'locationiq' | 'fallback';
  error?: string;
  coordinateValidation?: {
    isValid: boolean;
    distanceFromExpected?: number;
    warnings?: string[];
  };
};

export interface GeocodeOptions {
  boundingBox?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  expectedRegion?: {
    city?: string;
    state?: string;
    country?: string;
  };
  maxDistanceFromExpected?: number; // in kilometers
  expectedCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

export class GeocodingService {
  private static readonly API_KEY = process.env.LOCATIONIQ_KEY || ''; // ✅ use .env
  private static readonly BASE_URL = 'https://us1.locationiq.com/v1/reverse.php';
  
  // Default bounding box for India (can be overridden per request)
  private static readonly DEFAULT_INDIA_BOUNDS = {
    minLat: 6.0,
    maxLat: 37.0,
    minLng: 68.0,
    maxLng: 97.0
  };
  
  // Major Indian cities for region validation
  private static readonly MAJOR_CITIES = {
    'mumbai': { lat: 19.0760, lng: 72.8777, radius: 50 },
    'delhi': { lat: 28.7041, lng: 77.1025, radius: 50 },
    'bangalore': { lat: 12.9716, lng: 77.5946, radius: 40 },
    'hyderabad': { lat: 17.3850, lng: 78.4867, radius: 40 },
    'chennai': { lat: 13.0827, lng: 80.2707, radius: 40 },
    'kolkata': { lat: 22.5726, lng: 88.3639, radius: 40 },
    'pune': { lat: 18.5204, lng: 73.8567, radius: 30 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714, radius: 30 }
  };
  

  static async reverseGeocode(
    latitude: number, 
    longitude: number, 
    options: GeocodeOptions = {}
  ): Promise<ReverseGeocodeResult> {
    try {
      if (!this.API_KEY) {
        const errorMsg = 'Missing LocationIQ API key. Please set LOCATIONIQ_KEY in .env';
        logger.error(errorMsg);
        return { 
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, 
          source: 'fallback',
          error: errorMsg
        };
      }

      logger.info(`Attempting reverse geocoding for coordinates: ${latitude}, ${longitude}`);

      // Apply bounding box if provided or use India default
      const boundingBox = options.boundingBox || this.DEFAULT_INDIA_BOUNDS;
      
      const params: any = {
        key: this.API_KEY,
        lat: latitude,
        lon: longitude,
        format: 'json',
        'accept-language': 'en',
        addressdetails: 1,
        zoom: 18,
        // Apply bounding box to restrict results to expected region
        viewbox: `${boundingBox.minLng},${boundingBox.maxLat},${boundingBox.maxLng},${boundingBox.minLat}`,
        bounded: 1 // Restrict results to viewbox
      };
      
      // Add country filter if specified
      if (options.expectedRegion?.country) {
        params.countrycodes = options.expectedRegion.country.toLowerCase();
      }

      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'KardexCare/1.0 (support@kardexcare.local)',
      };

      const { data } = await axios.get(this.BASE_URL, { 
        params, 
        headers, 
        timeout: 15000, // Increased timeout
      });

      logger.info('LocationIQ API response received:', { hasData: !!data, displayName: data?.display_name });

      const address = this.formatAddress(data);
      
      // Validate the returned address coordinates against expected location
      const coordinateValidation = this.validateAddressCoordinates(
        latitude, 
        longitude, 
        data, 
        options
      );
      
      if (address && address !== `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`) {
        logger.info(`Reverse geocoding successful: ${address}`, {
          coordinateValidation,
          inputCoords: `${latitude}, ${longitude}`,
          returnedCoords: data.lat && data.lon ? `${data.lat}, ${data.lon}` : 'N/A'
        });
        
        return { 
          address, 
          source: 'locationiq',
          coordinateValidation
        };
      } else {
        logger.warn('LocationIQ returned no valid address, using coordinates');
        return { 
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, 
          source: 'fallback',
          error: 'No valid address found in LocationIQ response',
          coordinateValidation
        };
      }
    } catch (error: any) {
      logger.error('Reverse geocoding error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        coordinates: `${latitude}, ${longitude}`
      });
      
      let errorMessage = 'Unknown geocoding error';
      if (error.code === 'ENOTFOUND') {
        errorMessage = 'Network error: Unable to reach LocationIQ service';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid LocationIQ API key';
      } else if (error.response?.status === 429) {
        errorMessage = 'LocationIQ API rate limit exceeded';
      } else if (error.response?.status >= 500) {
        errorMessage = 'LocationIQ service temporarily unavailable';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout - LocationIQ service too slow';
      }
      
      return { 
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, 
        source: 'fallback',
        error: errorMessage,
        coordinateValidation: {
          isValid: false,
          warnings: ['Geocoding service unavailable - using coordinates only']
        }
      };
    }
  }

  private static formatAddress(data: any): string | null {
    if (!data) {
      logger.warn('No data provided to formatAddress');
      return null;
    }
    
    // Try display_name first (most complete address)
    if (data.display_name && typeof data.display_name === 'string') {
      logger.info('Using display_name for address');
      return data.display_name;
    }
    
    // Try to build address from components
    const { address } = data;
    if (address && typeof address === 'object') {
      const components = [
        address.house_number,
        address.road,
        address.neighbourhood,
        address.suburb,
        address.village || address.town || address.city,
        address.state,
        address.postcode,
        address.country,
      ].filter(component => component && typeof component === 'string');

      if (components.length > 0) {
        const formattedAddress = components.join(', ');
        logger.info(`Built address from components: ${formattedAddress}`);
        return formattedAddress;
      }
    }
    
    logger.warn('Unable to format address from data:', data);
    return null;
  }

  /**
   * Validate that the returned address coordinates match the input coordinates
   * This prevents wrong addresses from being displayed due to geocoding ambiguity
   */
  private static validateAddressCoordinates(
    inputLat: number,
    inputLng: number,
    geocodeData: any,
    options: GeocodeOptions
  ): { isValid: boolean; distanceFromExpected?: number; warnings?: string[] } {
    const warnings: string[] = [];
    
    // Check if geocoding service returned coordinates
    if (!geocodeData.lat || !geocodeData.lon) {
      warnings.push('Geocoding service did not return coordinates');
      return { isValid: false, warnings };
    }
    
    const returnedLat = parseFloat(geocodeData.lat);
    const returnedLng = parseFloat(geocodeData.lon);
    
    // Calculate distance between input and returned coordinates
    const distance = LocationValidationService.calculateDistance(
      inputLat,
      inputLng,
      returnedLat,
      returnedLng
    );
    
    // Use coordinate-based validation instead of address names
    const maxAllowedDistance = options.maxDistanceFromExpected || 5; // 5km default
    
    if (distance > maxAllowedDistance) {
      warnings.push(
        `Address coordinates are ${distance.toFixed(2)}km away from GPS location (max: ${maxAllowedDistance}km)`
      );
      
      // Check if this might be a name collision (same place name in different regions)
      if (distance > 50) {
        warnings.push(
          'Large coordinate difference suggests possible place name collision - using GPS coordinates for validation'
        );
      }
      
      return {
        isValid: false,
        distanceFromExpected: distance,
        warnings
      };
    }
    
    // Additional validation: Check if returned coordinates are within expected region
    if (options.expectedRegion) {
      const regionValidation = this.validateRegion(returnedLat, returnedLng, options.expectedRegion);
      if (!regionValidation.isValid) {
        warnings.push(...regionValidation.warnings);
      }
    }
    
    return {
      isValid: distance <= maxAllowedDistance,
      distanceFromExpected: distance,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate coordinates are within expected region
   */
  private static validateRegion(
    lat: number,
    lng: number,
    expectedRegion: { city?: string; state?: string; country?: string }
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check if coordinates are within major city bounds
    if (expectedRegion.city) {
      const cityKey = expectedRegion.city.toLowerCase();
      const cityInfo = this.MAJOR_CITIES[cityKey as keyof typeof this.MAJOR_CITIES];
      
      if (cityInfo) {
        const distanceFromCity = LocationValidationService.calculateDistance(
          lat,
          lng,
          cityInfo.lat,
          cityInfo.lng
        );
        
        if (distanceFromCity > cityInfo.radius) {
          warnings.push(
            `Location is ${distanceFromCity.toFixed(1)}km from ${expectedRegion.city} center (expected within ${cityInfo.radius}km)`
          );
          return { isValid: false, warnings };
        }
      }
    }
    
    return { isValid: true, warnings };
  }

  /**
   * Enhanced reverse geocoding with region-aware validation
   */
  static async reverseGeocodeWithValidation(
    latitude: number,
    longitude: number,
    expectedCity?: string,
    maxDistanceKm: number = 5
  ): Promise<ReverseGeocodeResult> {
    const options: GeocodeOptions = {
      maxDistanceFromExpected: maxDistanceKm,
      expectedCoordinates: { latitude, longitude }
    };
    
    // Set city-specific options if provided
    if (expectedCity) {
      const cityKey = expectedCity.toLowerCase();
      const cityInfo = this.MAJOR_CITIES[cityKey as keyof typeof this.MAJOR_CITIES];
      
      if (cityInfo) {
        // Create bounding box around the expected city
        const buffer = 0.5; // degrees (~55km)
        options.boundingBox = {
          minLat: cityInfo.lat - buffer,
          maxLat: cityInfo.lat + buffer,
          minLng: cityInfo.lng - buffer,
          maxLng: cityInfo.lng + buffer
        };
        
        options.expectedRegion = {
          city: expectedCity,
          country: 'in' // India
        };
      }
    }
    
    return this.reverseGeocode(latitude, longitude, options);
  }
}
