"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Target
} from 'lucide-react';
import { useEnhancedLocation, LocationData } from '@/hooks/useEnhancedLocation';
import SimpleAddressEntry from '@/components/location/SimpleAddressEntry';
import { cn } from '@/lib/utils';

interface EnhancedLocationCaptureProps {
  onLocationCapture: (location: LocationData) => void;
  previousLocation?: LocationData;
  required?: boolean;
  className?: string;
  autoCapture?: boolean;
  enableJumpDetection?: boolean;
}

const EnhancedLocationCapture: React.FC<EnhancedLocationCaptureProps> = ({
  onLocationCapture,
  previousLocation,
  required = true,
  className,
  autoCapture = false,
  enableJumpDetection = true
}) => {
  const { toast } = useToast();
  
  const {
    isLoading,
    isManualAddressOpen,
    currentLocation,
    error,
    lastAttempt,
    gpsRetryCount,
    captureGPSLocation,
    handleManualAddressSelect,
    openManualAddress,
    closeManualAddress,
    resetLocation,
    getLocationQuality,
    hasValidLocation,
    isGPSLocation,
    isManualLocation,
    locationQuality
  } = useEnhancedLocation({
    maxAccuracy: 100, // Reduced to 100m for better coordinate validation
    maxRetries: 3, // 3 GPS attempts before manual entry
    timeout: 15000,
    autoCapture,
    enableJumpDetection,
    previousLocation
  });

  // Debug logging for GPS capture attempts
  React.useEffect(() => {
    if (lastAttempt && lastAttempt.location) {
      console.log(`EnhancedLocationCapture: Last attempt accuracy=${lastAttempt.location.accuracy}m, success=${lastAttempt.success}`);
      console.log(`EnhancedLocationCapture: GPS retry count=${gpsRetryCount}`);
      
      // Show warning if present
      if (lastAttempt.success && lastAttempt.warning) {
        toast({
          title: "GPS Accuracy Notice",
          description: lastAttempt.warning,
          variant: "default",
        });
      }
    }
  }, [lastAttempt, gpsRetryCount]);

  // Handle location capture success - use ref to prevent infinite loops
  const lastNotifiedLocationRef = React.useRef<LocationData | null>(null);
  
  React.useEffect(() => {
    if (currentLocation && currentLocation !== lastNotifiedLocationRef.current) {
      lastNotifiedLocationRef.current = currentLocation;
      onLocationCapture(currentLocation);
    }
  }, [currentLocation, onLocationCapture]);

  const handleCaptureClick = async () => {
    await captureGPSLocation();
  };

  const handleRetry = () => {
    resetLocation();
    captureGPSLocation();
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
    
    if (hasValidLocation) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    
    if (error) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    
    return <MapPin className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (isLoading) {
      return gpsRetryCount > 0
        ? `Attempting GPS capture (${gpsRetryCount}/5)...`
        : 'Capturing location...';
    }
    
    if (hasValidLocation) {
      return isManualLocation ? 'Manual location set' : 'GPS location captured';
    }
    
    if (error) {
      return error;
    }
    
    return required ? 'Location required' : 'Location not captured';
  };

  const getLocationDisplay = () => {
    if (!currentLocation) return null;

    const quality = getLocationQuality(currentLocation);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Location Details</span>
          <Badge 
            variant={isManualLocation ? "default" : "secondary"}
            className={cn(
              "text-xs",
              isManualLocation && "bg-blue-100 text-blue-800",
              isGPSLocation && quality.level === 'excellent' && "bg-green-100 text-green-800",
              isGPSLocation && quality.level === 'good' && "bg-blue-100 text-blue-800",
              isGPSLocation && quality.level === 'fair' && "bg-yellow-100 text-yellow-800",
              isGPSLocation && quality.level === 'poor' && "bg-orange-100 text-orange-800"
            )}
          >
            {isManualLocation ? (
              <>
                <Navigation className="h-3 w-3 mr-1" />
                Manual
              </>
            ) : (
              <>
                <Target className="h-3 w-3 mr-1" />
                GPS ±{Math.round(currentLocation.accuracy)}m
              </>
            )}
          </Badge>
        </div>
        
        <div className="text-sm text-gray-600">
          {currentLocation.address || `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`}
        </div>
        
        <div className="flex gap-4 text-xs text-gray-500">
          <span>Lat: {currentLocation.latitude.toFixed(6)}</span>
          <span>Lng: {currentLocation.longitude.toFixed(6)}</span>
          <span>{new Date(currentLocation.timestamp).toLocaleTimeString()}</span>
        </div>
        
        {locationQuality && (
          <div className={cn("text-xs", locationQuality.color)}>
            {locationQuality.description}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Status Card */}
      <Card className={cn(
        "border-2 transition-colors",
        hasValidLocation && "border-green-200 bg-green-50",
        error && "border-red-200 bg-red-50",
        isLoading && "border-blue-200 bg-blue-50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">
                Location Capture {required && <span className="text-red-500">*</span>}
              </span>
            </div>
            
            {!isLoading && !hasValidLocation && (
              <Button
                size="sm"
                onClick={handleCaptureClick}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Target className="h-4 w-4 mr-1" />
                Capture GPS
              </Button>
            )}
            
            {hasValidLocation && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
          
          <div className="text-sm text-gray-600 mb-2">
            {getStatusText()}
          </div>
          
          {getLocationDisplay()}
          
          {/* GPS Accuracy Info */}
          {lastAttempt && !lastAttempt.success && lastAttempt.location && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <div className="font-medium text-yellow-800">GPS Available but Inaccurate</div>
              <div className="text-yellow-700">
                Best GPS: ±{Math.round(lastAttempt.location.accuracy)}m (requires ≤100m)
              </div>
            </div>
          )}
          
          {/* Manual Selection Option */}
          {(error || (lastAttempt && lastAttempt.requiresManualSelection)) && !isLoading && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={openManualAddress}
                className="w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Select Location Manually
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simple Address Entry */}
      <SimpleAddressEntry
        isOpen={isManualAddressOpen}
        onClose={closeManualAddress}
        onLocationSelect={handleManualAddressSelect}
        title="📍 Enter Your Location"
        description="GPS signal is weak after multiple attempts. Please type your current address."
        gpsRetryCount={gpsRetryCount}
      />
    </div>
  );
};

export default EnhancedLocationCapture;
