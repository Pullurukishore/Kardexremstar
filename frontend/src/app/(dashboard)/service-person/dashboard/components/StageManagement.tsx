'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  Play, 
  MapPin, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Flag,
  Settings,
  FileText,
  Users,
  Wrench,
  Target
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';

interface Activity {
  id: number;
  activityType: string;
  title: string;
  startTime: string;
  ActivityStage?: Array<{
    id: number;
    stage: string;
    startTime: string;
    endTime?: string;
    location?: string;
  }>;
}

interface Props {
  activity: Activity;
  onEndActivity: (activityId: number) => void;
  getCurrentLocation: () => Promise<{latitude: number; longitude: number; address?: string}>;
}

// Stage type configurations from schema
const STAGE_CONFIG = {
  'STARTED': {
    label: 'Started',
    description: 'Activity has been initiated',
    icon: Play,
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  'TRAVELING': {
    label: 'Traveling',
    description: 'En route to destination',
    icon: MapPin,
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  'ARRIVED': {
    label: 'Arrived',
    description: 'Reached the destination',
    icon: Flag,
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  'WORK_IN_PROGRESS': {
    label: 'Work in Progress',
    description: 'Actively working on the task',
    icon: Wrench,
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  'COMPLETED': {
    label: 'Completed',
    description: 'Task has been finished',
    icon: CheckCircle,
    color: 'bg-green-600',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  'ASSESSMENT': {
    label: 'Assessment',
    description: 'Evaluating the situation',
    icon: Target,
    color: 'bg-indigo-500',
    textColor: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  'PLANNING': {
    label: 'Planning',
    description: 'Planning the approach',
    icon: FileText,
    color: 'bg-cyan-500',
    textColor: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200'
  },
  'EXECUTION': {
    label: 'Execution',
    description: 'Executing the plan',
    icon: Settings,
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  'TESTING': {
    label: 'Testing',
    description: 'Testing and validation',
    icon: CheckCircle,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  'DOCUMENTATION': {
    label: 'Documentation',
    description: 'Creating documentation',
    icon: FileText,
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  'CUSTOMER_HANDOVER': {
    label: 'Customer Handover',
    description: 'Handing over to customer',
    icon: Users,
    color: 'bg-teal-500',
    textColor: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200'
  },
  'PREPARATION': {
    label: 'Preparation',
    description: 'Preparing for the task',
    icon: Settings,
    color: 'bg-violet-500',
    textColor: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200'
  },
  'CLEANUP': {
    label: 'Cleanup',
    description: 'Cleaning up after work',
    icon: CheckCircle,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  }
};

// Default stage templates for different activity types
const STAGE_TEMPLATES = {
  'BD_VISIT': ['STARTED', 'TRAVELING', 'ARRIVED', 'ASSESSMENT', 'WORK_IN_PROGRESS', 'DOCUMENTATION', 'COMPLETED'],
  'PO_DISCUSSION': ['STARTED', 'PREPARATION', 'WORK_IN_PROGRESS', 'DOCUMENTATION', 'COMPLETED'],
  'SPARE_REPLACEMENT': ['STARTED', 'TRAVELING', 'ARRIVED', 'ASSESSMENT', 'PREPARATION', 'EXECUTION', 'TESTING', 'DOCUMENTATION', 'COMPLETED'],
  'TRAVEL': ['STARTED', 'TRAVELING', 'ARRIVED', 'COMPLETED'],
  'TRAINING': ['STARTED', 'PREPARATION', 'WORK_IN_PROGRESS', 'TESTING', 'DOCUMENTATION', 'COMPLETED'],
  'MEETING': ['STARTED', 'PREPARATION', 'WORK_IN_PROGRESS', 'DOCUMENTATION', 'COMPLETED'],
  'MAINTENANCE': ['STARTED', 'TRAVELING', 'ARRIVED', 'ASSESSMENT', 'PREPARATION', 'EXECUTION', 'TESTING', 'CLEANUP', 'DOCUMENTATION', 'COMPLETED'],
  'DOCUMENTATION': ['STARTED', 'PREPARATION', 'WORK_IN_PROGRESS', 'COMPLETED'],
  'INSTALLATION': ['STARTED', 'TRAVELING', 'ARRIVED', 'PREPARATION', 'EXECUTION', 'TESTING', 'CUSTOMER_HANDOVER', 'DOCUMENTATION', 'COMPLETED'],
  'MAINTENANCE_PLANNED': ['STARTED', 'TRAVELING', 'ARRIVED', 'ASSESSMENT', 'PREPARATION', 'EXECUTION', 'TESTING', 'CLEANUP', 'DOCUMENTATION', 'COMPLETED'],
  'REVIEW_MEETING': ['STARTED', 'PREPARATION', 'WORK_IN_PROGRESS', 'DOCUMENTATION', 'COMPLETED'],
  'RELOCATION': ['STARTED', 'PREPARATION', 'TRAVELING', 'ARRIVED', 'EXECUTION', 'TESTING', 'CLEANUP', 'DOCUMENTATION', 'COMPLETED'],
  'OTHER': ['STARTED', 'WORK_IN_PROGRESS', 'COMPLETED']
};

export default function StageManagement({ activity, onEndActivity, getCurrentLocation }: Props) {
  // Hooks
  const { toast } = useToast();
  
  const [stages, setStages] = useState<any[]>([]);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [stageNotes, setStageNotes] = useState('');

  // Get stage template for current activity type
  const stageTemplate = STAGE_TEMPLATES[activity.activityType as keyof typeof STAGE_TEMPLATES] || STAGE_TEMPLATES.OTHER;
  
  // Get current stage
  const currentStageIndex = stages.length > 0 ? stages.length - 1 : 0;
  const currentStage = stages[currentStageIndex];
  const nextStageType = stageTemplate[stages.length];
  const isCompleted = !nextStageType || nextStageType === 'COMPLETED';

  useEffect(() => {
    fetchActivityStages();
  }, [activity.id]);

  const fetchActivityStages = async () => {
    try {
      const response = await apiClient.get(`/activities/${activity.id}/stages`);
      setStages(response.data || []);
    } catch (error) {
      console.error('Error fetching activity stages:', error);
    }
  };

  const handleNextStage = async () => {
    if (!nextStageType) return;

    try {
      setIsUpdatingStage(true);
      
      // Get current location
      const location = await getCurrentLocation();
      
      const stageData = {
        stage: nextStageType,
        startTime: new Date().toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
        location: location.address,
        notes: stageNotes || `Started ${nextStageType.toLowerCase().replace('_', ' ')} stage`
      };

      const response = await apiClient.post(`/activities/${activity.id}/stages`, stageData);
      
      if (response.data) {
        await fetchActivityStages();
        setStageNotes('');
        toast({
          title: "Stage Updated",
          description: `Moved to ${STAGE_CONFIG[nextStageType as keyof typeof STAGE_CONFIG]?.label} stage`
        });
      }
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({
        title: "Stage Error",
        description: "Failed to update stage. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleEndActivity = async () => {
    try {
      const location = await getCurrentLocation();
      
      // End current stage if exists
      if (currentStage && !currentStage.endTime) {
        await apiClient.put(`/activities/${activity.id}/stages/${currentStage.id}`, {
          endTime: new Date().toISOString(),
          latitude: location.latitude,
          longitude: location.longitude,
          location: location.address
        });
      }
      
      // End the activity
      onEndActivity(activity.id);
    } catch (error) {
      console.error('Error ending activity:', error);
      toast({
        title: "Activity Error",
        description: "Failed to end activity. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const renderStageProgress = () => {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Progress</h3>
        <div className="space-y-3">
          {stageTemplate.map((stageType, index) => {
            const config = STAGE_CONFIG[stageType as keyof typeof STAGE_CONFIG];
            const stageData = stages.find(s => s.stage === stageType);
            const isCompleted = !!stageData;
            const isCurrent = index === stages.length && !isCompleted;
            const isUpcoming = index > stages.length;
            
            const Icon = config?.icon || Clock;
            
            return (
              <div
                key={stageType}
                className={`flex items-center p-3 rounded-lg border ${
                  isCompleted 
                    ? `${config?.bgColor} ${config?.borderColor}` 
                    : isCurrent 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className={`p-2 rounded-full mr-3 ${
                  isCompleted 
                    ? config?.color 
                    : isCurrent 
                    ? 'bg-blue-500' 
                    : 'bg-gray-400'
                } text-white`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${
                      isCompleted 
                        ? config?.textColor 
                        : isCurrent 
                        ? 'text-blue-700' 
                        : 'text-gray-500'
                    }`}>
                      {config?.label}
                    </h4>
                    
                    {isCompleted && stageData && (
                      <span className="text-xs text-gray-600">
                        {formatDuration(stageData.startTime, stageData.endTime)}
                      </span>
                    )}
                    
                    {isCurrent && (
                      <span className="text-xs text-blue-600 font-medium">Current</span>
                    )}
                  </div>
                  
                  <p className={`text-sm ${
                    isCompleted 
                      ? config?.textColor 
                      : isCurrent 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                  }`}>
                    {config?.description}
                  </p>
                  
                  {isCompleted && stageData?.location && (
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="truncate">{stageData.location}</span>
                    </div>
                  )}
                </div>
                
                {isCompleted && (
                  <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {activity.activityType.replace('_', ' ')} Activity
          </h2>
          <p className="text-gray-600">
            Started: {new Date(activity.startTime).toLocaleString()}
          </p>
        </div>

        {/* Stage Progress */}
        {renderStageProgress()}

        {/* Current Stage Actions */}
        {!isCompleted && nextStageType && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Stage</h3>
            
            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-2">
                {React.createElement(STAGE_CONFIG[nextStageType as keyof typeof STAGE_CONFIG]?.icon || Clock, {
                  className: "w-6 h-6 text-blue-600"
                })}
                <h4 className="font-medium text-gray-900">
                  {STAGE_CONFIG[nextStageType as keyof typeof STAGE_CONFIG]?.label}
                </h4>
              </div>
              <p className="text-gray-600 text-sm">
                {STAGE_CONFIG[nextStageType as keyof typeof STAGE_CONFIG]?.description}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage Notes (Optional):
              </label>
              <textarea
                value={stageNotes}
                onChange={(e) => setStageNotes(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                rows={2}
                placeholder="Add any notes about this stage..."
              />
            </div>

            <button
              onClick={handleNextStage}
              disabled={isUpdatingStage}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center space-x-2"
            >
              {isUpdatingStage ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Updating Stage...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  <span>Move to {STAGE_CONFIG[nextStageType as keyof typeof STAGE_CONFIG]?.label}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* End Activity Button */}
        <div className="text-center">
          <button
            onClick={handleEndActivity}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            End Activity
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Instructions:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Progress through each stage in sequence</li>
            <li>• Location is automatically captured at each stage</li>
            <li>• Add notes to provide context for each stage</li>
            <li>• Complete all stages or end activity when finished</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
