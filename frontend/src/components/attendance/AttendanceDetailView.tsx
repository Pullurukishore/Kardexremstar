'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Clock,
  MapPin,
  User,
  Calendar,
  Activity,
  Timer,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  UserCheck,
  UserX,
  Clock3,
  Info,
  FileText,
  Loader2,
  Map,
  Building2,
  Phone,
  Mail,
  Navigation,
  TrendingUp,
  BarChart3,
  Camera,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { apiClient } from '@/lib/api/api-client';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import Link from 'next/link';
import PhotoGallery from '@/components/photo/PhotoGallery';

// Types based on backend schema
interface ActivityStage {
  id: number;
  stage: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  accuracy?: number;
  locationSource?: 'gps' | 'manual' | 'network';
  photos?: Array<{
    id: number;
    filename: string;
    cloudinaryUrl: string;
    thumbnailUrl: string;
    createdAt: string;
  }>;
}

interface TicketStatusHistory {
  id: number;
  status: string;
  changedAt: string;
  notes?: string;
  timeInStatus?: number;
  totalTimeOpen?: number;
  location?: string; // Location where status change occurred
  latitude?: number;
  longitude?: number;
  accuracy?: number; // GPS accuracy in meters
  locationSource?: 'gps' | 'manual' | 'network'; // Location source type
  changedBy: {
    id: number;
    name: string;
  };
}

interface AttendanceDetail {
  id: string | number;
  userId: number;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInLatitude?: number;
  checkInLongitude?: number;
  checkInAddress?: string;
  checkOutLatitude?: number;
  checkOutLongitude?: number;
  checkOutAddress?: string;
  totalHours?: number;
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'ABSENT' | 'LATE' | 'EARLY_CHECKOUT' | 'AUTO_CHECKED_OUT';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    serviceZones: Array<{
      serviceZone: {
        id: number;
        name: string;
      };
    }>;
    activityLogs?: Array<{
      id: number;
      activityType: 'TICKET_WORK' | 'TRAVEL' | 'MEETING' | 'TRAINING' | 'OTHER' | 'WORK_FROM_HOME' | 'BD_VISIT' | 'PO_DISCUSSION' | 'SPARE_REPLACEMENT' | 'MAINTENANCE' | 'DOCUMENTATION' | 'INSTALLATION' | 'MAINTENANCE_PLANNED' | 'REVIEW_MEETING' | 'RELOCATION';
      title: string;
      description?: string;
      startTime: string;
      endTime?: string;
      duration?: number;
      location?: string;
      latitude?: number;
      longitude?: number;
      ActivityStage: ActivityStage[];
      ticket?: {
        id: number;
        title: string;
        status: string;
        customer: {
          companyName: string;
        };
        statusHistory: TicketStatusHistory[];
      };
    }>;
  };
  activityLogs?: Array<{
    id: number;
    activityType: 'TICKET_WORK' | 'TRAVEL' | 'MEETING' | 'TRAINING' | 'OTHER' | 'WORK_FROM_HOME' | 'BD_VISIT' | 'PO_DISCUSSION' | 'SPARE_REPLACEMENT' | 'MAINTENANCE' | 'DOCUMENTATION' | 'INSTALLATION' | 'MAINTENANCE_PLANNED' | 'REVIEW_MEETING' | 'RELOCATION';
    title: string;
    description?: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    location?: string;
    latitude?: number;
    longitude?: number;
    ActivityStage: ActivityStage[];
    ticket?: {
      id: number;
      title: string;
      status: string;
      customer: {
        companyName: string;
      };
      statusHistory: TicketStatusHistory[];
    };
  }>;
  gaps: Array<{
    start: string;
    end: string;
    duration: number;
  }>;
  auditLogs?: AuditLog[];
}

interface AuditLog {
  id: number;
  action: string;
  entityType?: string;
  entityId?: number;
  userId?: number;
  performedById?: number;
  performedAt: string;
  details?: any;
  metadata?: any;
  oldValue?: any;
  newValue?: any;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
  performedBy?: {
    id: number;
    name: string;
    email: string;
  };
}

interface AttendanceDetailViewProps {
  attendanceId: string;
  apiEndpoint: string;
  backUrl: string;
  pageTitle: string;
  pageSubtitle?: string;
}

const STATUS_CONFIG = {
  CHECKED_IN: { label: 'Checked In', color: 'bg-green-100 text-green-800 border-green-200', icon: UserCheck },
  CHECKED_OUT: { label: 'Checked Out', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: UserX },
  AUTO_CHECKED_OUT: { label: 'Auto Checkout', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Zap },
  ABSENT: { label: 'Absent', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  LATE: { label: 'Late', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
  EARLY_CHECKOUT: { label: 'Early Checkout', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock3 },
};

const ACTIVITY_TYPE_CONFIG = {
  TICKET_WORK: { label: 'Ticket Work', color: 'bg-blue-100 text-blue-800', icon: FileText },
  TRAVEL: { label: 'Travel', color: 'bg-green-100 text-green-800', icon: Navigation },
  MEETING: { label: 'Meeting', color: 'bg-purple-100 text-purple-800', icon: User },
  TRAINING: { label: 'Training', color: 'bg-yellow-100 text-yellow-800', icon: BarChart3 },
  WORK_FROM_HOME: { label: 'Work From Home', color: 'bg-indigo-100 text-indigo-800', icon: Building2 },
  BD_VISIT: { label: 'BD Visit', color: 'bg-cyan-100 text-cyan-800', icon: User },
  PO_DISCUSSION: { label: 'PO Discussion', color: 'bg-orange-100 text-orange-800', icon: FileText },
  SPARE_REPLACEMENT: { label: 'Spare Replacement', color: 'bg-red-100 text-red-800', icon: Activity },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-emerald-100 text-emerald-800', icon: Activity },
  DOCUMENTATION: { label: 'Documentation', color: 'bg-slate-100 text-slate-800', icon: FileText },
  INSTALLATION: { label: 'Installation', color: 'bg-teal-100 text-teal-800', icon: Activity },
  MAINTENANCE_PLANNED: { label: 'Planned Maintenance', color: 'bg-lime-100 text-lime-800', icon: Activity },
  REVIEW_MEETING: { label: 'Review Meeting', color: 'bg-violet-100 text-violet-800', icon: User },
  RELOCATION: { label: 'Relocation', color: 'bg-pink-100 text-pink-800', icon: Navigation },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800', icon: Activity },
};

const STAGE_CONFIG = {
  STARTED: { label: 'Started', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  TRAVELING: { label: 'Traveling', color: 'bg-yellow-100 text-yellow-800', icon: Navigation },
  ARRIVED: { label: 'Arrived', color: 'bg-green-100 text-green-800', icon: MapPin },
  WORK_IN_PROGRESS: { label: 'Work in Progress', color: 'bg-orange-100 text-orange-800', icon: Activity },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  ASSESSMENT: { label: 'Assessment', color: 'bg-purple-100 text-purple-800', icon: Info },
  PLANNING: { label: 'Planning', color: 'bg-indigo-100 text-indigo-800', icon: FileText },
  EXECUTION: { label: 'Execution', color: 'bg-red-100 text-red-800', icon: Activity },
  TESTING: { label: 'Testing', color: 'bg-cyan-100 text-cyan-800', icon: Activity },
  DOCUMENTATION: { label: 'Documentation', color: 'bg-slate-100 text-slate-800', icon: FileText },
  CUSTOMER_HANDOVER: { label: 'Customer Handover', color: 'bg-teal-100 text-teal-800', icon: User },
  PREPARATION: { label: 'Preparation', color: 'bg-violet-100 text-violet-800', icon: Activity },
  CLEANUP: { label: 'Cleanup', color: 'bg-lime-100 text-lime-800', icon: Activity },
};

// Build server base URL for static assets. If NEXT_PUBLIC_API_URL ends with '/api',
// strip it so that '/storage/...' can be fetched from the server root.
const getServerBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';
  return raw.replace(/\/(api)\/?$/, '');
};

// Helper function to safely get activity config
const getActivityConfig = (activityType: string) => {
  return ACTIVITY_TYPE_CONFIG[activityType as keyof typeof ACTIVITY_TYPE_CONFIG] || ACTIVITY_TYPE_CONFIG.OTHER;
};

// Helper function to display full addresses
const shortenAddress = (address: string | undefined): string => {
  if (!address) return '';
  
  // Return the full address without truncation
  return address;
};

const TICKET_STATUS_CONFIG = {
  OPEN: { label: 'Open', color: 'bg-blue-100 text-blue-800' },
  ASSIGNED: { label: 'Assigned', color: 'bg-purple-100 text-purple-800' },
  IN_PROCESS: { label: 'In Process', color: 'bg-yellow-100 text-yellow-800' },
  WAITING_CUSTOMER: { label: 'Waiting Customer', color: 'bg-orange-100 text-orange-800' },
  CLOSED_PENDING: { label: 'Closed Pending', color: 'bg-gray-100 text-gray-800' },
  CLOSED: { label: 'Closed', color: 'bg-green-100 text-green-800' },
  ONSITE_VISIT: { label: 'Onsite Visit', color: 'bg-indigo-100 text-indigo-800' },
  ONSITE_VISIT_PLANNED: { label: 'Onsite Visit Planned', color: 'bg-cyan-100 text-cyan-800' },
  RESOLVED: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-800' },
  SPARE_PARTS_NEEDED: { label: 'Spare Parts Needed', color: 'bg-red-100 text-red-800' },
  SPARE_PARTS_BOOKED: { label: 'Spare Parts Booked', color: 'bg-pink-100 text-pink-800' },
  SPARE_PARTS_DELIVERED: { label: 'Spare Parts Delivered', color: 'bg-teal-100 text-teal-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-800' },
  ON_HOLD: { label: 'On Hold', color: 'bg-gray-100 text-gray-800' },
  ESCALATED: { label: 'Escalated', color: 'bg-red-100 text-red-800' },
  PO_NEEDED: { label: 'PO Needed', color: 'bg-orange-100 text-orange-800' },
  PO_RECEIVED: { label: 'PO Received', color: 'bg-lime-100 text-lime-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  REOPENED: { label: 'Reopened', color: 'bg-yellow-100 text-yellow-800' },
  ONSITE_VISIT_STARTED: { label: 'Onsite Visit Started', color: 'bg-blue-100 text-blue-800' },
  ONSITE_VISIT_REACHED: { label: 'Onsite Visit Reached', color: 'bg-green-100 text-green-800' },
  ONSITE_VISIT_IN_PROGRESS: { label: 'Onsite Visit In Progress', color: 'bg-orange-100 text-orange-800' },
  ONSITE_VISIT_RESOLVED: { label: 'Onsite Visit Resolved', color: 'bg-emerald-100 text-emerald-800' },
  ONSITE_VISIT_PENDING: { label: 'Onsite Visit Pending', color: 'bg-slate-100 text-slate-800' },
  ONSITE_VISIT_COMPLETED: { label: 'Onsite Visit Completed', color: 'bg-green-100 text-green-800' },
  PO_REACHED: { label: 'PO Reached', color: 'bg-teal-100 text-teal-800' },
};

const AUDIT_ACTION_CONFIG = {
  ATTENDANCE_CHECKED_IN: { label: 'Checked In', color: 'bg-green-100 text-green-800', icon: UserCheck },
  ATTENDANCE_CHECKED_OUT: { label: 'Checked Out', color: 'bg-blue-100 text-blue-800', icon: UserX },
  ATTENDANCE_RE_CHECKED_IN: { label: 'Re-Checked In', color: 'bg-emerald-100 text-emerald-800', icon: UserCheck },
  ATTENDANCE_MANUAL_CHECKOUT: { label: 'Manual Checkout', color: 'bg-blue-100 text-blue-800', icon: UserX },
  ATTENDANCE_AUTO_CHECKOUT: { label: 'Auto Checkout', color: 'bg-purple-100 text-purple-800', icon: Zap },
  ATTENDANCE_UPDATED: { label: 'Attendance Record Updated', color: 'bg-yellow-100 text-yellow-800', icon: FileText },
  ACTIVITY_LOG_ADDED: { label: 'Activity Logged', color: 'bg-purple-100 text-purple-800', icon: Activity },
  ACTIVITY_LOG_UPDATED: { label: 'Activity Modified', color: 'bg-indigo-100 text-indigo-800', icon: Activity },
  ACTIVITY_STAGE_UPDATED: { label: 'Activity Stage Changed', color: 'bg-cyan-100 text-cyan-800', icon: Navigation },
  TICKET_STATUS_CHANGED: { label: 'Ticket Status Updated', color: 'bg-orange-100 text-orange-800', icon: FileText },
  AUTO_CHECKOUT_PERFORMED: { label: 'System Auto Checkout', color: 'bg-purple-100 text-purple-800', icon: Zap },
  // Additional common audit actions
  LOCATION_UPDATED: { label: 'Location Updated', color: 'bg-teal-100 text-teal-800', icon: MapPin },
  NOTES_UPDATED: { label: 'Notes Updated', color: 'bg-gray-100 text-gray-800', icon: FileText },
};

export default function AttendanceDetailView({
  attendanceId,
  apiEndpoint,
  backUrl,
  pageTitle,
  pageSubtitle
}: AttendanceDetailViewProps) {
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<AttendanceDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch attendance details with useCallback to prevent unnecessary re-renders
  const fetchAttendanceDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(apiEndpoint);
      // Some api clients return response.data, others return the data directly via an interceptor
      // Normalize to a single `detail` object
      const payloadLevel1 = (response && typeof response === 'object' && 'data' in (response as any)) ? (response as any).data : response;
      const detail = payloadLevel1?.success && payloadLevel1?.data
        ? payloadLevel1.data
        : (payloadLevel1?.data ?? payloadLevel1);
      if (detail && (detail.id !== undefined)) {
        setAttendance(detail as any);
        setAuditLogs(detail.auditLogs || []);
      } else {
        throw new Error('No attendance data received');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load attendance details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, toast]);

  // Format duration
  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Calculate total hours from check-in/check-out times
  const calculateTotalHours = () => {
    if (!attendance?.checkInAt) return null;
    
    const checkInTime = parseISO(attendance.checkInAt);
    const checkOutTime = attendance.checkOutAt ? parseISO(attendance.checkOutAt) : new Date();
    
    const totalMinutes = differenceInMinutes(checkOutTime, checkInTime);
    return totalMinutes > 0 ? totalMinutes / 60 : null;
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };

  // Format time for display
  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'HH:mm');
  };

  useEffect(() => {
    if (attendanceId) {
      fetchAttendanceDetail();
    }
  }, [attendanceId, fetchAttendanceDetail]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!attendance) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance Record Not Found</h3>
          <p className="text-gray-500 mb-4">The requested attendance record could not be found.</p>
          <Link href={backUrl}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Attendance
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[attendance.status] || STATUS_CONFIG.CHECKED_OUT;
  const StatusIcon = statusConfig.icon;
  const isAutoCheckout = attendance.notes?.includes('Auto-checkout');
  const activities = attendance.activityLogs || attendance.user?.activityLogs || [];
  const gaps = attendance.gaps || [];
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 p-4 sm:p-6 shadow-xl">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <Link href={backUrl}>
                <Button variant="secondary" size="sm" className="w-fit bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              
              {/* User Profile Section */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-white/30">
                  {(attendance.user.name || attendance.user.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                    {attendance.user.name || attendance.user.email}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(attendance.checkInAt)}
                    </Badge>
                    {attendance.user.serviceZones.length > 0 && (
                      <Badge className="bg-white/20 text-white border-white/30 text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {attendance.user.serviceZones.map(sz => sz.serviceZone.name).join(', ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <Badge className={`${statusConfig.color} border text-xs sm:text-sm whitespace-nowrap shadow-sm`}>
                <StatusIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                {statusConfig.label}
              </Badge>
              {isAutoCheckout && (
                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 text-xs sm:text-sm whitespace-nowrap shadow-sm">
                  <Zap className="h-3 w-3 mr-1" />
                  Auto
                </Badge>
              )}
              {attendance.totalHours && Number(attendance.totalHours) > 0 && (
                <Badge className="bg-white text-indigo-700 border-0 text-xs sm:text-sm whitespace-nowrap shadow-sm font-semibold">
                  <Timer className="h-3 w-3 mr-1" />
                  {Number(attendance.totalHours).toFixed(1)}h
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3 py-2.5 sm:py-3 min-w-0 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
            <div className="flex flex-col items-center gap-1">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">Overview</span>
              <span className="sm:hidden text-xs font-medium">Info</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="activities" className="text-xs sm:text-sm px-2 sm:px-3 py-2.5 sm:py-3 min-w-0 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
            <div className="flex flex-col items-center gap-1">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">Activities</span>
              <span className="sm:hidden text-xs font-medium">Tasks</span>
              <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-0">{activities.length}</Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs sm:text-sm px-2 sm:px-3 py-2.5 sm:py-3 min-w-0 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
            <div className="flex flex-col items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">Timeline</span>
              <span className="sm:hidden text-xs font-medium">Time</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm px-2 sm:px-3 py-2.5 sm:py-3 min-w-0 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
            <div className="flex flex-col items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-medium">History</span>
              <span className="sm:hidden text-xs font-medium">Log</span>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Check-In Details */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  Check-In Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {attendance.checkInAt ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Time:</span>
                      <span className="text-sm font-mono">{formatTime(attendance.checkInAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Date:</span>
                      <span className="text-sm">{formatDate(attendance.checkInAt)}</span>
                    </div>
                    {attendance.checkInAddress && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-gray-600">Location:</span>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{attendance.checkInAddress}</p>
                            {attendance.checkInLatitude && attendance.checkInLongitude && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                                onClick={() => window.open(`https://maps.google.com/?q=${attendance.checkInLatitude},${attendance.checkInLongitude}`, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View on Maps
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <XCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                    <p className="text-sm text-gray-500">No check-in recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Check-Out Details */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  Check-Out Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {attendance.checkOutAt ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Time:</span>
                      <span className="text-sm font-mono">{formatTime(attendance.checkOutAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Type:</span>
                      <span className="text-sm">
                        {isAutoCheckout ? 'Automatic' : 'Manual'}
                        {isAutoCheckout && <Zap className="h-3 w-3 ml-1 inline text-purple-600" />}
                      </span>
                    </div>
                    {attendance.checkOutAddress && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-gray-600">Location:</span>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{attendance.checkOutAddress}</p>
                            {attendance.checkOutLatitude && attendance.checkOutLongitude && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-blue-600"
                                onClick={() => window.open(`https://maps.google.com/?q=${attendance.checkOutLatitude},${attendance.checkOutLongitude}`, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View on Maps
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Clock className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                    <p className="text-sm text-gray-500">Still checked in</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-blue-500 rounded-xl flex-shrink-0">
                    <Timer className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-blue-700">Total Hours</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-900 truncate">
                      {(() => {
                        const backendHours = attendance.totalHours;
                        const calculatedHours = calculateTotalHours();
                        
                        if (backendHours && backendHours > 0) {
                          return `${Number(backendHours).toFixed(1)}h`;
                        } else if (calculatedHours && calculatedHours > 0) {
                          return `${calculatedHours.toFixed(1)}h`;
                        } else {
                          return 'N/A';
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-green-200 bg-gradient-to-br from-green-50 via-green-100 to-green-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-green-500 rounded-xl flex-shrink-0">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-green-700">Activities</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-900">{activities.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-orange-200 bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-orange-500 rounded-xl flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-orange-700">Gaps</p>
                    <p className="text-lg sm:text-2xl font-bold text-orange-900">{gaps.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-purple-200 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-purple-500 rounded-xl flex-shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-purple-700">Zone</p>
                    <p className="text-xs sm:text-sm font-bold text-purple-900 truncate">
                      {attendance.user.serviceZones.length > 0 
                        ? attendance.user.serviceZones.map(sz => sz.serviceZone.name).join(', ')
                        : 'No Zone'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes & Comments */}
          {attendance.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes & Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{attendance.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          {activities.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Activities Recorded</h3>
                <p className="text-gray-500">No activities were logged for this attendance session.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activities.map((activity: any, index: number) => {
                const activityConfig = getActivityConfig(activity.activityType);
                const ActivityIcon = activityConfig.icon;
                
                return (
                  <Card key={activity.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-indigo-300 overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row h-full">
                        {/* Left colored accent strip */}
                        <div className={`sm:w-1.5 h-1 sm:h-auto w-full ${activityConfig.color.replace('bg-', 'bg-').split(' ')[0].replace('100', '500')}`}></div>
                        
                        <div className="p-4 sm:p-6 flex-1 space-y-4">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${activityConfig.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                              <ActivityIcon className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                    {activity.title}
                                  </h4>
                                  <Badge variant="outline" className={`mt-1 text-xs font-semibold ${activityConfig.color} border-0`}>
                                    {activityConfig.label}
                                  </Badge>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-gray-50 px-2 py-1 rounded-md">
                                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                                    {formatTime(activity.startTime)}
                                    <span className="text-gray-400">→</span>
                                    {activity.endTime ? formatTime(activity.endTime) : '...'}
                                  </div>
                                  {activity.duration && (
                                    <span className="text-xs text-slate-500 mt-1 font-medium">
                                      Duration: {formatDuration(activity.duration)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {activity.description && (
                                <p className="text-sm text-gray-600 mt-3 leading-relaxed bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Activity Stages */}
                          {activity.ActivityStage && activity.ActivityStage.length > 0 && (
                            <div className="mt-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Activity Stages:</h5>
                              <div className="space-y-2">
                                {activity.ActivityStage.map((stage: any, stageIndex: number) => {
                                  const stageConfig = STAGE_CONFIG[stage.stage as keyof typeof STAGE_CONFIG] || { label: stage.stage, color: 'bg-gray-100 text-gray-800', icon: Activity };
                                  const StageIcon = stageConfig.icon;
                                  return (
                                    <div key={stage.id} className="space-y-1">
                                      <div className="flex items-center gap-2 text-sm flex-wrap">
                                        <div className={`p-1 rounded ${stageConfig.color}`}>
                                          <StageIcon className="h-3 w-3" />
                                        </div>
                                        <span className="font-medium">{stageConfig.label}</span>
                                        <span className="text-gray-500">
                                          {formatTime(stage.startTime)}
                                          {stage.endTime && ` - ${formatTime(stage.endTime)}`}
                                        </span>
                                        {stage.duration && (
                                          <span className="text-gray-400">({formatDuration(stage.duration)})</span>
                                        )}
                                      </div>
                                      {stage.location && (
                                        <div className="ml-7">
                                          <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <MapPin className="h-3 w-3" />
                                            <span>{shortenAddress(stage.location)}</span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {(() => {
                                              const locationSource = (stage as any).locationSource || (stage as any).metadata?.locationSource;
                                              const accuracy = (stage as any).accuracy ?? (stage as any).metadata?.accuracy;
                                              return locationSource === 'manual' && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                  ✓ Manual
                                                </Badge>
                                              );
                                            })()}
                                            {(() => {
                                              const locationSource = (stage as any).locationSource || (stage as any).metadata?.locationSource;
                                              const accuracy = (stage as any).accuracy ?? (stage as any).metadata?.accuracy;
                                              return accuracy && accuracy <= 100 && locationSource === 'gps' && (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                  ✓ Accurate ({Number(accuracy).toFixed(0)}m)
                                                </Badge>
                                              );
                                            })()}
                                            {(() => {
                                              const locationSource = (stage as any).locationSource || (stage as any).metadata?.locationSource;
                                              const accuracy = (stage as any).accuracy ?? (stage as any).metadata?.accuracy;
                                              return accuracy && accuracy > 100 && locationSource === 'gps' && (
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                                  ⚠ Low Accuracy ({Number(accuracy).toFixed(0)}m)
                                                </Badge>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                      {/* Show coordinates only when no address is available */}
                                      {!stage.location && stage.latitude && stage.longitude && (
                                        <div className="ml-7">
                                          <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <MapPin className="h-3 w-3" />
                                            <span>{typeof stage.latitude === 'number' ? stage.latitude.toFixed(6) : stage.latitude}, {typeof stage.longitude === 'number' ? stage.longitude.toFixed(6) : stage.longitude}</span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {(() => {
                                              const locationSource = (stage as any).locationSource || (stage as any).metadata?.locationSource;
                                              const accuracy = (stage as any).accuracy ?? (stage as any).metadata?.accuracy;
                                              return locationSource === 'manual' && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                  ✓ Manual
                                                </Badge>
                                              );
                                            })()}
                                            {(() => {
                                              const locationSource = (stage as any).locationSource || (stage as any).metadata?.locationSource;
                                              const accuracy = (stage as any).accuracy ?? (stage as any).metadata?.accuracy;
                                              return accuracy && accuracy <= 100 && locationSource === 'gps' && (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                  ✓ Accurate ({Number(accuracy).toFixed(0)}m)
                                                </Badge>
                                              );
                                            })()}
                                            {(() => {
                                              const locationSource = (stage as any).locationSource || (stage as any).metadata?.locationSource;
                                              const accuracy = (stage as any).accuracy ?? (stage as any).metadata?.accuracy;
                                              return accuracy && accuracy > 100 && locationSource === 'gps' && (
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                                  ⚠ Low Accuracy ({Number(accuracy).toFixed(0)}m)
                                                </Badge>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Ticket Status History for TICKET_WORK activities */}
                          {activity.activityType === 'TICKET_WORK' && activity.ticket?.statusHistory && activity.ticket.statusHistory.length > 0 && (
                            <div className="mt-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Ticket Work States:</h5>
                              <div className="space-y-2">
                                {activity.ticket.statusHistory.map((statusChange: any, statusIndex: number) => {
                                  const statusConfig = TICKET_STATUS_CONFIG[statusChange.status as keyof typeof TICKET_STATUS_CONFIG] || { label: statusChange.status, color: 'bg-gray-100 text-gray-800' };
                                  return (
                                    <div key={statusChange.id}>
                                      <div className="flex items-center gap-2 text-sm">
                                        <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                                          {statusConfig.label}
                                        </Badge>
                                        <span className="text-gray-500">
                                          {formatTime(statusChange.changedAt)}
                                        </span>
                                        <span className="text-gray-600">by {statusChange.changedBy.name}</span>
                                        {statusChange.timeInStatus && (
                                          <span className="text-gray-400">({formatDuration(statusChange.timeInStatus)})</span>
                                        )}
                                        {statusChange.notes && (
                                          <span className="text-gray-500 italic truncate max-w-48">"{statusChange.notes}"</span>
                                        )}
                                      </div>
                                      {(() => {
                                        const notes: string = statusChange.notes || '';
                                        const manualFromSource = statusChange.locationSource === 'manual';
                                        const manualFromNotes = /📌 Source: ✓ Manual/.test(notes);
                                        const locMatch = notes.match(/📍 Location:\s*([^\n]+)/);
                                        const displayLocation = (manualFromNotes && locMatch ? locMatch[1].trim() : statusChange.location);
                                        if (!displayLocation) return null;
                                        return (
                                          <div className="flex items-start gap-2 mt-1 ml-6">
                                            <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs text-gray-500 break-words">{shortenAddress(displayLocation)}</p>
                                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {(manualFromSource || manualFromNotes) && (
                                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                    ✓ Manual
                                                  </Badge>
                                                )}
                                                {statusChange.accuracy && statusChange.accuracy <= 100 && statusChange.locationSource === 'gps' && (
                                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                    ✓ Accurate ({Number(statusChange.accuracy).toFixed(0)}m)
                                                  </Badge>
                                                )}
                                                {statusChange.accuracy && statusChange.accuracy > 100 && statusChange.locationSource === 'gps' && (
                                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                                    ⚠ Low Accuracy ({Number(statusChange.accuracy).toFixed(0)}m)
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {activity.location && (
                                <div className="flex items-start gap-2 text-sm text-gray-500">
                                  <MapPin className="h-3 w-3 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-500 break-words">{activity.location}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {((activity as any).locationSource === 'manual' || (activity as any).metadata?.locationSource === 'manual') && (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                          ✓ Manual
                                        </Badge>
                                      )}
                                      {(() => {
                                        const src = (activity as any).locationSource || (activity as any).metadata?.locationSource;
                                        const acc = (activity as any).accuracy ?? (activity as any).metadata?.accuracy;
                                        return src === 'gps' && typeof acc === 'number' && acc <= 100;
                                      })() && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                          ✓ Accurate ({Number(((activity as any).accuracy ?? (activity as any).metadata?.accuracy)).toFixed(0)}m)
                                        </Badge>
                                      )}
                                      {(() => {
                                        const src = (activity as any).locationSource || (activity as any).metadata?.locationSource;
                                        const acc = (activity as any).accuracy ?? (activity as any).metadata?.accuracy;
                                        return src === 'gps' && typeof acc === 'number' && acc > 100;
                                      })() && (
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                          ⚠ Low Accuracy ({Number(((activity as any).accuracy ?? (activity as any).metadata?.accuracy)).toFixed(0)}m)
                                        </Badge>
                                      )}
                                    </div>
                                    {activity.latitude && activity.longitude && (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 mt-1 text-blue-600"
                                        onClick={() => window.open(`https://maps.google.com/?q=${activity.latitude},${activity.longitude}`, '_blank')}
                                      >
                                        <Map className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              {/* Show coordinates only when no address is available */}
                              {!activity.location && activity.latitude && activity.longitude && (
                                <div className="flex items-start gap-2 text-sm text-gray-500">
                                  <MapPin className="h-3 w-3 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-500 break-words">
                                      {typeof activity.latitude === 'number' ? activity.latitude.toFixed(6) : activity.latitude}, {typeof activity.longitude === 'number' ? activity.longitude.toFixed(6) : activity.longitude}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {((activity as any).locationSource === 'manual' || (activity as any).metadata?.locationSource === 'manual') && (
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                          ✓ Manual
                                        </Badge>
                                      )}
                                      {(() => {
                                        const src = (activity as any).locationSource || (activity as any).metadata?.locationSource;
                                        const acc = (activity as any).accuracy ?? (activity as any).metadata?.accuracy;
                                        return src === 'gps' && typeof acc === 'number' && acc <= 100;
                                      })() && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                          ✓ Accurate ({Number(((activity as any).accuracy ?? (activity as any).metadata?.accuracy)).toFixed(0)}m)
                                        </Badge>
                                      )}
                                      {(() => {
                                        const src = (activity as any).locationSource || (activity as any).metadata?.locationSource;
                                        const acc = (activity as any).accuracy ?? (activity as any).metadata?.accuracy;
                                        return src === 'gps' && typeof acc === 'number' && acc > 100;
                                      })() && (
                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                          ⚠ Low Accuracy ({Number(((activity as any).accuracy ?? (activity as any).metadata?.accuracy)).toFixed(0)}m)
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 mt-1 text-blue-600"
                                      onClick={() => window.open(`https://maps.google.com/?q=${activity.latitude},${activity.longitude}`, '_blank')}
                                    >
                                      <Map className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {activity.ticket && (
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  Ticket #{activity.ticket.id}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {activity.ticket.customer.companyName}
                                </div>
                                <Badge variant="outline" className={`text-xs mt-1 ${TICKET_STATUS_CONFIG[activity.ticket.status as keyof typeof TICKET_STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-800'}`}>
                                  {TICKET_STATUS_CONFIG[activity.ticket.status as keyof typeof TICKET_STATUS_CONFIG]?.label || activity.ticket.status}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
                Daily Timeline
              </CardTitle>
              <CardDescription className="ml-11">
                Chronological view of check-in, activities, gaps, and check-out
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-0 relative">
                {/* Vertical Line Background */}
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200 -z-10"></div>

                {/* Check-in Event */}
                {attendance.checkInAt && (
                  <div className="flex items-start gap-4 hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
                    <div className="flex flex-col items-center mt-1">
                      <div className="w-10 h-10 rounded-full bg-green-100 border-4 border-white shadow-sm flex items-center justify-center z-10">
                        <UserCheck className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                        <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-b border-slate-200 transform rotate-45"></div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-green-700">Checked In</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {formatTime(attendance.checkInAt)}
                          </Badge>
                        </div>
                        {attendance.checkInAddress && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                            <span>{attendance.checkInAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activities and Gaps */}
                {activities.map((activity: any, index: number) => (
                  <div key={activity.id}>
                    {/* Gap before activity */}
                    {index > 0 && gaps[index - 1] && (
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex flex-col items-center mt-1">
                          <div className="w-10 h-10 rounded-full bg-yellow-100 border-4 border-white shadow-sm flex items-center justify-center z-10">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          </div>
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="bg-yellow-50/50 p-3 rounded-xl border border-yellow-100 border-dashed">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-yellow-800 text-sm">Activity Gap</span>
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200">
                                {gaps[index - 1].duration} mins
                              </Badge>
                            </div>
                            <p className="text-xs text-yellow-700 mt-1">
                              {formatTime(gaps[index - 1].start)} - {formatTime(gaps[index - 1].end)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Activity */}
                    <div className="flex items-start gap-4 hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors group">
                      <div className="flex flex-col items-center mt-1">
                        <div className={`w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${getActivityConfig(activity.activityType).color}`}>
                          <Activity className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow relative">
                          <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-b border-slate-200 transform rotate-45"></div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="font-bold text-gray-900">{activity.title}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${getActivityConfig(activity.activityType).color} border-0`}>
                                {getActivityConfig(activity.activityType).label}
                              </Badge>
                              <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {formatTime(activity.startTime)} - {activity.endTime ? formatTime(activity.endTime) : '...'}
                              </span>
                            </div>
                          </div>
                          {activity.location && (
                            <div className="flex items-start gap-2 text-sm text-gray-500 mt-2">
                              <MapPin className="h-4 w-4 mt-0.5" />
                              <span className="break-words">{activity.location}</span>
                            </div>
                          )}
                          {activity.ticket && (
                            <div className="flex items-center gap-2 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="text-xl">🎫</span>
                              <div className="text-sm">
                                <span className="font-medium text-gray-900">Ticket #{activity.ticket.id}</span>
                                <span className="text-gray-500 mx-1">•</span>
                                <span className="text-gray-600">{activity.ticket.customer.companyName}</span>
                              </div>
                            </div>
                          )}

                        {/* Ticket Photos */}
                        {activity.activityType === 'TICKET_WORK' && activity.ticket && (
                          <div className="mt-2">
                            <PhotoGallery 
                              ticketId={activity.ticket.id}
                              title="Ticket Photos"
                              className="border-0 bg-transparent"
                              showUploadTime={true}
                              maxPhotosToShow={6}
                            />
                          </div>
                        )}

                        {/* Activity Stages in Timeline */}
                        {activity.ActivityStage && activity.ActivityStage.length > 0 && (
                          <div className="mt-2 ml-6 space-y-2">
                            {activity.ActivityStage.map((stage: any, stageIndex: number) => {
                              const stageConfig = STAGE_CONFIG[stage.stage as keyof typeof STAGE_CONFIG] || { label: stage.stage, color: 'bg-gray-100 text-gray-800', icon: Activity };
                              const StageIcon = stageConfig.icon;
                              return (
                                <div key={stage.id} className="flex items-start gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-2 h-2 rounded-full ${stageConfig.color.includes('bg-') ? stageConfig.color.split(' ')[0].replace('bg-', 'bg-') : 'bg-gray-400'}`}></div>
                                    {stageIndex < activity.ActivityStage!.length - 1 && <div className="w-0.5 h-6 bg-gray-200"></div>}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <StageIcon className="h-3 w-3" />
                                      <span className="font-medium">{stageConfig.label}</span>
                                      <span className="text-gray-500">
                                        {formatTime(stage.startTime)}
                                        {stage.endTime && ` - ${formatTime(stage.endTime)}`}
                                      </span>
                                      {stage.duration && (
                                        <span className="text-gray-400">({formatDuration(stage.duration)})</span>
                                      )}
                                    </div>
                                    {stage.location && (
                                      <p className="text-xs text-gray-500 mt-1 break-words">📍 {shortenAddress(stage.location)}</p>
                                    )}
                                    {stage.notes && (
                                      <div className="mt-1">
                                        {(() => {
                                          // Check if notes contain Local Storage URLs
                                          const urlRegex = /\/storage\/images\/[^\s,]+/g;
                                          const urls = stage.notes.match(urlRegex) || [];
                                          
                                          if (urls.length > 0) {
                                            // Extract text without URLs
                                            const textWithoutUrls = stage.notes.replace(urlRegex, '').replace(/\s+/g, ' ').trim();
                                            
                                            return (
                                              <>
                                                {textWithoutUrls && (
                                                  <p className="text-xs text-gray-600 italic mb-2">"{textWithoutUrls}"</p>
                                                )}
                                                
                                                {/* Photos from notes */}
                                                <div className="mt-2 border-0 bg-transparent">
                                                  <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                      <ImageIcon className="h-4 w-4 text-blue-600" />
                                                      <span className="text-sm font-medium text-gray-900">
                                                        Verification Photos ({urls.length})
                                                      </span>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs">
                                                      {stage.stage.replace(/_/g, ' ')}
                                                    </Badge>
                                                  </div>
                                                  
                                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                                    {urls.slice(0, 6).map((url: string, photoIndex: number) => {
                                                      const fullUrl = `${getServerBaseUrl()}${url}`;
                                                      return (
                                                      <div key={`note-photo-${photoIndex}`} className="group relative">
                                                        <div className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                                          <img
                                                            src={fullUrl}
                                                            alt={`Verification photo ${photoIndex + 1}`}
                                                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                            onError={(e) => {
                                                              }}
                                                            onLoad={() => {
                                                              }}
                                                          />
                                                        </div>
                                                        
                                                        {/* Overlay with actions */}
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                                                            <Button
                                                              size="sm"
                                                              variant="secondary"
                                                              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                                                              onClick={() => window.open(`${getServerBaseUrl()}${url}`, '_blank')}
                                                            >
                                                              <ExternalLink className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                              size="sm"
                                                              variant="secondary"
                                                              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                                                              onClick={async () => {
                                                                try {
                                                                  const response = await fetch(`${getServerBaseUrl()}${url}`);
                                                                  const blob = await response.blob();
                                                                  const downloadUrl = window.URL.createObjectURL(blob);
                                                                  const link = document.createElement('a');
                                                                  link.href = downloadUrl;
                                                                  link.download = `verification-photo-${photoIndex + 1}.jpg`;
                                                                  document.body.appendChild(link);
                                                                  link.click();
                                                                  document.body.removeChild(link);
                                                                  window.URL.revokeObjectURL(downloadUrl);
                                                                } catch (error) {
                                                                  // Fallback to direct link
                                                                  window.open(`${getServerBaseUrl()}${url}`, '_blank');
                                                                }
                                                              }}
                                                            >
                                                              <Download className="h-3 w-3" />
                                                            </Button>
                                                          </div>
                                                        </div>
                                                        
                                                        {/* Photo info */}
                                                        <div className="mt-2 text-center">
                                                          <p className="text-xs text-gray-500 truncate">
                                                            Photo {photoIndex + 1}
                                                          </p>
                                                          <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>{formatTime(stage.startTime)}</span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                      );
                                                    })}
                                                  </div>
                                                  
                                                  {urls.length > 6 && (
                                                    <div className="mt-3 text-center">
                                                      <Badge variant="secondary" className="text-xs">
                                                        +{urls.length - 6} more photos
                                                      </Badge>
                                                    </div>
                                                  )}
                                                </div>
                                              </>
                                            );
                                          } else {
                                            // No URLs, show normal notes
                                            return (
                                              <p className="text-xs text-gray-600 italic">"{stage.notes}"</p>
                                            );
                                          }
                                        })()}
                                      </div>
                                    )}
                                    {/* Stage Photos - Styled like PhotoGallery */}
                                    {stage.photos && stage.photos.length > 0 && (
                                      <div className="mt-3 border-0 bg-transparent">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2">
                                            <ImageIcon className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-medium text-gray-900">
                                              Stage Photos ({stage.photos.length})
                                            </span>
                                          </div>
                                          <Badge variant="outline" className="text-xs">
                                            {stage.stage.replace(/_/g, ' ')}
                                          </Badge>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                          {stage.photos.slice(0, 6).map((photo: any, photoIndex: number) => (
                                            <div key={photo.id} className="group relative">
                                              <div className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                                                <img
                                                  src={photo.thumbnailUrl || photo.cloudinaryUrl || photo.url || ''}
                                                  alt={`Stage photo ${photoIndex + 1}`}
                                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                  onError={(e) => {
                                                    // Fallback to a placeholder if image fails to load
                                                    const img = e.target as HTMLImageElement;
                                                    if (!img.src.includes('data:')) {
                                                      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
                                                    }
                                                  }}
                                                />
                                              </div>
                                              
                                              {/* Overlay with actions */}
                                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                                                  <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                                                    onClick={() => window.open(photo.cloudinaryUrl || photo.url || photo.thumbnailUrl || photo.dataUrl, '_blank')}
                                                  >
                                                    <ExternalLink className="h-3 w-3" />
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                                                    onClick={async () => {
                                                      try {
                                                        const imageUrl = photo.cloudinaryUrl || photo.url || photo.thumbnailUrl || photo.dataUrl;
                                                        if (!imageUrl) {
                                                          console.warn('No image URL available');
                                                          return;
                                                        }
                                                        
                                                        // Handle dataUrl directly (already base64)
                                                        if (imageUrl.startsWith('data:')) {
                                                          const link = document.createElement('a');
                                                          link.href = imageUrl;
                                                          link.download = photo.filename || 'photo';
                                                          document.body.appendChild(link);
                                                          link.click();
                                                          document.body.removeChild(link);
                                                          return;
                                                        }
                                                        
                                                        const response = await fetch(imageUrl);
                                                        const blob = await response.blob();
                                                        const downloadUrl = window.URL.createObjectURL(blob);
                                                        const link = document.createElement('a');
                                                        link.href = downloadUrl;
                                                        link.download = photo.filename || 'photo';
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                        window.URL.revokeObjectURL(downloadUrl);
                                                      } catch (error) {
                                                        console.error('Download failed:', error);
                                                        // Fallback to direct link
                                                        const imageUrl = photo.cloudinaryUrl || photo.url || photo.thumbnailUrl || photo.dataUrl;
                                                        if (imageUrl) {
                                                          window.open(imageUrl, '_blank');
                                                        }
                                                      }
                                                    }}
                                                  >
                                                    <Download className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                              </div>
                                              
                                              {/* Photo info */}
                                              <div className="mt-2 text-center">
                                                <p className="text-xs text-gray-500 truncate">
                                                  {photo.filename}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                  <Calendar className="h-3 w-3" />
                                                  <span>{new Date(photo.createdAt).toLocaleString()}</span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        
                                        {stage.photos.length > 6 && (
                                          <div className="mt-3 text-center">
                                            <Badge variant="secondary" className="text-xs">
                                              +{stage.photos.length - 6} more photos
                                            </Badge>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Ticket Status Changes in Timeline */}
                        {activity.activityType === 'TICKET_WORK' && activity.ticket?.statusHistory && activity.ticket.statusHistory.length > 0 && (
                          <div className="mt-2 ml-6 space-y-2">
                            <div className="text-xs font-medium text-gray-600 mb-1">Ticket Status Changes:</div>
                            {activity.ticket.statusHistory.map((statusChange: any, statusIndex: number) => {
                              const statusConfig = TICKET_STATUS_CONFIG[statusChange.status as keyof typeof TICKET_STATUS_CONFIG] || { label: statusChange.status, color: 'bg-gray-100 text-gray-800' };
                              return (
                                <div key={statusChange.id} className="flex items-start gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-2 h-2 rounded-full ${statusConfig.color.includes('bg-') ? statusConfig.color.split(' ')[0].replace('bg-', 'bg-') : 'bg-gray-400'}`}></div>
                                    {statusIndex < activity.ticket!.statusHistory!.length - 1 && <div className="w-0.5 h-6 bg-gray-200"></div>}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                                        {statusConfig.label}
                                      </Badge>
                                      <span className="text-gray-500">{formatTime(statusChange.changedAt)}</span>
                                      <span className="text-gray-600">by {statusChange.changedBy.name}</span>
                                    </div>
                                    {(() => {
                                      const notes: string = statusChange.notes || '';
                                      const manualFromSource = statusChange.locationSource === 'manual';
                                      const manualFromNotes = /📌 Source: ✓ Manual/.test(notes);
                                      const locMatch = notes.match(/📍 Location:\s*([^\n]+)/);
                                      const displayLocation = (manualFromNotes && locMatch ? locMatch[1].trim() : statusChange.location);
                                      if (!displayLocation) return null;
                                      return (
                                        <div className="flex items-start gap-2 mt-1">
                                          <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0 mt-0.5" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-500 break-words">{shortenAddress(displayLocation)}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                              {(manualFromSource || manualFromNotes) && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                  ✓ Manual
                                                </Badge>
                                              )}
                                              {statusChange.accuracy && statusChange.accuracy <= 100 && statusChange.locationSource === 'gps' && (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                                  ✓ Accurate ({statusChange.accuracy.toFixed(0)}m)
                                                </Badge>
                                              )}
                                              {statusChange.accuracy && statusChange.accuracy > 100 && statusChange.locationSource === 'gps' && (
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                                  ⚠ Low Accuracy ({statusChange.accuracy.toFixed(0)}m)
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                    {statusChange.notes && (
                                      <p className="text-xs text-gray-600 mt-1">{statusChange.notes}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Onsite Location History from Ticket */}
                        {activity.activityType === 'TICKET_WORK' && activity.ticket?.onsiteLocationHistory && (
                          <div className="mt-2 ml-6 space-y-2">
                            <div className="text-xs font-medium text-gray-600 mb-1">Complete Onsite Location History:</div>
                            {(() => {
                              try {
                                const locationHistory = JSON.parse(activity.ticket.onsiteLocationHistory);
                                return locationHistory.map((locationEvent: any, index: number) => {
                                  const statusConfig = TICKET_STATUS_CONFIG[locationEvent.status as keyof typeof TICKET_STATUS_CONFIG] || { label: locationEvent.status, color: 'bg-gray-100 text-gray-800' };
                                  const isManual = locationEvent.location.address && !locationEvent.location.address.match(/^\d+\.\d+,\s*\d+\.\d+$/);
                                  return (
                                    <div key={index} className="flex items-start gap-3">
                                      <div className="flex flex-col items-center">
                                        <div className={`w-2 h-2 rounded-full ${statusConfig.color.includes('bg-') ? statusConfig.color.split(' ')[0].replace('bg-', 'bg-') : 'bg-gray-400'}`}></div>
                                        {index < locationHistory.length - 1 && <div className="w-0.5 h-6 bg-gray-200"></div>}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                          <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                                            {statusConfig.label}
                                          </Badge>
                                          <span className="text-gray-500">{formatTime(locationEvent.location.timestamp)}</span>
                                        </div>
                                        <div className="flex items-start gap-2 mt-1">
                                          <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0 mt-0.5" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-500 break-words">{shortenAddress(locationEvent.location.address)}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                              {isManual && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                  ✓ Manual
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              } catch (error) {
                                return (
                                  <div className="text-xs text-red-500">
                                    Error parsing location history data
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Check-out Event */}
                {attendance.checkOutAt && (
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-red-600" />
                        <span className="font-medium">Check-out</span>
                        <span className="text-sm text-gray-500">{formatTime(attendance.checkOutAt)}</span>
                        {isAutoCheckout && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                      </div>
                      {attendance.checkOutAddress && (
                        <p className="text-sm text-gray-600 mt-1">{attendance.checkOutAddress}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                Activity History
              </CardTitle>
              <CardDescription className="text-sm">
                A timeline of all actions and changes made during this work session ({auditLogs.length} events)
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No activity history available</p>
                  <p className="text-xs text-gray-400 mt-1">
                    No actions or changes have been recorded for this work session yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log, index) => {
                    const actionConfig = AUDIT_ACTION_CONFIG[log.action as keyof typeof AUDIT_ACTION_CONFIG] || { 
                      label: log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()), 
                      color: 'bg-gray-100 text-gray-800', 
                      icon: Info 
                    };
                    const ActionIcon = actionConfig.icon;
                    
                    return (
                      <div key={log.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-all duration-200 hover:shadow-sm bg-white">
                        <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-xl ${actionConfig.color} flex-shrink-0 shadow-sm`}>
                            <ActionIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-2 min-w-0">
                            <div className="space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                                  <Badge variant="outline" className={`${actionConfig.color} border-0 font-semibold px-2.5 py-0.5`}>
                                    {actionConfig.label}
                                  </Badge>
                                  {/* Add simple description */}
                                  <span className="text-sm text-gray-700 font-medium">
                                    {log.action === 'ATTENDANCE_CHECKED_IN' && 'started their work day'}
                                    {log.action === 'ATTENDANCE_CHECKED_OUT' && 'ended their work day'}
                                    {log.action === 'ATTENDANCE_RE_CHECKED_IN' && 'resumed work after break'}
                                    {log.action === 'ACTIVITY_LOG_ADDED' && 'recorded a new activity'}
                                    {log.action === 'ACTIVITY_STAGE_UPDATED' && 'updated activity progress'}
                                    {log.action === 'AUTO_CHECKOUT_PERFORMED' && 'was automatically checked out'}
                                    {log.action === 'TICKET_STATUS_CHANGED' && 'updated ticket status'}
                                    {log.action === 'ATTENDANCE_UPDATED' && 'modified attendance record'}
                                    {log.action === 'ATTENDANCE_MANUAL_CHECKOUT' && 'session manually ended'}
                                    {log.action === 'LOCATION_UPDATED' && 'updated location info'}
                                    {log.action === 'NOTES_UPDATED' && 'added notes or comments'}
                                  </span>
                                </div>
                                <div className="text-xs font-mono text-gray-400 flex-shrink-0 bg-slate-100 px-2 py-1 rounded">
                                  {format(parseISO(log.performedAt), 'MMM dd, HH:mm:ss')}
                                </div>
                              </div>
                              
                              {log.entityType && log.entityId && (
                                <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                  {log.entityType === 'ATTENDANCE' ? 'Attendance Record' : 
                                   log.entityType === 'ACTIVITY_LOG' ? 'Activity' :
                                   log.entityType === 'TICKET' ? 'Ticket' : log.entityType} #{log.entityId}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-start gap-2 text-xs sm:text-sm">
                              <User className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
                              <div className="text-gray-600 min-w-0 break-words">
                                <span className="text-gray-500">Done by: </span>
                                {log.performedBy ? (
                                  <>
                                    <span className="font-medium text-gray-800">{log.performedBy.name}</span>
                                    {log.performedBy.email && (
                                      <span className="text-gray-500 ml-1 text-xs break-all">({log.performedBy.email})</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="font-medium text-blue-600">🤖 System (Automatic)</span>
                                )}
                              </div>
                            </div>

                            {/* Details Section */}
                            {(log.details || log.oldValue || log.newValue) && (
                              <div className="mt-2 p-2 sm:p-3 bg-gray-50 rounded-md text-xs sm:text-sm">
                                {log.details && typeof log.details === 'object' && (
                                  <div className="space-y-2">
                                    {/* Create user-friendly summary based on action type */}
                                    {log.action === 'ATTENDANCE_CHECKED_IN' && (
                                      <div className="text-xs sm:text-sm text-gray-700">
                                        <p className="font-medium">✅ Successfully checked in</p>
                                        {log.details.location && <p className="break-words">📍 Location: {log.details.location}</p>}
                                        {log.details.checkInTime && <p>🕐 Time: {format(parseISO(log.details.checkInTime as string), 'HH:mm:ss')}</p>}
                                      </div>
                                    )}
                                    
                                    {log.action === 'ATTENDANCE_CHECKED_OUT' && (
                                      <div className="text-xs sm:text-sm text-gray-700">
                                        <p className="font-medium">🚪 Successfully checked out</p>
                                        {log.details.location && <p className="break-words">📍 Location: {log.details.location}</p>}
                                        {log.details.checkOutTime && <p>🕐 Time: {format(parseISO(log.details.checkOutTime as string), 'HH:mm:ss')}</p>}
                                        {log.details.totalHours && <p>⏱️ Total Hours: {log.details.totalHours}h</p>}
                                      </div>
                                    )}
                                    
                                    {log.action === 'ACTIVITY_LOG_ADDED' && (
                                      <div className="text-xs sm:text-sm text-gray-700">
                                        <p className="font-medium">📝 New activity logged</p>
                                        {log.details.activityType && <p className="break-words">🏷️ Type: {log.details.activityType.replace(/_/g, ' ')}</p>}
                                        {log.details.title && <p className="break-words">📋 Title: {log.details.title}</p>}
                                        {log.details.location && <p className="break-words text-xs">📍 Location: {log.details.location}</p>}
                                      </div>
                                    )}
                                    
                                    {log.action === 'ACTIVITY_STAGE_UPDATED' && (
                                      <div className="text-xs sm:text-sm text-gray-700">
                                        <p className="font-medium">🔄 Activity stage changed</p>
                                        {log.details.stage && <p className="break-words">📊 New Stage: {log.details.stage.replace(/_/g, ' ')}</p>}
                                        {log.details.location && <p className="break-words text-xs">📍 Location: {log.details.location}</p>}
                                      </div>
                                    )}
                                    
                                    {log.action === 'ATTENDANCE_RE_CHECKED_IN' && (
                                      <div className="text-sm text-gray-700">
                                        <p className="font-medium">🔄 Successfully re-checked in</p>
                                        <p>💡 Reason: {log.details.reason || 'Resumed work after checkout'}</p>
                                        {log.details.location && <p>📍 Location: {log.details.location}</p>}
                                        {log.details.reCheckInTime && <p>🕐 Time: {format(parseISO(log.details.reCheckInTime as string), 'HH:mm:ss')}</p>}
                                        {log.details.notes && <p>📝 Notes: {log.details.notes}</p>}
                                      </div>
                                    )}
                                    
                                    {log.action === 'AUTO_CHECKOUT_PERFORMED' && (
                                      <div className="text-sm text-gray-700">
                                        <p className="font-medium">⚡ System performed automatic checkout</p>
                                        <p>🤖 Reason: End of work day reached</p>
                                        {log.details.checkOutTime && <p>🕐 Time: {format(parseISO(log.details.checkOutTime as string), 'HH:mm:ss')}</p>}
                                      </div>
                                    )}
                                    
                                    {/* Fallback for other actions - show formatted details */}
                                    {!['ATTENDANCE_CHECKED_IN', 'ATTENDANCE_CHECKED_OUT', 'ATTENDANCE_RE_CHECKED_IN', 'ACTIVITY_LOG_ADDED', 'ACTIVITY_STAGE_UPDATED', 'AUTO_CHECKOUT_PERFORMED'].includes(log.action) && (
                                      <div className="space-y-1">
                                        {Object.entries(log.details).map(([key, value]) => {
                                          // Skip null/undefined values
                                          if (value === null || value === undefined) return null;
                                          
                                          // Format key for display
                                          const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                          
                                          // Format value for display
                                          let displayValue: string;
                                          if (typeof value === 'object') {
                                            displayValue = JSON.stringify(value);
                                            // Truncate long JSON
                                            if (displayValue.length > 100) {
                                              displayValue = displayValue.substring(0, 100) + '...';
                                            }
                                          } else {
                                            displayValue = String(value);
                                            // Truncate long strings
                                            if (displayValue.length > 80) {
                                              displayValue = displayValue.substring(0, 80) + '...';
                                            }
                                          }
                                          
                                          return (
                                            <div key={key} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                                              <span className="font-medium text-gray-600 text-xs">{displayKey}:</span>
                                              <span className="text-gray-800 text-xs break-all font-mono bg-gray-50 px-1 rounded">{displayValue}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {log.details && typeof log.details === 'string' && (
                                  <div className="text-xs text-gray-600 font-mono bg-gray-100 p-2 rounded break-all overflow-hidden">
                                    {log.details.length > 200 ? log.details.substring(0, 200) + '...' : log.details}
                                  </div>
                                )}
                              </div>
                            )}

                            {log.status && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Status:</span>
                                <Badge variant="outline" className="text-xs">
                                  {log.status}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
