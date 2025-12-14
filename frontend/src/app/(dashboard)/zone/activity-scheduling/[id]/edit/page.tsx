'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2, 
  X,
  Calendar,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ActivityScheduleForm from '@/components/activity-schedule/ActivityScheduleForm';

export const dynamic = 'force-dynamic';

export default function ZoneEditActivitySchedulePage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;
  
  const [schedule, setSchedule] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scheduleId) {
      fetchScheduleDetail();
    }
  }, [scheduleId]);

  const fetchScheduleDetail = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/activity-schedule/${scheduleId}`);
      if (response.success) {
        setSchedule(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching schedule detail:', error);
      toast.error('Failed to load schedule details');
      router.push('/zone/activity-scheduling');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    toast.success('Activity schedule updated successfully');
    router.push(`/zone/activity-scheduling/${scheduleId}`);
  };

  const handleCancel = () => {
    router.push(`/zone/activity-scheduling/${scheduleId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading schedule details...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Schedule Not Found</h2>
          <p className="text-gray-600 mb-4">The requested activity schedule could not be found.</p>
          <Button onClick={() => router.push('/zone/activity-scheduling')}>
            Back to Activity Scheduling
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/zone/activity-scheduling/${scheduleId}`)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Schedule Details
                </Button>
                <div className="h-6 w-px bg-gray-300" />
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Edit Schedule</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Schedule Info Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Schedule Information
              </CardTitle>
              <CardDescription>
                Editing activity schedule: {schedule.title || 'Untitled Schedule'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {schedule.startTime ? new Date(schedule.startTime).toLocaleString() : 'No start time'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {schedule.assignedUser?.name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {schedule.location || 'No location'}
                  </span>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center gap-2">
                <Badge className={
                  schedule.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  schedule.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                  schedule.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {schedule.status || 'UNKNOWN'}
                </Badge>
                <Badge variant="outline">
                  {schedule.priority || 'NORMAL'} Priority
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Form */}
          <ActivityScheduleForm
            initialData={schedule}
            isEditing={true}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
