import React from 'react';
import { Metadata } from 'next';
import ActivitySchedulingClient from '@/components/activity-schedule/ActivitySchedulingClientShared';
import { Calendar, Activity, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Activity Scheduling | Admin',
  description: 'Schedule activities for service persons',
};

export const dynamic = 'force-dynamic';

export default function ActivitySchedulingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden">
        <div className="bg-gradient-to-r from-[#3d5a78] via-[#507295] to-[#6889ab] py-10 px-4 md:px-8">
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,_transparent_20%,_rgba(0,0,0,0.05)_70%)]" />
            {/* Animated sparkles */}
            <div className="absolute top-1/4 right-1/4 animate-pulse">
              <Sparkles className="h-6 w-6 text-white/30" />
            </div>
            <div className="absolute bottom-1/3 left-1/3 animate-pulse delay-500">
              <Sparkles className="h-4 w-4 text-white/20" />
            </div>
          </div>
          
          <div className="relative max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl">
                  <Calendar className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    Activity Scheduling
                  </h1>
                  <p className="text-white/80 text-lg max-w-2xl">
                    Efficiently schedule and manage all service activities with intelligent planning and real-time tracking
                  </p>
                </div>
              </div>
              
              {/* Quick Stats in Header */}
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-white" />
                    <div>
                      <p className="text-white/70 text-xs uppercase tracking-wide">Admin</p>
                      <p className="text-white font-bold text-lg">Full Dashboard</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <ActivitySchedulingClient />
        </div>
      </div>
    </div>
  );
}
