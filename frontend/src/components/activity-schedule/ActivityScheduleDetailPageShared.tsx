'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2, 
  Activity,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pencil as Edit3,
  ExternalLink,
  Phone,
  Mail,
  Building2,
  Layers,
  Timer,
  FileText,
  CheckCheck,
  X,
  ChevronRight,
  Sparkles,
  Navigation,
  Camera,
  Download,
  RefreshCw,
  Zap,
  Target
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';

export default function ActivityScheduleDetailPageShared() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const scheduleId = params.id as string;
  const isAdmin = pathname.includes('/admin/');
  const isZone = pathname.includes('/zone/');
  const isExpert = pathname.includes('/expert/');
  
  const [schedule, setSchedule] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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
      router.push(`/${isAdmin ? 'admin' : isZone ? 'zone' : 'expert'}/activity-scheduling`);
    } finally {
      setLoading(false);
    }
  };

  const getBasePath = () => `/${isAdmin ? 'admin' : isZone ? 'zone' : 'expert'}`;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          gradient: 'from-amber-500 to-orange-500',
          bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-700',
          icon: <AlertCircle className="h-4 w-4" />,
          label: 'Pending',
          iconBg: 'bg-amber-500'
        };
      case 'ACCEPTED':
        return {
          gradient: 'from-blue-500 to-indigo-500',
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Accepted',
          iconBg: 'bg-blue-500'
        };
      case 'COMPLETED':
        return {
          gradient: 'from-emerald-500 to-teal-500',
          bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
          borderColor: 'border-emerald-200',
          textColor: 'text-emerald-700',
          icon: <CheckCheck className="h-4 w-4" />,
          label: 'Completed',
          iconBg: 'bg-emerald-500'
        };
      case 'REJECTED':
        return {
          gradient: 'from-rose-500 to-red-500',
          bg: 'bg-gradient-to-r from-rose-50 to-red-50',
          borderColor: 'border-rose-200',
          textColor: 'text-rose-700',
          icon: <XCircle className="h-4 w-4" />,
          label: 'Rejected',
          iconBg: 'bg-rose-500'
        };
      case 'CANCELLED':
        return {
          gradient: 'from-gray-500 to-slate-500',
          bg: 'bg-gradient-to-r from-gray-50 to-slate-50',
          borderColor: 'border-gray-300',
          textColor: 'text-gray-600',
          icon: <X className="h-4 w-4" />,
          label: 'Cancelled',
          iconBg: 'bg-gray-500'
        };
      default:
        return {
          gradient: 'from-gray-500 to-slate-500',
          bg: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-600',
          icon: null,
          label: status,
          iconBg: 'bg-gray-500'
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { 
          gradient: 'from-rose-500 to-red-600', 
          bg: 'bg-gradient-to-r from-rose-50 to-red-50', 
          text: 'text-rose-700', 
          border: 'border-rose-200',
          icon: <Zap className="h-3.5 w-3.5" />
        };
      case 'HIGH':
        return { 
          gradient: 'from-orange-500 to-amber-500', 
          bg: 'bg-gradient-to-r from-orange-50 to-amber-50', 
          text: 'text-orange-700', 
          border: 'border-orange-200',
          icon: <Target className="h-3.5 w-3.5" />
        };
      case 'MEDIUM':
        return { 
          gradient: 'from-blue-500 to-indigo-500', 
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50', 
          text: 'text-blue-700', 
          border: 'border-blue-200',
          icon: <Activity className="h-3.5 w-3.5" />
        };
      case 'LOW':
        return { 
          gradient: 'from-emerald-500 to-green-500', 
          bg: 'bg-gradient-to-r from-emerald-50 to-green-50', 
          text: 'text-emerald-700', 
          border: 'border-emerald-200',
          icon: <CheckCircle className="h-3.5 w-3.5" />
        };
      default:
        return { 
          gradient: 'from-gray-500 to-slate-500', 
          bg: 'bg-gray-50', 
          text: 'text-gray-600', 
          border: 'border-gray-200',
          icon: null
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (hours: number) => {
    if (hours >= 1) {
      const h = Math.floor(hours);
      const m = Math.round((hours % 1) * 60);
      return m > 0 ? `${h}h ${m}m` : `${h} hour${h !== 1 ? 's' : ''}`;
    }
    return `${Math.round(hours * 60)} minutes`;
  };

  const formatDurationFromTimes = (start: string, end?: string) => {
    if (!start) return '';
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) return '';
    const totalMinutes = Math.round(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  // Helper to get readable stage label for ticket status stages
  const getStageLabel = (stage: string, isTicketStatus?: boolean): string => {
    // Ticket work status progression labels
    const ticketStatusLabels: Record<string, string> = {
      'OPEN': 'Ticket Opened',
      'ASSIGNED': 'Assigned to Technician',
      'IN_PROGRESS': 'Work In Progress',
      'ONSITE_VISIT_STARTED': 'Traveling to Site',
      'ONSITE_VISIT_REACHED': 'Arrived at Site',
      'ONSITE_VISIT_IN_PROGRESS': 'Onsite Work In Progress',
      'ONSITE_VISIT_RESOLVED': 'Issue Resolved',
      'ONSITE_VISIT_COMPLETED': 'Onsite Visit Completed',
      'REMOTE_RESOLUTION_STARTED': 'Remote Support Started',
      'REMOTE_RESOLUTION_IN_PROGRESS': 'Remote Support In Progress',
      'REMOTE_RESOLUTION_RESOLVED': 'Remote Issue Resolved',
      'PARTS_ORDERED': 'Parts Ordered',
      'PARTS_RECEIVED': 'Parts Received',
      'AWAITING_PARTS': 'Awaiting Parts',
      'AWAITING_CUSTOMER': 'Awaiting Customer',
      'ESCALATED': 'Escalated',
      'ON_HOLD': 'On Hold',
      'RESOLVED': 'Resolved',
      'CLOSED': 'Closed',
      'CLOSED_PENDING': 'Closure Pending',
      'CANCELLED': 'Cancelled',
    };

    // Activity stage labels
    const activityStageLabels: Record<string, string> = {
      'STARTED': 'Started',
      'TRAVELING': 'Traveling',
      'ARRIVED': 'Arrived',
      'WORK_IN_PROGRESS': 'Work in Progress',
      'COMPLETED': 'Completed',
      'ASSESSMENT': 'Assessment',
      'PLANNING': 'Planning',
      'EXECUTION': 'Execution',
      'TESTING': 'Testing',
      'DOCUMENTATION': 'Documentation',
      'CUSTOMER_HANDOVER': 'Customer Handover',
      'PREPARATION': 'Preparation',
      'CLEANUP': 'Cleanup',
    };

    if (isTicketStatus) {
      return ticketStatusLabels[stage] || stage?.replace(/_/g, ' ') || 'Unknown';
    }
    return activityStageLabels[stage] || stage?.replace(/_/g, ' ') || 'Unknown';
  };

  // Helper to get stage styling based on type
  const getStageStyle = (stage: string, isTicketStatus?: boolean) => {
    // Ticket status styles with icons
    const ticketStatusStyles: Record<string, { bg: string; text: string; icon: string }> = {
      'ONSITE_VISIT_STARTED': { bg: 'from-blue-100 to-sky-100', text: 'text-blue-700', icon: '🚗' },
      'ONSITE_VISIT_REACHED': { bg: 'from-green-100 to-emerald-100', text: 'text-green-700', icon: '📍' },
      'ONSITE_VISIT_IN_PROGRESS': { bg: 'from-orange-100 to-amber-100', text: 'text-orange-700', icon: '🔧' },
      'ONSITE_VISIT_RESOLVED': { bg: 'from-emerald-100 to-teal-100', text: 'text-emerald-700', icon: '✅' },
      'ONSITE_VISIT_COMPLETED': { bg: 'from-purple-100 to-violet-100', text: 'text-purple-700', icon: '🎉' },
      'IN_PROGRESS': { bg: 'from-yellow-100 to-amber-100', text: 'text-yellow-700', icon: '⚡' },
      'PARTS_ORDERED': { bg: 'from-cyan-100 to-blue-100', text: 'text-cyan-700', icon: '📦' },
      'PARTS_RECEIVED': { bg: 'from-teal-100 to-cyan-100', text: 'text-teal-700', icon: '✔️' },
      'RESOLVED': { bg: 'from-green-100 to-emerald-100', text: 'text-green-700', icon: '🎯' },
      'CLOSED': { bg: 'from-slate-100 to-gray-100', text: 'text-slate-700', icon: '🔒' },
    };

    // Default style
    const defaultStyle = { bg: 'from-gray-100 to-slate-100', text: 'text-gray-700', icon: '📋' };

    if (isTicketStatus) {
      return ticketStatusStyles[stage] || defaultStyle;
    }
    return defaultStyle;
  };

  const handleComplete = async () => {
    try {
      setIsSubmitting(true);
      const response = await apiClient.patch(`/activity-schedule/${schedule.id}/complete`);
      if (response.success) {
        toast.success('Schedule marked as completed');
        setShowCompleteDialog(false);
        fetchScheduleDetail();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await apiClient.patch(`/activity-schedule/${schedule.id}/cancel`, {
        reason: cancelReason,
      });
      if (response.success) {
        toast.success('Schedule cancelled');
        setShowCancelDialog(false);
        setCancelReason('');
        fetchScheduleDetail();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State with vibrant design
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" />
        </div>
        
        <div className="relative text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-white/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white animate-spin" />
            <div className="absolute inset-3 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Activity className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">Loading Schedule</h3>
            <p className="text-blue-100 text-sm">Fetching details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!schedule) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4 md:p-8">
        <div className="max-w-lg mx-auto mt-20">
          <Card className="shadow-xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-700 to-slate-800 p-8 text-center">
              <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">Schedule Not Found</h3>
              <p className="text-gray-200 mt-2">The schedule you're looking for doesn't exist.</p>
            </div>
            <CardContent className="p-6 text-center bg-white">
              <Button 
                onClick={() => router.push(`${getBasePath()}/activity-scheduling`)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Schedules
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(schedule.status);
  const priorityConfig = getPriorityConfig(schedule.priority);
  const canComplete = schedule.status === 'ACCEPTED';
  const canCancel = schedule.status === 'PENDING';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Vibrant Hero Header */}
      <div className="relative overflow-hidden">
        <div className={`bg-gradient-to-r ${statusConfig.gradient} py-10 px-4 md:px-8`}>
          {/* Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-white/70 text-sm mb-6">
              <button
                onClick={() => router.push(`${getBasePath()}/activity-scheduling`)}
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <Activity className="h-4 w-4" />
                Activity Scheduling
              </button>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white font-medium">Schedule #{scheduleId}</span>
            </div>

            {/* Header Content */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-xl">
                  <Activity className="h-10 w-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      {schedule.title || schedule.activityType.replace(/_/g, ' ')}
                    </h1>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                      #{schedule.id}
                    </Badge>
                  </div>
                  <p className="text-white/80 max-w-2xl text-lg">
                    {schedule.description || 'Scheduled activity for service operations'}
                  </p>
                  
                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">{formatDate(schedule.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">{formatTime(schedule.scheduledDate)}</span>
                    </div>
                    {schedule.estimatedDuration && (
                      <div className="flex items-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <Timer className="h-4 w-4" />
                        <span className="text-sm font-medium">{formatDuration(schedule.estimatedDuration)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Priority Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                  {statusConfig.icon}
                  <span className="font-semibold text-white">{statusConfig.label}</span>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${priorityConfig.bg} ${priorityConfig.border} border shadow-lg`}>
                  {priorityConfig.icon}
                  <span className={`font-semibold ${priorityConfig.text}`}>{schedule.priority}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`${getBasePath()}/activity-scheduling`)}
                className="border-gray-200 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={fetchScheduleDetail}
                className="border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              {schedule.ticket && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`${isAdmin ? '/admin' : '/zone'}/tickets/${schedule.ticket.id}`)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Ticket #{schedule.ticket.id}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Edit Button - Always visible */}
              <Button
                size="sm"
                onClick={() => router.push(`${getBasePath()}/activity-scheduling/${schedule.id}/edit`)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Schedule
              </Button>
              
              {canComplete && (
                <Button
                  size="sm"
                  onClick={() => setShowCompleteDialog(true)}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  className="border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Schedule
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Schedule Information */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Calendar className="h-5 w-5" />
                  </div>
                  Schedule Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-500 rounded-lg text-white">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <label className="text-sm font-medium text-blue-600">Scheduled Date</label>
                    </div>
                    <p className="text-gray-900 font-semibold ml-11">{formatDate(schedule.scheduledDate)}</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-500 rounded-lg text-white">
                        <Clock className="h-4 w-4" />
                      </div>
                      <label className="text-sm font-medium text-indigo-600">Scheduled Time</label>
                    </div>
                    <p className="text-gray-900 font-semibold ml-11">{formatTime(schedule.scheduledDate)}</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-500 rounded-lg text-white">
                        <Activity className="h-4 w-4" />
                      </div>
                      <label className="text-sm font-medium text-purple-600">Activity Type</label>
                    </div>
                    <p className="text-gray-900 font-semibold ml-11">{schedule.activityType.replace(/_/g, ' ')}</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-amber-500 rounded-lg text-white">
                        <Timer className="h-4 w-4" />
                      </div>
                      <label className="text-sm font-medium text-amber-600">Duration</label>
                    </div>
                    <p className="text-gray-900 font-semibold ml-11">
                      {schedule.estimatedDuration ? formatDuration(schedule.estimatedDuration) : '—'}
                    </p>
                  </div>
                </div>

                {schedule.location && (
                  <div className="mt-6 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-500 rounded-lg text-white">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-emerald-600 block mb-1">Location</label>
                        <p className="text-gray-900">{schedule.location}</p>
                      </div>
                    </div>
                  </div>
                )}

                {schedule.notes && (
                  <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-500 rounded-lg text-white">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">Notes</label>
                        <p className="text-gray-700 whitespace-pre-wrap">{schedule.notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Zone, Customer & Assets */}
            {((schedule.zone || schedule.customer) || (schedule.assets && schedule.assets.length > 0)) && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Building2 className="h-5 w-5" />
                    </div>
                    Organization & Assets
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {(schedule.zone || schedule.customer) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {schedule.zone && (
                        <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-violet-500 rounded-lg text-white">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <label className="text-sm font-medium text-violet-600">Service Zone</label>
                          </div>
                          <p className="text-gray-900 font-semibold ml-11">{schedule.zone.name}</p>
                        </div>
                      )}
                      {schedule.customer && (
                        <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-100">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-pink-500 rounded-lg text-white">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <label className="text-sm font-medium text-pink-600">Customer</label>
                          </div>
                          <p className="text-gray-900 font-semibold ml-11">{schedule.customer.companyName}</p>
                          {schedule.customer.address && (
                            <p className="text-gray-500 text-sm ml-11 mt-1">{schedule.customer.address}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {schedule.assets && schedule.assets.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 mb-3 block flex items-center gap-2">
                        <Layers className="h-4 w-4 text-gray-400" />
                        Linked Assets ({schedule.assets.length})
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {schedule.assets.map((asset: any) => (
                          <div key={asset.id} className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg text-white">
                                <Layers className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{asset.model}</p>
                                <p className="text-sm text-gray-500 font-mono">S/N: {asset.serialNo}</p>
                                {asset.location && (
                                  <p className="text-sm text-gray-400 mt-1">{asset.location}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Related Ticket */}
            {schedule.ticket && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-sky-600 to-blue-600 text-white p-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    Related Ticket
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-gray-900">#{schedule.ticket.id}</span>
                        <Badge className="bg-sky-100 text-sky-700 border-sky-200 border">
                          {schedule.ticket.status}
                        </Badge>
                        {schedule.ticket.priority && (
                          <Badge className={`${getPriorityConfig(schedule.ticket.priority).bg} ${getPriorityConfig(schedule.ticket.priority).text} ${getPriorityConfig(schedule.ticket.priority).border} border`}>
                            {schedule.ticket.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-700 text-lg">{schedule.ticket.title}</p>
                      
                      {(schedule.ticket.customer || schedule.ticket.contact) && (
                        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                          {schedule.ticket.customer && (
                            <span className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                              <Building2 className="h-4 w-4" />
                              {schedule.ticket.customer.companyName}
                            </span>
                          )}
                          {schedule.ticket.contact && (
                            <span className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                              <User className="h-4 w-4" />
                              {schedule.ticket.contact.name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => router.push(`${isAdmin ? '/admin' : '/zone'}/tickets/${schedule.ticket.id}`)}
                      className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Ticket
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Field Execution Timeline */}
            {schedule.relatedActivities && schedule.relatedActivities.length > 0 && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      Field Execution Timeline
                    </CardTitle>
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-base px-4 py-1">
                      {schedule.relatedActivities.length} Activities
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {schedule.relatedActivities.map((activity: any, actIndex: number) => (
                    <div 
                      key={activity.id} 
                      className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100"
                    >
                      {/* Activity Header */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white shadow-md">
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">
                              {activity.title || activity.activityType?.replace(/_/g, ' ') || 'Activity'}
                            </h4>
                            <p className="text-sm text-emerald-600">
                              {activity.activityType?.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{formatDateTime(activity.startTime)}</p>
                          <div className="flex items-center justify-end gap-2 mt-1 text-sm text-emerald-600">
                            <Timer className="h-4 w-4" />
                            <span className="font-medium">{formatDurationFromTimes(activity.startTime, activity.endTime)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Activity Stages */}
                      {activity.ActivityStage && activity.ActivityStage.length > 0 && (
                        <div className="mt-5 pl-5 border-l-2 border-emerald-300 space-y-4">
                          {activity.ActivityStage.map((stage: any, stageIndex: number) => {
                            const meta = stage.metadata || {};
                            const isTicketStatus = meta.isTicketStatus === true;
                            const locationSource = meta.locationSource as string | undefined;
                            const accuracyRaw = (meta.accuracy as any) ?? undefined;
                            const accuracy = typeof accuracyRaw === 'number' ? accuracyRaw : accuracyRaw ? parseFloat(accuracyRaw) : undefined;
                            const photos = Array.isArray(meta.photos) ? meta.photos : [];
                            const stageStyle = getStageStyle(stage.stage, isTicketStatus);
                            const changedBy = meta.changedBy;

                            return (
                              <div key={stage.id} className="relative">
                                <div className={`absolute -left-[29px] top-2 w-4 h-4 rounded-full border-4 border-white shadow-md ${
                                  isTicketStatus 
                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-500' 
                                    : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                }`} />
                                
                                <div className={`rounded-xl p-5 shadow-sm ml-2 ${
                                  isTicketStatus 
                                    ? `bg-gradient-to-br ${stageStyle.bg} border border-blue-200` 
                                    : 'bg-white border border-emerald-100'
                                }`}>
                                  <div className="flex flex-wrap items-center gap-3 mb-3">
                                    {isTicketStatus && (
                                      <span className="text-xl">{stageStyle.icon}</span>
                                    )}
                                    <span className={`font-semibold text-lg ${isTicketStatus ? stageStyle.text : 'text-gray-900'}`}>
                                      {getStageLabel(stage.stage, isTicketStatus)}
                                    </span>
                                    {isTicketStatus && (
                                      <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200 border text-xs">
                                        Ticket Status
                                      </Badge>
                                    )}
                                    {!isTicketStatus && locationSource === 'gps' && typeof accuracy === 'number' && (
                                      <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 border">
                                        <Navigation className="h-3 w-3 mr-1" />
                                        GPS ±{Math.round(accuracy)}m
                                      </Badge>
                                    )}
                                    {!isTicketStatus && locationSource === 'manual' && (
                                      <Badge className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-700 border-blue-200 border">
                                        Manual Location
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      {formatTime(stage.startTime)}
                                      {stage.endTime && ` → ${formatTime(stage.endTime)}`}
                                    </span>
                                    {formatDurationFromTimes(stage.startTime, stage.endTime) && (
                                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                                        <Timer className="h-3 w-3" />
                                        {formatDurationFromTimes(stage.startTime, stage.endTime)}
                                      </span>
                                    )}
                                    {isTicketStatus && changedBy?.name && (
                                      <span className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                                        <User className="h-3 w-3" />
                                        by {changedBy.name}
                                      </span>
                                    )}
                                  </div>

                                  {stage.location && (
                                    <p className="text-sm text-gray-600 mt-3 flex items-start gap-2 bg-gray-50 p-2 rounded-lg">
                                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      {stage.location}
                                    </p>
                                  )}

                                  {stage.notes && (
                                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                      <p className="text-sm text-amber-800">{stage.notes}</p>
                                    </div>
                                  )}

                                  {photos.length > 0 && (
                                    <div className="mt-4">
                                      <p className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                                        <Camera className="h-4 w-4" />
                                        Photos ({photos.length})
                                      </p>
                                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {photos.map((photo: any, photoIndex: number) => (
                                          <div
                                            key={photoIndex}
                                            className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-100 bg-gray-50 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group"
                                            onClick={() => photo.dataUrl && setSelectedPhoto(photo.dataUrl)}
                                          >
                                            {photo.dataUrl ? (
                                              <>
                                                <img
                                                  src={photo.dataUrl}
                                                  alt={photo.filename || `Photo ${photoIndex + 1}`}
                                                  className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-white rounded-full">
                                                    <ExternalLink className="h-4 w-4 text-gray-700" />
                                                  </div>
                                                </div>
                                              </>
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <Camera className="h-8 w-8 text-gray-300" />
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Service Person */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <User className="h-5 w-5" />
                  </div>
                  Service Person
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {schedule.servicePerson.name?.charAt(0).toUpperCase() || 'S'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{schedule.servicePerson.name}</h3>
                  <p className="text-gray-500 text-sm">Assigned Technician</p>
                </div>

                <div className="space-y-3">
                  <a
                    href={`mailto:${schedule.servicePerson.email}`}
                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-all border border-purple-100"
                  >
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg text-white">
                      <Mail className="h-4 w-4" />
                    </div>
                    <span className="text-gray-700 text-sm truncate">{schedule.servicePerson.email}</span>
                  </a>
                  
                  {schedule.servicePerson.phone && (
                    <a
                      href={`tel:${schedule.servicePerson.phone}`}
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:shadow-md transition-all border border-purple-100"
                    >
                      <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg text-white">
                        <Phone className="h-4 w-4" />
                      </div>
                      <span className="text-gray-700 text-sm">{schedule.servicePerson.phone}</span>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Scheduled By */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-5">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Users className="h-5 w-5" />
                  Scheduled By
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-lg font-bold text-white">
                      {schedule.scheduledBy.name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{schedule.scheduledBy.name}</h4>
                    <a href={`mailto:${schedule.scheduledBy.email}`} className="text-sm text-blue-600 hover:underline">
                      {schedule.scheduledBy.email}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-700 to-slate-800 text-white p-5">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative pl-7 space-y-6">
                  <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-gray-400 to-gray-200" />

                  {/* Created */}
                  <div className="relative">
                    <div className="absolute -left-[22px] w-5 h-5 bg-gradient-to-br from-gray-600 to-slate-700 rounded-full border-4 border-white shadow-md" />
                    <div>
                      <p className="font-semibold text-gray-900">Created</p>
                      <p className="text-sm text-gray-500">{formatDateTime(schedule.createdAt)}</p>
                    </div>
                  </div>

                  {/* Accepted */}
                  {schedule.acceptedAt && (
                    <div className="relative">
                      <div className="absolute -left-[22px] w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full border-4 border-white shadow-md" />
                      <div>
                        <p className="font-semibold text-gray-900">Accepted</p>
                        <p className="text-sm text-gray-500">{formatDateTime(schedule.acceptedAt)}</p>
                      </div>
                    </div>
                  )}

                  {/* Rejected */}
                  {schedule.rejectedAt && (
                    <div className="relative">
                      <div className="absolute -left-[22px] w-5 h-5 bg-gradient-to-br from-rose-500 to-red-500 rounded-full border-4 border-white shadow-md" />
                      <div>
                        <p className="font-semibold text-gray-900">Rejected</p>
                        <p className="text-sm text-gray-500">{formatDateTime(schedule.rejectedAt)}</p>
                        {schedule.rejectionReason && (
                          <div className="mt-2 p-3 bg-rose-50 rounded-lg border border-rose-200">
                            <p className="text-sm text-rose-700">{schedule.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Completed */}
                  {schedule.completedAt && (
                    <div className="relative">
                      <div className="absolute -left-[22px] w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full border-4 border-white shadow-md" />
                      <div>
                        <p className="font-semibold text-gray-900">Completed</p>
                        <p className="text-sm text-gray-500">{formatDateTime(schedule.completedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCheck className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-xl text-white">Mark as Completed</DialogTitle>
            <DialogDescription className="text-emerald-100 mt-2">
              Confirm that all scheduled activities have been finished.
            </DialogDescription>
          </div>
          <div className="p-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              disabled={isSubmitting}
              className="flex-1 border-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Complete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-rose-500 to-red-500 p-6 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <X className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-xl text-white">Cancel Schedule</DialogTitle>
            <DialogDescription className="text-rose-100 mt-2">
              Please provide a reason for cancellation.
            </DialogDescription>
          </div>
          <div className="p-6 space-y-4">
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              className="min-h-[100px] resize-none border-gray-200"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelReason('');
                }}
                disabled={isSubmitting}
                className="flex-1 border-gray-200"
              >
                Back
              </Button>
              <Button
                onClick={handleCancel}
                disabled={isSubmitting || !cancelReason.trim()}
                className="flex-1 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel Schedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
          <div className="relative">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt="Full size photo"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
