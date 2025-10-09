'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Play,
  Pause,
  Navigation,
  MapPin,
  Wrench,
  Coffee,
  Home
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';

type ServicePersonStatusOption = {
  value: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
  requiresLocation?: boolean;
  requiresComment?: boolean;
  activityType?: string;
  activityTitle?: string;
};

type LocationData = {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: string;
};

interface ServicePersonStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  ticketId: number;
  ticketTitle: string;
  onStatusChange: (newStatus: string, comment?: string, location?: LocationData, activityData?: any) => Promise<void>;
}

// Service person specific status options with activity integration
const SERVICE_PERSON_STATUS_OPTIONS: ServicePersonStatusOption[] = [
  {
    value: 'IN_PROGRESS',
    label: 'Start Working',
    shortLabel: 'Start Work',
    description: 'Begin working on this ticket',
    icon: <Play className="h-4 w-4" />,
    activityType: 'TICKET_WORK',
    activityTitle: 'Started working on ticket'
  },
  {
    value: 'ONSITE_VISIT_STARTED',
    label: 'Travel to Site',
    shortLabel: 'Travel',
    description: 'Start traveling to customer location',
    icon: <Navigation className="h-4 w-4" />,
    requiresLocation: true,
    activityType: 'TRAVEL',
    activityTitle: 'Traveling to customer site'
  },
  {
    value: 'ONSITE_VISIT_REACHED',
    label: 'Arrived at Site',
    shortLabel: 'Arrived',
    description: 'Mark arrival at customer location',
    icon: <MapPin className="h-4 w-4" />,
    requiresLocation: true,
    activityType: 'ONSITE_VISIT',
    activityTitle: 'Arrived at customer site'
  },
  {
    value: 'ONSITE_VISIT_IN_PROGRESS',
    label: 'Working Onsite',
    shortLabel: 'Onsite Work',
    description: 'Currently working at customer location',
    icon: <Wrench className="h-4 w-4" />,
    requiresLocation: true,
    activityType: 'TICKET_WORK',
    activityTitle: 'Working onsite at customer location'
  },
  {
    value: 'ONSITE_VISIT_RESOLVED',
    label: 'Work Completed',
    shortLabel: 'Completed',
    description: 'Finished work at customer location',
    icon: <CheckCircle className="h-4 w-4" />,
    requiresLocation: true,
    requiresComment: true,
    activityType: 'TICKET_WORK',
    activityTitle: 'Completed work at customer location'
  },
  {
    value: 'RESOLVED',
    label: 'Resolve Ticket',
    shortLabel: 'Resolve',
    description: 'Mark ticket as fully resolved',
    icon: <CheckCircle className="h-4 w-4" />,
    requiresComment: true,
    activityType: 'TICKET_WORK',
    activityTitle: 'Resolved ticket'
  },
  {
    value: 'ASSIGNED',
    label: 'Pause Work',
    shortLabel: 'Pause',
    description: 'Temporarily pause work on this ticket',
    icon: <Pause className="h-4 w-4" />,
    activityType: 'BREAK',
    activityTitle: 'Paused work on ticket'
  },
  {
    value: 'WAITING_CUSTOMER',
    label: 'Wait for Customer',
    shortLabel: 'Waiting',
    description: 'Waiting for customer response or action',
    icon: <Clock className="h-4 w-4" />,
    requiresComment: true,
    activityType: 'TICKET_WORK',
    activityTitle: 'Waiting for customer response'
  }
];

export function ServicePersonStatusDialog({
  isOpen,
  onClose,
  currentStatus,
  ticketId,
  ticketTitle,
  onStatusChange
}: ServicePersonStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get available status options based on current status
  const availableOptions = useMemo(() => {
    const statusFlow: Record<string, string[]> = {
      'ASSIGNED': ['IN_PROGRESS', 'ONSITE_VISIT_STARTED', 'WAITING_CUSTOMER'],
      'IN_PROGRESS': ['ONSITE_VISIT_STARTED', 'ONSITE_VISIT_RESOLVED', 'RESOLVED', 'ASSIGNED', 'WAITING_CUSTOMER'],
      'ONSITE_VISIT_STARTED': ['ONSITE_VISIT_REACHED', 'ASSIGNED'],
      'ONSITE_VISIT_REACHED': ['ONSITE_VISIT_IN_PROGRESS', 'ASSIGNED'],
      'ONSITE_VISIT_IN_PROGRESS': ['ONSITE_VISIT_RESOLVED', 'ASSIGNED'],
      'ONSITE_VISIT_RESOLVED': ['RESOLVED', 'ASSIGNED'],
      'WAITING_CUSTOMER': ['IN_PROGRESS', 'ONSITE_VISIT_STARTED', 'RESOLVED', 'ASSIGNED']
    };

    const allowedStatuses = statusFlow[currentStatus] || [];
    return SERVICE_PERSON_STATUS_OPTIONS.filter(option => 
      allowedStatuses.includes(option.value)
    );
  }, [currentStatus]);

  const selectedOption = SERVICE_PERSON_STATUS_OPTIONS.find(opt => opt.value === selectedStatus);

  // Get current location when location is required
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000, // Increased to match backend timeout
          maximumAge: 60000 // Allow 1 minute cache for faster location
        });
      });
      
      console.log('ServicePersonStatusDialog GPS Accuracy:', position.coords.accuracy, 'meters');
      
      const { latitude, longitude } = position.coords;
      
      // Validate GPS accuracy (warn if > 100m, but still proceed)
      let accuracyWarning = '';
      if (position.coords.accuracy > 100) {
        accuracyWarning = ` (Low accuracy: ${Math.round(position.coords.accuracy)}m)`;
        console.warn('ServicePersonStatusDialog: GPS accuracy is poor:', position.coords.accuracy, 'meters');
      }
      
      // Try to get address from coordinates using backend geocoding service
      let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}${accuracyWarning}`;
      let geocodingSuccess = false;
      
      try {
        console.log('ServicePersonStatusDialog: Calling backend geocoding service...');
        const response = await apiClient.get(`/geocoding/reverse?latitude=${latitude}&longitude=${longitude}`);
        
        console.log('ServicePersonStatusDialog: Backend response:', response.data);
        
        // Fixed: Check the correct response structure
        if (response.data?.success && response.data?.data?.address) {
          const backendAddress = response.data.data.address;
          // Only use backend address if it's not just coordinates
          if (backendAddress && !backendAddress.match(/^\d+\.\d+,\s*\d+\.\d+/)) {
            address = backendAddress + accuracyWarning;
            geocodingSuccess = true;
            console.log('ServicePersonStatusDialog: Backend geocoding successful:', address);
          } else {
            console.log('ServicePersonStatusDialog: Backend returned coordinates, keeping original format');
          }
        } else {
          console.log('ServicePersonStatusDialog: Backend geocoding returned no valid address');
          console.log('Response structure:', response.data);
        }
      } catch (geocodeError: any) {
        console.log('ServicePersonStatusDialog: Backend geocoding failed:', geocodeError.message || geocodeError);
        // Keep the coordinates format as fallback
      }
        
      setCurrentLocation({
        lat: latitude,
        lng: longitude,
        address
      });
      
      // If geocoding failed, show a subtle warning but don't block the workflow
      if (!geocodingSuccess && position.coords.accuracy <= 100) {
        console.log('ServicePersonStatusDialog: Using coordinates as address due to geocoding failure');
      }
      
    } catch (error: any) {
      console.log('ServicePersonStatusDialog: First location attempt failed, trying with lower accuracy...');
      
      // Retry with lower accuracy settings for better compatibility
      try {
        const fallbackPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, // Lower accuracy for better compatibility
            timeout: 15000, // Slightly longer for fallback
            maximumAge: 300000 // Allow 5 minute cache for fallback
          });
        });
        
        console.log('ServicePersonStatusDialog: Fallback GPS successful, accuracy:', fallbackPosition.coords.accuracy, 'meters');
        
        const { latitude, longitude } = fallbackPosition.coords;
        let accuracyWarning = '';
        if (fallbackPosition.coords.accuracy > 100) {
          accuracyWarning = ` (Low accuracy: ${Math.round(fallbackPosition.coords.accuracy)}m)`;
        }
        
        let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}${accuracyWarning}`;
        
        // Try geocoding for fallback location too
        try {
          const response = await apiClient.get(`/geocoding/reverse?latitude=${latitude}&longitude=${longitude}`);
          if (response.data?.success && response.data?.data?.address) {
            const backendAddress = response.data.data.address;
            if (backendAddress && !backendAddress.match(/^\d+\.\d+,\s*\d+\.\d+/)) {
              address = backendAddress + accuracyWarning;
            }
          }
        } catch (geocodeError) {
          console.log('ServicePersonStatusDialog: Fallback geocoding failed, using coordinates');
        }
        
        setCurrentLocation({
          lat: latitude,
          lng: longitude,
          address
        });
      } catch (fallbackError: any) {
        const errorMessage = fallbackError.code === 1 
          ? 'Location access denied. Please enable location services and try again.'
          : fallbackError.code === 2 
          ? 'Location unavailable. Please check your GPS/network connection.'
          : fallbackError.code === 3 
          ? 'Location request timed out. Please try again.'
          : fallbackError.message || 'Failed to get location';
          
        setLocationError(errorMessage);
        console.error('ServicePersonStatusDialog: Both location attempts failed:', fallbackError);
      }
    } finally {
      setLocationLoading(false);
    }
  };

  // Auto-get location when status requiring location is selected
  useEffect(() => {
    if (selectedOption?.requiresLocation && !currentLocation && !locationLoading) {
      console.log('ServicePersonStatusDialog: Auto-getting location for status:', selectedStatus);
      getCurrentLocation();
    }
  }, [selectedStatus, selectedOption?.requiresLocation]);

  // Also auto-get location when dialog opens for any onsite-related status
  useEffect(() => {
    if (isOpen && !currentLocation && !locationLoading) {
      // Auto-get location for common onsite statuses
      const onsiteStatuses = ['ONSITE_VISIT_STARTED', 'ONSITE_VISIT_REACHED', 'ONSITE_VISIT_IN_PROGRESS', 'ONSITE_VISIT_RESOLVED'];
      if (onsiteStatuses.includes(currentStatus) || selectedStatus.includes('ONSITE')) {
        console.log('ServicePersonStatusDialog: Auto-getting location for onsite status on dialog open');
        getCurrentLocation();
      }
    }
  }, [isOpen, currentStatus, selectedStatus]);

  const handleStatusChange = async () => {
    if (!selectedStatus) return;

    // Validate required fields
    if (selectedOption?.requiresComment && !comments.trim()) {
      alert('Please add a comment for this status change.');
      return;
    }

    if (selectedOption?.requiresLocation && !currentLocation) {
      alert('Location is required for this action. Please allow location access.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare location data
      const locationData: LocationData | undefined = selectedOption?.requiresLocation && currentLocation
        ? {
            latitude: currentLocation.lat,
            longitude: currentLocation.lng,
            address: currentLocation.address,
            timestamp: new Date().toISOString()
          }
        : undefined;

      // Prepare activity data
      const activityData = selectedOption?.activityType ? {
        activityType: selectedOption.activityType,
        title: selectedOption.activityTitle || `${selectedOption.label} - ${ticketTitle}`,
        ticketId,
        location: locationData ? {
          latitude: locationData.latitude,
          longitude: locationData.longitude
        } : undefined,
        metadata: {
          action: selectedOption.value,
          previousStatus: currentStatus,
          newStatus: selectedStatus,
          ticketTitle
        }
      } : undefined;

      // Call the status change handler with activity data
      await onStatusChange(selectedStatus, comments || undefined, locationData, activityData);
      
      // Reset form and close dialog
      setSelectedStatus('');
      setComments('');
      setCurrentLocation(null);
      setLocationError(null);
      onClose();

    } catch (error) {
      console.error('Error changing status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus('');
    setComments('');
    setCurrentLocation(null);
    setLocationError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Update Work Status
          </DialogTitle>
          <DialogDescription>
            Update the status of your work on: <strong>{ticketTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Current Status:</span>
            <StatusBadge status={currentStatus} />
          </div>

          {/* Status Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Choose Next Action</Label>
            <div className="grid grid-cols-1 gap-2">
              {availableOptions.map((option) => (
                <Card 
                  key={option.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedStatus === option.value 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedStatus(option.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-gray-100">
                          {option.icon}
                        </div>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {option.requiresLocation && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            Location
                          </Badge>
                        )}
                        {option.requiresComment && (
                          <Badge variant="outline" className="text-xs">
                            Comment Required
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <StatusBadge status={option.value} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Location Status */}
          {selectedOption?.requiresLocation && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Location Status</Label>
              {locationLoading ? (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Getting your location...
                </div>
              ) : currentLocation ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Location captured
                  </div>
                  <div className="text-xs text-gray-600 pl-6">
                    {currentLocation.address}
                  </div>
                  {currentLocation.address?.includes('Low accuracy') && (
                    <div className="text-xs text-amber-600 pl-6 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      GPS accuracy is limited. Consider moving to an open area for better precision.
                    </div>
                  )}
                </div>
              ) : locationError ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4" />
                    {locationError}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={getCurrentLocation}
                    disabled={locationLoading}
                  >
                    Retry Location
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments" className="text-sm font-medium">
              Comments {selectedOption?.requiresComment && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="comments"
              placeholder={
                selectedOption?.requiresComment 
                  ? "Please provide details about this status change..."
                  : "Optional: Add any additional notes..."
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusChange} 
              disabled={!selectedStatus || isSubmitting || (selectedOption?.requiresLocation && !currentLocation)}
            >
              {isSubmitting ? 'Updating...' : `Update to ${selectedOption?.shortLabel || 'Status'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
