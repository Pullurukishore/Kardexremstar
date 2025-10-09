"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

export interface SimpleLocationData {
  latitude: number;
  longitude: number;
  address: string;
  accuracy: number;
  timestamp: number;
  source: 'manual_address';
}

interface SimpleAddressEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: SimpleLocationData) => void;
  title?: string;
  description?: string;
  gpsRetryCount?: number;
}

const SimpleAddressEntry: React.FC<SimpleAddressEntryProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  title = "📍 Enter Your Location",
  description = "GPS signal is weak. Please type your current address.",
  gpsRetryCount = 0
}) => {
  const [address, setAddress] = useState<string>('');
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!address.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter your current address.",
        variant: "destructive",
      });
      return;
    }

    // Create location data with approximate coordinates
    // In production, you might geocode the address, but for simplicity we'll use default coordinates
    const locationData: SimpleLocationData = {
      latitude: 12.9716, // Default to Bangalore center
      longitude: 77.5946,
      address: address.trim(),
      accuracy: 50, // Manual address gets reasonable accuracy
      timestamp: Date.now(),
      source: 'manual_address'
    };

    onLocationSelect(locationData);
    onClose();
    
    toast({
      title: "Address Confirmed",
      description: "Your location has been set successfully.",
    });
  };

  const handleClose = () => {
    setAddress('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* GPS Retry Info */}
          {gpsRetryCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">GPS Signal Issues</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Tried GPS {gpsRetryCount} times. Please enter your address manually.
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-blue-800 text-sm font-medium mb-2">
              ✍️ Quick & Simple
            </div>
            <div className="text-blue-700 text-sm space-y-1">
              <div>• Type your current address below</div>
              <div>• Include building/office name if applicable</div>
              <div>• Click confirm to complete</div>
            </div>
          </div>

          {/* Address Input */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">
              📍 Your Current Address
            </Label>
            <Input
              id="address"
              placeholder="e.g., ABC Office, 123 MG Road, Bangalore"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleConfirm()}
              className="text-sm"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Be as specific as possible for better records
            </p>
          </div>

          {/* Preview */}
          {address.trim() && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-green-800 text-sm">✅ Address Ready</div>
                  <div className="text-sm text-green-700 mt-1">
                    {address}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      Manual Address
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-gray-500">
              {address.trim() ? '✅ Ready to proceed' : '📝 Please enter your address'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} size="sm">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={!address.trim()}
                className={`${address.trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400'} text-white font-medium`}
                size="sm"
              >
                {address.trim() ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Address
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Enter Address First
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleAddressEntry;
