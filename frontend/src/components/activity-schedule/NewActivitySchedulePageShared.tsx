'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  User,
  MapPin,
  AlertCircle,
  Sparkles,
  Zap,
  Target,
  FileText,
  ChevronRight,
  Layers,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ActivityScheduleForm from '@/components/activity-schedule/ActivityScheduleForm';

export const dynamic = 'force-dynamic';

export default function NewActivitySchedulePageShared() {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname.includes('/admin/');
  const isZone = pathname.includes('/zone/');
  const isExpert = pathname.includes('/expert/');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getBasePath = () => `/${isAdmin ? 'admin' : isZone ? 'zone' : 'expert'}`;

  const handleSuccess = () => {
    toast.success('Activity schedule created successfully!', {
      description: 'The service person will be notified about the new schedule.',
    });
    router.push(`${getBasePath()}/activity-scheduling`);
  };

  const handleCancel = () => {
    router.push(`${getBasePath()}/activity-scheduling`);
  };

  const features = [
    {
      icon: <User className="h-5 w-5" />,
      title: "Assign Service Person",
      description: "Select from available service personnel",
      gradient: "from-purple-500 to-pink-500",
      bg: "bg-purple-50"
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      title: "Schedule Date & Time",
      description: "Pick the optimal scheduling window",
      gradient: "from-blue-500 to-indigo-500",
      bg: "bg-blue-50"
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: "Set Priority Level",
      description: "Define urgency from Low to Critical",
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50"
    },
    {
      icon: <Layers className="h-5 w-5" />,
      title: "Link Assets",
      description: "Associate relevant equipment",
      gradient: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="bg-gradient-to-r from-[#3d5a78] via-[#507295] to-[#6889ab] py-12 px-4 md:px-8">
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-purple-400/20 rounded-full blur-2xl" />
          </div>

          <div className="relative max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-white/70 text-sm mb-6">
              <button
                onClick={handleCancel}
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                Activity Scheduling
              </button>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white font-medium">New Schedule</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl">
                  <Plus className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    Create New Schedule
                  </h1>
                  <p className="text-white/80 text-lg max-w-xl">
                    Schedule a new activity for your service team with optimal planning and resource allocation
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleCancel}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm self-start md:self-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Schedules
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8 relative z-10 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Side - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form Card */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-white to-gray-50 border-b p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-[#507295] to-[#6889ab] rounded-xl text-white shadow-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Activity Details</CardTitle>
                    <CardDescription className="text-gray-500">
                      Fill in the required information to create a new schedule
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <ActivityScheduleForm
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Info Panel */}
          <div className="space-y-6">
            {/* Quick Setup Guide */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#507295] to-[#6889ab] text-white p-6">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  Quick Setup Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {features.map((feature, index) => (
                    <div 
                      key={index}
                      className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-md flex-shrink-0`}>
                        {feature.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                        <p className="text-sm text-gray-500 mt-0.5">{feature.description}</p>
                      </div>
                      <div className="flex-shrink-0 self-center">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-bold">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Zap className="h-5 w-5" />
                  </div>
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Check availability</span> - Ensure the service person isn't already booked
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Add context</span> - Include detailed notes for better preparation
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">Set priority wisely</span> - Helps in scheduling conflicts
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border border-[#507295]/20 shadow-lg bg-gradient-to-br from-[#507295]/5 to-[#6889ab]/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#507295]/15 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-[#507295]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Need Help?</h4>
                    <p className="text-sm text-gray-600">
                      Contact your administrator if you need assistance with scheduling or have questions about the process.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
