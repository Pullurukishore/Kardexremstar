import React from 'react';
import { Metadata } from 'next';
import ActivitySchedulingClient from '@/components/activity-schedule/ActivitySchedulingClientShared';
import { Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Activity Scheduling | Zone',
  description: 'Schedule activities for service persons',
};

export const dynamic = 'force-dynamic';

export default function ZoneActivitySchedulingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Activity Scheduling</h1>
                <p className="text-gray-600 text-lg mt-1">Schedule and manage activities for your zone service persons with optimal planning</p>
              </div>
            </div>
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
