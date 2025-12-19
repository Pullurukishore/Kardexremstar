'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  MapPin, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Navigation,
  X,
  Loader2,
  Camera
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import EnhancedLocationCapture from '@/components/activity/EnhancedLocationCapture';
import { LocationData } from '@/hooks/useEnhancedLocation';
import PhotoCapture, { CapturedPhoto } from '@/components/photo/PhotoCapture';

interface Ticket {
  id: number;
  title: string;
  status: string;
  priority: string;
  customer?: {
    companyName: string;
  };
  asset?: {
    serialNumber: string;
    model: string;
  };
}

interface TicketStatusDialogWithLocationProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: () => void;
  accuracyThreshold?: number; // Default 50m for ticket status changes
}

// Status options for service persons with location requirements
const STATUS_OPTIONS = [
  {
    key: 'start_work',
    label: 'Start Work',
    status: 'IN_PROGRESS',
    icon: '🔧',
    description: 'Begin working on this ticket',
    requiresLocation: false,
    requiresComment: false,
    requiresPhoto: false,
    color: 'bg-blue-100 text-blue-800'
  },
  {
    key: 'travel_to_site',
    label: 'Travel to Site',
    status: 'ONSITE_VISIT_STARTED',
    icon: '🚗',
    description: 'Traveling to customer location',
    requiresLocation: true,
    requiresComment: false,
    requiresPhoto: false,
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    key: 'arrived_onsite',
    label: 'Arrived at Site',
    status: 'ONSITE_VISIT_REACHED',
    icon: '📍',
    description: 'Reached customer location',
    requiresLocation: true,
    requiresComment: false,
    requiresPhoto: true,
    color: 'bg-orange-100 text-orange-800'
  },
  {
    key: 'working_onsite',
    label: 'Working Onsite',
    status: 'ONSITE_VISIT_IN_PROGRESS',
    icon: '🔨',
    description: 'Currently working at customer site',
    requiresLocation: true,
    requiresComment: false,
    requiresPhoto: false,
    color: 'bg-purple-100 text-purple-800'
  },
  {
    key: 'complete_work',
    label: 'Complete Work',
    status: 'ONSITE_VISIT_RESOLVED',
    icon: '✅',
    description: 'Work completed at customer site',
    requiresLocation: true,
    requiresComment: true,
    requiresPhoto: false,
    color: 'bg-green-100 text-green-800'
  },
  {
    key: 'resolve_ticket',
    label: 'Resolve Ticket',
    status: 'RESOLVED',
    icon: '🎯',
    description: 'Mark ticket as fully resolved',
    requiresLocation: false,
    requiresComment: true,
    requiresPhoto: false,
    color: 'bg-green-100 text-green-800'
  },
  {
    key: 'pause_work',
    label: 'Pause Work',
    status: 'ASSIGNED',
    icon: '⏸️',
    description: 'Temporarily pause work on this ticket',
    requiresLocation: false,
    requiresComment: false,
    requiresPhoto: false,
    color: 'bg-gray-100 text-gray-800'
  },
  {
    key: 'wait_customer',
    label: 'Waiting for Customer',
    status: 'WAITING_CUSTOMER',
    icon: '⏳',
    description: 'Waiting for customer response or availability',
    requiresLocation: false,
    requiresComment: true,
    requiresPhoto: false,
    color: 'bg-amber-100 text-amber-800'
  }
];

export function TicketStatusDialogWithLocation({
  ticket,
  isOpen,
  onClose,
  onStatusUpdate,
  accuracyThreshold = 50
}: TicketStatusDialogWithLocationProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showLocationCapture, setShowLocationCapture] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState<LocationData | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const { toast } = useToast();

  const selectedOption = STATUS_OPTIONS.find(opt => opt.key === selectedStatus);

  const handleStatusSelect = (statusKey: string) => {
    const option = STATUS_OPTIONS.find(opt => opt.key === statusKey);
    setSelectedStatus(statusKey);
    
    // If location is required and not captured, show location capture
    if (option?.requiresLocation && !capturedLocation) {
      setShowLocationCapture(true);
    }
  };

  const handleLocationCapture = (location: LocationData) => {
    setCapturedLocation(location);
    setShowLocationCapture(false);
    
    toast({
      title: 'Location Captured',
      description: `Location accuracy: ±${Math.round(location.accuracy || 0)}m`,
    });
  };

  const handleLocationError = (error: string) => {
    toast({
      title: 'Location Error',
      description: error,
      variant: 'destructive',
    });
  };

  const handlePhotoCapture = (photos: CapturedPhoto[]) => {
    setCapturedPhotos(photos);
  };

  // Check if status requires photo capture
  const requiresPhoto = (statusKey: string): boolean => {
    const option = STATUS_OPTIONS.find(opt => opt.key === statusKey);
    return option?.requiresPhoto || false;
  };

  const handleSubmit = async () => {
    if (!ticket || !selectedOption) return;

    // Validate required fields
    if (selectedOption.requiresComment && !comment.trim()) {
      toast({
        title: 'Comment Required',
        description: 'Please add a comment for this status change.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedOption.requiresLocation && !capturedLocation) {
      setShowLocationCapture(true);
      return;
    }

    // Check if photo is required but not captured
    if (selectedOption.requiresPhoto && capturedPhotos.length === 0) {
      toast({
        title: 'Photo Required',
        description: 'Photo verification is required for this status change. Please take at least one photo.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);

    try {
      const requestData: any = {
        status: selectedOption.status,
        comments: comment.trim() || undefined
      };

      // Add location data if available
      if (capturedLocation) {
        requestData.location = {
          latitude: capturedLocation.latitude,
          longitude: capturedLocation.longitude,
          address: capturedLocation.address,
          accuracy: capturedLocation.accuracy,
          timestamp: new Date(capturedLocation.timestamp).toISOString(),
          source: capturedLocation.source || 'gps'
        };
      }

      // Add photo data if available
      if (capturedPhotos.length > 0) {
        requestData.photos = {
          photos: capturedPhotos,
          timestamp: new Date().toISOString()
        };
      }

      const response = await apiClient.patch(`/tickets/${ticket.id}/status`, requestData);

      if (response.data) {
        toast({
          title: 'Status Updated',
          description: `Ticket status changed to ${selectedOption.label}`,
        });

        // Reset form
        setSelectedStatus(null);
        setComment('');
        setCapturedLocation(null);
        setCapturedPhotos([]);
        
        // Close dialog first
        onClose();
        
        // Then notify parent to refresh data
        await onStatusUpdate();
      }
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.response?.data?.message || 'Failed to update ticket status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus(null);
    setComment('');
    setCapturedLocation(null);
    setCapturedPhotos([]);
    setShowLocationCapture(false);
    onClose();
  };

  if (!ticket) return null;

  return (
    <>
      {/* Location Capture Modal */}
      {showLocationCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Location Required for {selectedOption?.label}
                </h2>
                <button
                  onClick={() => setShowLocationCapture(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                This status change requires your location to track field service activities.
              </p>
              <EnhancedLocationCapture
                onLocationCapture={handleLocationCapture}
                required={true}
                enableJumpDetection={true}
                className=""
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Status Dialog */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>Update Ticket Status</span>
              <Badge variant="outline" className="ml-2">
                #{ticket.id}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Ticket Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">{ticket.title}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Customer:</span> {ticket.customer?.companyName || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Asset:</span> {ticket.asset?.model || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Current Status:</span> 
                  <Badge variant="outline" className="ml-1">{ticket.status}</Badge>
                </div>
                <div>
                  <span className="font-medium">Priority:</span> 
                  <Badge variant="outline" className="ml-1">{ticket.priority}</Badge>
                </div>
              </div>
            </div>

            {/* Status Options */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Select New Status</h4>
              <div className="grid grid-cols-2 gap-3">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleStatusSelect(option.key)}
                    className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                      selectedStatus === option.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{option.icon}</span>
                      <span className="font-medium text-sm">{option.label}</span>
                      {option.requiresLocation && (
                        <MapPin className="h-3 w-3 text-blue-500" />
                      )}
                      {option.requiresPhoto && (
                        <Camera className="h-3 w-3 text-purple-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600">{option.description}</p>
                      {option.requiresLocation && (
                        <p className="text-xs text-blue-600 mt-1">📍 Location required</p>
                      )}
                      {option.requiresPhoto && (
                        <p className="text-xs text-purple-600 mt-1">📷 Photo required</p>
                      )}
                      {option.requiresComment && (
                        <p className="text-xs text-orange-600 mt-1">💬 Comment required</p>
                      )}
                  </button>
                ))}
              </div>
            </div>
            {capturedLocation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Location Captured</span>
                </div>
                <p className="text-xs text-green-700 truncate">{capturedLocation.address}</p>
                <p className="text-xs text-green-600">
                  Accuracy: ±{Math.round(capturedLocation.accuracy || 0)}m
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCapturedLocation(null);
                    setShowLocationCapture(true);
                  }}
                  className="mt-2 text-xs h-7"
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Change Location
                </Button>
              </div>
            )}

            {/* Photo Capture Section */}
            {selectedOption && selectedOption.requiresPhoto && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Verification Photos <span className="text-red-500">*</span>
                </label>
                <PhotoCapture
                  onPhotoCapture={handlePhotoCapture}
                  maxPhotos={1}
                  required={true}
                  label="Onsite Verification Photos"
                  description="Take photos to verify your presence at the customer location"
                  className=""
                />
              </div>
            )}

            {/* Comment Section */}
            {selectedOption && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Comment {selectedOption.requiresComment && <span className="text-red-500">*</span>}
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`Add a comment about ${selectedOption.label.toLowerCase()}...`}
                  rows={3}
                  className="w-full"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedStatus || isUpdating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Update Status
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TicketStatusDialogWithLocation;
