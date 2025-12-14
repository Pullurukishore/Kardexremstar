import React from 'react';
import { Metadata } from 'next';
import ActivitySchedulingClient from '@/components/activity-schedule/ActivitySchedulingClientShared';
import { Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Activity Scheduling | Expert',
  description: 'Schedule activities for service persons',
};

export const dynamic = 'force-dynamic';

export default function ExpertActivitySchedulingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Activity Scheduling</h1>
            </div>
            <p className="text-gray-200 text-lg">Schedule and manage activities for optimal service delivery</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <ActivitySchedulingClient />
        </div>
      </div>
    </div>
  );
}
