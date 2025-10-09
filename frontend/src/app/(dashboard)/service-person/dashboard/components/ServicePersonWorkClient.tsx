'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { apiClient } from '@/lib/api/api-client';
import CheckInOutWidget from './CheckInOutWidget';
import ActivitySelection from './ActivitySelection';
import TicketWorkDashboard from './TicketWorkDashboard';
import StageManagement from './StageManagement';
import LocationService from '@/services/LocationService';

// Types
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Attendance {
  isCheckedIn: boolean;
  status: string;
  checkInAt?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface Activity {
  id: number;
  activityType: string;
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  ticketId?: number;
  ticket?: {
    id: number;
    title: string;
    status: string;
  };
  ActivityStage?: Array<{
    id: number;
    stage: string;
    startTime: string;
    endTime?: string;
    location?: string;
  }>;
}

interface Ticket {
  id: number;
  title: string;
  status: string;
  priority: string;
  customer: {
    companyName: string;
  };
  asset: {
    machineId: string;
    model?: string;
  };
  createdAt: string;
  slaDueAt?: string;
}

interface ServicePersonWorkData {
  user: User;
  attendance: Attendance;
  activities: Activity[];
  tickets: Ticket[];
}

// Workflow states
type WorkflowState = 
  | 'CHECK_IN_REQUIRED'
  | 'ACTIVITY_SELECTION' 
  | 'TICKET_DASHBOARD'     // For TICKET_WORK
  | 'STAGE_MANAGEMENT'     // For other activities
  | 'WORK_FROM_HOME'       // Special case
  | 'CHECK_OUT_AVAILABLE';

// Activity types from schema
const ACTIVITY_TYPES = [
  'TICKET_WORK',
  'BD_VISIT', 
  'PO_DISCUSSION',
  'SPARE_REPLACEMENT',
  'TRAVEL',
  'TRAINING',
  'MEETING',
  'MAINTENANCE',
  'DOCUMENTATION',
  'OTHER',
  'WORK_FROM_HOME',
  'INSTALLATION',
  'MAINTENANCE_PLANNED',
  'REVIEW_MEETING',
  'RELOCATION'
];

interface Props {
  initialData: ServicePersonWorkData;
}

export default function ServicePersonWorkClient({ initialData }: Props) {
  // Hooks
  const { toast } = useToast();
  
  // State management
  const [user] = useState<User>(initialData.user);
  const [attendance, setAttendance] = useState<Attendance>(initialData.attendance);
  const [activities, setActivities] = useState<Activity[]>(initialData.activities);
  const [tickets, setTickets] = useState<Ticket[]>(initialData.tickets);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number; longitude: number; address?: string} | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  
  // Derived state
  const currentActivity = activities.find(activity => !activity.endTime);
  const isCheckedIn = attendance.isCheckedIn;
  
  // Determine current workflow state
  const getWorkflowState = (): WorkflowState => {
    if (!isCheckedIn) return 'CHECK_IN_REQUIRED';
    if (!currentActivity) return 'ACTIVITY_SELECTION';
    
    switch (currentActivity.activityType) {
      case 'TICKET_WORK':
        return 'TICKET_DASHBOARD';
      case 'WORK_FROM_HOME':
        return 'WORK_FROM_HOME';
      default:
        return 'STAGE_MANAGEMENT';
    }
  };

  const workflowState = getWorkflowState();

  // Location management
  const getCurrentLocation = useCallback(async () => {
    setIsLocationLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();
      const address = await LocationService.reverseGeocode(location.latitude, location.longitude);
      // Ensure address is a string to match the state type
      const addressString = typeof address === 'object' ? address.address : address;
      const locationData = { ...location, address: addressString };
      setCurrentLocation(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Location Error",
        description: "Failed to get location. Please enable GPS.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  // Initialize location on mount
  useEffect(() => {
    if (isCheckedIn) {
      getCurrentLocation().catch(console.error);
    }
  }, [isCheckedIn, getCurrentLocation]);

  // Data refresh functions
  const refreshAttendance = async () => {
    try {
      const response = await apiClient.get('/attendance/status');
      setAttendance(response.data);
    } catch (error) {
      console.error('Error refreshing attendance:', error);
    }
  };

  const refreshActivities = async () => {
    try {
      const response = await apiClient.get('/activities?limit=10');
      setActivities(response.data?.activities || []);
    } catch (error) {
      console.error('Error refreshing activities:', error);
    }
  };

  const refreshTickets = async () => {
    try {
      const response = await apiClient.get('/tickets?filter=assigned-to-service-person&limit=20');
      setTickets(response.data?.tickets || []);
    } catch (error) {
      console.error('Error refreshing tickets:', error);
    }
  };

  // Check-in/Check-out handlers
  const handleCheckIn = async () => {
    try {
      const location = await getCurrentLocation();
      
      const response = await apiClient.post('/attendance/checkin', {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });

      if (response.data) {
        setAttendance(response.data);
        toast({
          title: "Success",
          description: "Checked in successfully!"
        });
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast({
        title: "Check-in Error",
        description: "Failed to check in. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      const location = await getCurrentLocation();
      
      const response = await apiClient.post('/attendance/checkout', {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      });

      if (response.data) {
        setAttendance(response.data);
        toast({
          title: "Success",
          description: "Checked out successfully!"
        });
      }
    } catch (error) {
      console.error('Check-out error:', error);
      toast({
        title: "Check-out Error",
        description: "Failed to check out. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Activity management handlers
  const handleStartActivity = async (activityType: string) => {
    try {
      let location = null;
      
      // Get location for all activities except WORK_FROM_HOME
      if (activityType !== 'WORK_FROM_HOME') {
        location = await getCurrentLocation();
      }

      const activityData = {
        activityType,
        title: `${activityType.replace('_', ' ')} Activity`,
        startTime: new Date().toISOString(),
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude,
          location: location.address,
        }),
      };

      const response = await apiClient.post('/activities', activityData);
      
      if (response.data) {
        await refreshActivities();
        toast({
          title: "Activity Started",
          description: `${activityType.replace('_', ' ')} activity started!`
        });
      }
    } catch (error) {
      console.error('Error starting activity:', error);
      toast({
        title: "Activity Error",
        description: "Failed to start activity. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEndActivity = async (activityId: number) => {
    try {
      const location = await getCurrentLocation();
      
      const response = await apiClient.put(`/activities/${activityId}`, {
        endTime: new Date().toISOString(),
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude,
          location: location.address,
        }),
      });

      if (response.data) {
        await refreshActivities();
        toast({
          title: "Activity Ended",
          description: "Activity ended successfully!"
        });
      }
    } catch (error) {
      console.error('Error ending activity:', error);
      toast({
        title: "Activity Error",
        description: "Failed to end activity. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Render workflow interface based on current state
  const renderWorkflowInterface = () => {
    switch (workflowState) {
      case 'CHECK_IN_REQUIRED':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Check-in Required</h2>
              <p className="text-gray-600">You must check in with your location before starting work.</p>
            </div>
            <button
              onClick={handleCheckIn}
              disabled={isLocationLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg disabled:opacity-50"
            >
              {isLocationLoading ? 'Getting Location...' : 'Check In'}
            </button>
          </div>
        );

      case 'ACTIVITY_SELECTION':
        return (
          <ActivitySelection
            activityTypes={ACTIVITY_TYPES}
            onStartActivity={handleStartActivity}
            isLocationLoading={isLocationLoading}
          />
        );

      case 'TICKET_DASHBOARD':
        return (
          <TicketWorkDashboard
            tickets={tickets}
            currentActivity={currentActivity!}
            onEndActivity={handleEndActivity}
            onRefreshTickets={refreshTickets}
            getCurrentLocation={getCurrentLocation}
          />
        );

      case 'STAGE_MANAGEMENT':
        return (
          <StageManagement
            activity={currentActivity!}
            onEndActivity={handleEndActivity}
            getCurrentLocation={getCurrentLocation}
          />
        );

      case 'WORK_FROM_HOME':
        return (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Work From Home Active</h3>
              <p className="text-green-700">You are currently working from home. No location tracking required.</p>
            </div>
            <button
              onClick={() => handleEndActivity(currentActivity!.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              End Work From Home
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Check-in/Check-out Status */}
      <CheckInOutWidget
        attendance={attendance}
        currentLocation={currentLocation}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        isLocationLoading={isLocationLoading}
        canCheckOut={!currentActivity}
      />

      {/* Main Content */}
      <main className="pb-6">
        {renderWorkflowInterface()}
      </main>

      {/* Current Activity Status (if any) */}
      {currentActivity && (
        <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{currentActivity.activityType.replace('_', ' ')}</p>
              <p className="text-sm text-gray-600">Started: {new Date(currentActivity.startTime).toLocaleTimeString()}</p>
            </div>
            <button
              onClick={() => handleEndActivity(currentActivity.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              End Activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
