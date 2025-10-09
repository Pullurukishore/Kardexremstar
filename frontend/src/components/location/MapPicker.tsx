'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Navigation, Loader2, X } from 'lucide-react';
import { GPSLocation } from '@/services/LocationService';

interface MapPickerProps {
  onLocationSelect: (latitude: number, longitude: number) => void;
  initialLocation?: GPSLocation | null;
  className?: string;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

const MapPicker: React.FC<MapPickerProps> = ({ 
  onLocationSelect, 
  initialLocation, 
  className = '' 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.latitude, lng: initialLocation.longitude } : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      if (typeof window === 'undefined') return;

      try {
        console.log('MapPicker: Starting to load Leaflet...');
        
        // Load Leaflet CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);
          console.log('MapPicker: Leaflet CSS loaded');
        }

        // Load Leaflet JS
        if (!(window as any).L) {
          console.log('MapPicker: Loading Leaflet JS...');
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
            script.crossOrigin = '';
            script.onload = () => {
              console.log('MapPicker: Leaflet JS loaded successfully');
              resolve(true);
            };
            script.onerror = (error) => {
              console.error('MapPicker: Failed to load Leaflet JS:', error);
              reject(error);
            };
            document.head.appendChild(script);
          });
        }

        // Wait a bit for Leaflet to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('MapPicker: Leaflet ready, setting map loaded to true');
        setIsMapLoaded(true);
      } catch (error) {
        console.error('MapPicker: Failed to load Leaflet:', error);
        // Set a timeout to show fallback after 10 seconds
        setTimeout(() => {
          console.log('MapPicker: Timeout reached, showing fallback');
          setIsMapLoaded(true);
        }, 10000);
      }
    };

    loadLeaflet();
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      console.log('MapPicker: Geolocation not supported');
      return;
    }

    setIsGettingLocation(true);
    try {
      console.log('MapPicker: Getting current location...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      console.log('MapPicker: Current location obtained:', location);
      setCurrentLocation(location);
      
      // If no initial location was provided, use current location as default
      if (!initialLocation && !selectedLocation) {
        setSelectedLocation(location);
        handleLocationSelect(location.lat, location.lng, 'Current GPS Location');
      }

    } catch (error) {
      console.error('MapPicker: Failed to get current location:', error);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Get current location on component mount
  useEffect(() => {
    if (!initialLocation) {
      getCurrentLocation();
    }
  }, [initialLocation]);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) {
      console.error('MapPicker: Leaflet not available after loading');
      return;
    }

    // Default center - priority: initialLocation > currentLocation > selectedLocation > Bangalore
    const defaultLat = initialLocation?.latitude || 
                      currentLocation?.lat || 
                      selectedLocation?.lat || 
                      12.9716;
    const defaultLng = initialLocation?.longitude || 
                      currentLocation?.lng || 
                      selectedLocation?.lng || 
                      77.5946;

    // Create map
    const map = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom marker icon
    const customIcon = L.divIcon({
      html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: 'custom-marker'
    });

    // Add initial marker if location exists
    if (selectedLocation) {
      markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], { 
        icon: customIcon,
        draggable: true 
      }).addTo(map);

      // Handle marker drag
      markerRef.current.on('dragend', (e: any) => {
        const position = e.target.getLatLng();
        handleLocationSelect(position.lat, position.lng, 'Marker Drag');
      });
    }

    // Handle map clicks
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      handleLocationSelect(lat, lng, 'Map Click');
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isMapLoaded, initialLocation, currentLocation, selectedLocation]);

  const handleLocationSelect = (lat: number, lng: number, source?: string) => {
    try {
      console.log(`MapPicker: Attempting to select location - ${source || 'Unknown'}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      
      const L = (window as any).L;
      if (!L) {
        console.error('MapPicker: Leaflet not available for location selection');
        // Still call onLocationSelect even if map update fails
        setSelectedLocation({ lat, lng });
        onLocationSelect(lat, lng);
        return;
      }

      if (!mapInstanceRef.current) {
        console.error('MapPicker: Map instance not available for location selection');
        // Still call onLocationSelect even if map update fails
        setSelectedLocation({ lat, lng });
        onLocationSelect(lat, lng);
        return;
      }

      setSelectedLocation({ lat, lng });
      onLocationSelect(lat, lng);
      
      console.log(`MapPicker: Location selected successfully - ${source || 'Unknown'}: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

      // Update or create marker
      const customIcon = L.divIcon({
        html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: 'custom-marker'
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        console.log('MapPicker: Updated existing marker position');
      } else {
        markerRef.current = L.marker([lat, lng], { 
          icon: customIcon,
          draggable: true 
        }).addTo(mapInstanceRef.current);

        // Handle marker drag
        markerRef.current.on('dragend', (e: any) => {
          const position = e.target.getLatLng();
          handleLocationSelect(position.lat, position.lng, 'Marker Drag');
        });
        console.log('MapPicker: Created new marker');
      }

      // Center map on selected location
      mapInstanceRef.current.setView([lat, lng], Math.max(mapInstanceRef.current.getZoom(), 15));
      console.log('MapPicker: Centered map on selected location');

    } catch (error) {
      console.error('MapPicker: Error in handleLocationSelect:', error);
      // Still try to call onLocationSelect to not break the flow
      try {
        setSelectedLocation({ lat, lng });
        onLocationSelect(lat, lng);
        console.log('MapPicker: Location selection completed despite map error');
      } catch (fallbackError) {
        console.error('MapPicker: Critical error in location selection:', fallbackError);
      }
    }
  };

  const searchAddress = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'KardexCare/1.0'
          }
        }
      );

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Address search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    console.log('MapPicker: Search result selected:', { lat, lng, display_name: result.display_name });
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      console.error('MapPicker: Invalid coordinates from search result:', { lat, lng, result });
      return;
    }
    
    handleLocationSelect(lat, lng, 'Address Search');
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchAddress(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Search Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for an address or place..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isSearching && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            </div>
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowResults(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <>
            {/* Backdrop to prevent map interaction while searching */}
            <div 
              className="fixed inset-0 z-[9998] bg-black bg-opacity-10"
              onClick={() => setShowResults(false)}
            />
            <div className="absolute z-[9999] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSearchResultSelect(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.display_name}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-64 sm:h-80 bg-gray-100"
          style={{ minHeight: '320px' }}
        />
        
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading interactive map...</p>
              <p className="text-xs text-gray-500 mt-2">This may take a few seconds</p>
              {isGettingLocation && (
                <p className="text-xs text-blue-600 mt-1">📍 Getting your location...</p>
              )}
            </div>
          </div>
        )}

        {/* Fallback UI if map fails to load */}
        {isMapLoaded && !(window as any).L && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">🗺️</div>
              <p className="text-sm text-gray-700 mb-4">Interactive map unavailable</p>
              <p className="text-xs text-gray-500 mb-4">
                Please use the search bar above or quick location buttons below
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLocationSelect(12.9716, 77.5946, 'Bangalore Fallback')}
                  className="px-3 py-2 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                >
                  📍 Bangalore
                </button>
                <button
                  onClick={() => handleLocationSelect(19.0760, 72.8777, 'Mumbai Fallback')}
                  className="px-3 py-2 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
                >
                  📍 Mumbai
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Map Instructions */}
        {isMapLoaded && (
          <div className="absolute top-2 left-2 right-2 z-[1000] pointer-events-none">
            <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 shadow-sm">
              <p className="text-xs text-gray-700 text-center font-medium">
                🗺️ Click anywhere on the map or drag the marker to set your location
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="p-4 bg-green-50 border-t border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Selected Location</span>
          </div>
          <p className="text-xs font-mono text-green-700">
            📍 {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </p>
          <button
            onClick={() => {
              if (selectedLocation) {
                onLocationSelect(selectedLocation.lat, selectedLocation.lng);
              }
            }}
            className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
          >
            <Navigation className="h-3 w-3 inline mr-1" />
            Use This Location
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap gap-2">
          {/* Current Location Button */}
          <button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                Getting Location...
              </>
            ) : (
              <>📍 My Location</>
            )}
          </button>
          
          {/* Current GPS if available */}
          {currentLocation && (
            <button
              onClick={() => handleLocationSelect(currentLocation.lat, currentLocation.lng, 'Current GPS')}
              className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors"
            >
              📍 Use Current GPS
            </button>
          )}
          
          {/* Initial Location if provided */}
          {initialLocation && (
            <button
              onClick={() => handleLocationSelect(initialLocation.latitude, initialLocation.longitude, 'Initial Location')}
              className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200 transition-colors"
            >
              📍 Initial Location
            </button>
          )}
          
          {/* City Quick Buttons */}
          <button
            onClick={() => {
              console.log('MapPicker: Bangalore button clicked');
              handleLocationSelect(12.9716, 77.5946, 'Bangalore');
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
          >
            📍 Bangalore
          </button>
          <button
            onClick={() => {
              console.log('MapPicker: Mumbai button clicked');
              handleLocationSelect(19.0760, 72.8777, 'Mumbai');
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
          >
            📍 Mumbai
          </button>
          <button
            onClick={() => {
              console.log('MapPicker: Delhi button clicked');
              handleLocationSelect(28.6139, 77.2090, 'Delhi');
            }}
            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
          >
            📍 Delhi
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapPicker;
