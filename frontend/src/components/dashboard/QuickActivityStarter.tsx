'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Play,
  Clock,
  MapPin,
  Zap,
  Plus,
  Timer,
  Activity
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';

const QUICK_ACTIVITIES = [
  {
    type: 'TICKET_WORK',
    label: 'Ticket Work',
    icon: '🎫',
    color: 'bg-blue-100 text-blue-800',
    description: 'Start working on a ticket'
  },
  {
    type: 'TRAVEL',
    label: 'Travel',
    icon: '🚗',
    color: 'bg-green-100 text-green-800',
    description: 'Traveling to location'
  },
  {
    type: 'MAINTENANCE',
    label: 'Maintenance',
    icon: '🔧',
    color: 'bg-orange-100 text-orange-800',
    description: 'Equipment maintenance'
  },
  {
    type: 'DOCUMENTATION',
    label: 'Documentation',
    icon: '📝',
    color: 'bg-purple-100 text-purple-800',
    description: 'Documentation work'
  },
  {
    type: 'TRAINING',
    label: 'Training',
    icon: '📚',
    color: 'bg-indigo-100 text-indigo-800',
    description: 'Training or learning'
  },
  {
    type: 'OTHER',
    label: 'Other',
    icon: '📋',
    color: 'bg-gray-100 text-gray-800',
    description: 'Other activities'
  }
];

interface QuickActivityStarterProps {
  onActivityStarted?: () => void;
}

export default function QuickActivityStarter({ onActivityStarted }: QuickActivityStarterProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const startQuickActivity = async (activityType: string, label: string) => {
    setLoading(activityType);
    try {
      // Get current location if available
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 3000,
              enableHighAccuracy: false
            });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: `${position.coords.latitude}, ${position.coords.longitude}`
          };
        } catch (error) {
          console.warn('Could not get location:', error);
        }
      }

      const response = await apiClient.post('/activities', {
        activityType,
        title: `${label} - ${new Date().toLocaleTimeString()}`,
        description: `Quick started ${label.toLowerCase()} activity`,
        startTime: new Date().toISOString(),
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude,
          location: location.address
        })
      });

      toast({
        title: "Activity Started",
        description: `${label} activity has been started successfully`,
      });

      if (onActivityStarted) {
        onActivityStarted();
      }

    } catch (error) {
      console.error('Error starting activity:', error);
      toast({
        title: "Error",
        description: "Failed to start activity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          Quick Start Activity
        </CardTitle>
        <CardDescription>
          Quickly start common activities with one click
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIVITIES.map((activity) => (
            <Button
              key={activity.type}
              variant="outline"
              className="h-auto p-3 flex flex-col items-center gap-2 hover:shadow-md transition-all"
              onClick={() => startQuickActivity(activity.type, activity.label)}
              disabled={loading === activity.type}
            >
              {loading === activity.type ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{activity.icon}</span>
                  <Play className="h-4 w-4 text-green-600" />
                </div>
              )}
              <div className="text-center">
                <div className="font-medium text-sm">{activity.label}</div>
                <div className="text-xs text-gray-500 mt-1">{activity.description}</div>
              </div>
            </Button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-800 text-sm">
            <Timer className="h-4 w-4" />
            <span className="font-medium">Pro Tip:</span>
          </div>
          <p className="text-blue-700 text-xs mt-1">
            Activities automatically capture your location and can be managed in the Work Management Center above.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
