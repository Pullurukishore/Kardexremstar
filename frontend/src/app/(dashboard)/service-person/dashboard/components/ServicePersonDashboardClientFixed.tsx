'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/api-client';
import { toast } from 'sonner';
import CleanAttendanceWidget from '@/components/attendance/CleanAttendanceWidget';
import TicketStatusDialogWithLocation from '@/components/tickets/TicketStatusDialogWithLocation';
import ActivityLogger from '@/components/activity/ActivityLogger';
import ActivityStatusManager from '@/components/activity/ActivityStatusManager';
import ServicePersonSchedules from '@/components/service-person/ServicePersonSchedules';
import { LocationResult } from '@/services/LocationService';
import { 
  Calendar, 
  CheckCircle2, 
  Activity, 
  ChevronDown, 
  PlayCircle,
  CalendarCheck,
  RefreshCw,
  Briefcase,
  Bell
} from 'lucide-react';

// Types
interface DashboardStats {
  activeActivities: number;
  pendingSchedules: number;
  acceptedSchedules: number;
  completedToday: number;
}

interface ActivityStage {
  id: number;
  stage: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  location?: string;
  notes?: string;
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
    priority: string;
  };
  ActivityStage?: ActivityStage[];
}

interface Ticket {
  id: number;
  title: string;
  status: string;
  priority: string;
  customer?: {
    companyName: string;
    address?: string;
  };
  asset?: {
    serialNo: string;
    model: string;
    location?: string;
  };
  createdAt: string;
  dueDate?: string;
}

interface ServicePersonDashboardClientProps {
  initialLocation?: LocationResult | null;
  initialAttendanceData?: any;
}

export default function ServicePersonDashboardClientFixed({ initialLocation, initialAttendanceData }: ServicePersonDashboardClientProps) {
  const { user } = useAuth();
  
  // Prevent horizontal scrolling on mobile
  useEffect(() => {
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.maxWidth = '100vw';
    document.documentElement.style.maxWidth = '100vw';
    
    return () => {
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
      document.body.style.maxWidth = '';
      document.documentElement.style.maxWidth = '';
    };
  }, []);
  
  // State
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeActivities: 0,
    pendingSchedules: 0,
    acceptedSchedules: 0,
    completedToday: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(initialAttendanceData || null);
  const [isLoading, setIsLoading] = useState(!initialAttendanceData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedRef = useRef<boolean>(Boolean(initialAttendanceData));
  const loadErrorShownRef = useRef<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    activities: false,
    createActivity: false,
    schedules: false,
  });

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      if (!hasLoadedRef.current) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      // Fetch all data in parallel
      const [activitiesResponse, schedulesResponse, attendanceResponse] = await Promise.allSettled([
        apiClient.get('/activities?limit=50&includeStages=true&includeTicket=true'),
        apiClient.get('/activity-schedule?status=PENDING,ACCEPTED'),
        apiClient.get('/attendance/status'),
      ]);

      // Handle activities response
      let activitiesData = [];
      if (activitiesResponse.status === 'fulfilled') {
        const responseData = activitiesResponse.value as any;
        if (responseData?.activities) {
          activitiesData = responseData.activities;
        } else if (Array.isArray(responseData)) {
          activitiesData = responseData;
        }
      }
      setActivities(activitiesData);

      // Handle schedules response
      let schedulesData: any[] = [];
      if (schedulesResponse.status === 'fulfilled') {
        const schedulesResponseData = schedulesResponse.value as any;
        if (schedulesResponseData?.data) {
          schedulesData = schedulesResponseData.data;
        } else if (Array.isArray(schedulesResponseData)) {
          schedulesData = schedulesResponseData;
        }
      }
      setSchedules(schedulesData);

      // Handle attendance response
      if (attendanceResponse.status === 'fulfilled') {
        const attendanceData = attendanceResponse.value as any;
        setAttendanceStatus((prev: any) => {
          const newData = attendanceData ? JSON.parse(JSON.stringify(attendanceData)) : null;
          if (JSON.stringify(prev) !== JSON.stringify(newData)) {
            return newData;
          }
          return prev;
        });
      }

      // Calculate stats
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const activeActivities = activitiesData.filter((a: any) => !a.endTime).length;
      const completedToday = activitiesData.filter((a: any) => {
        if (!a.endTime) return false;
        const end = new Date(a.endTime);
        return end >= startOfToday && end <= endOfToday;
      }).length;
      
      // Count pending and accepted schedules
      const pendingSchedules = schedulesData.filter((s: any) => s.status === 'PENDING').length;
      const acceptedSchedules = schedulesData.filter((s: any) => s.status === 'ACCEPTED').length;

      setDashboardStats({
        activeActivities,
        pendingSchedules,
        acceptedSchedules,
        completedToday,
      });

    } catch (error) {
      if (!loadErrorShownRef.current) {
        toast.error('Failed to load dashboard data');
        loadErrorShownRef.current = true;
      }
    } finally {
      if (!hasLoadedRef.current) {
        setIsLoading(false);
        hasLoadedRef.current = true;
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleActivityChange = useCallback(async () => {
    setTimeout(async () => {
      try {
        await fetchDashboardData();
      } catch (error) {}
    }, 1000);
  }, [fetchDashboardData]);

  const handleAttendanceChange = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  const handleStatusDialogClose = () => {
    setSelectedTicket(null);
    setShowStatusDialog(false);
  };

  const handleStatusUpdate = async () => {
    await fetchDashboardData();
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background elements */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20"></div>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.08),_transparent_50%)]"></div>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.08),_transparent_50%)]"></div>
        
        {/* Floating orbs */}
        <div className="fixed top-20 left-10 w-72 h-72 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="fixed bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="text-center relative z-10">
          <div className="relative mb-8">
            {/* Animated spinner */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-400 border-l-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              <div className="absolute inset-4 rounded-full border-4 border-transparent border-t-indigo-300 border-r-purple-300 animate-spin" style={{ animationDuration: '2s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Loading Service Dashboard
            </h2>
            <p className="text-gray-600 animate-pulse font-medium">Preparing your workspace...</p>
            <div className="flex items-center justify-center space-x-2 mt-6">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-lg shadow-blue-500/50"></div>
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce shadow-lg shadow-indigo-500/50" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce shadow-lg shadow-purple-500/50" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe overflow-x-hidden w-full max-w-full relative">
      {/* Premium Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 -z-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.06),_transparent_50%)] -z-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.06),_transparent_50%)] -z-10"></div>
      
      {/* Floating decorative orbs */}
      <div className="fixed top-20 left-10 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-32 right-10 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>
      <div className="fixed top-1/2 left-1/3 w-72 h-72 bg-gradient-to-br from-indigo-400/5 to-blue-400/5 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '0.5s' }}></div>
      
      {/* Premium Header */}
      <header className="relative bg-gradient-to-r from-[#3d5a78] via-[#507295] to-[#6889ab] text-white overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCA0IDYuMjY4IDE0IDE0LTYuMjY4IDE0LTE0IDE0eiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvZz48L3N2Zz4=')] opacity-50"></div>
        </div>
        
        <div className="relative z-10 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="max-w-7xl mx-auto">
            {/* Mobile Layout */}
            <div className="sm:hidden space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-lg">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">Service Dashboard</h1>
                    <p className="text-white/70 text-xs font-medium">Field Operations</p>
                  </div>
                </div>
                {/* Status Badge */}
                {attendanceStatus && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm border text-xs font-semibold transition-all ${
                    attendanceStatus.isCheckedIn 
                      ? 'bg-green-500/20 border-green-400/50 text-green-100' 
                      : 'bg-white/10 border-white/30 text-white/80'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${attendanceStatus.isCheckedIn ? 'bg-green-400 animate-pulse' : 'bg-white/50'}`}></div>
                    <span>{attendanceStatus.isCheckedIn ? 'Active' : 'Off Duty'}</span>
                  </div>
                )}
              </div>
              <p className="text-white/80 text-sm font-medium">
                👋 Welcome, <span className="text-white font-bold">{user?.name?.split(' ')[0] || 'Service Person'}</span>
              </p>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                  <Briefcase className="w-7 h-7 lg:w-8 lg:h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Service Dashboard</h1>
                    {/* Status Badge */}
                    {attendanceStatus && (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border transition-all ${
                        attendanceStatus.isCheckedIn 
                          ? 'bg-green-500/20 border-green-400/50' 
                          : 'bg-white/10 border-white/30'
                      }`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${attendanceStatus.isCheckedIn ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' : 'bg-white/50'}`}></div>
                        <span className={`text-sm font-semibold ${attendanceStatus.isCheckedIn ? 'text-green-100' : 'text-white/80'}`}>
                          {attendanceStatus.isCheckedIn ? (
                            <>🟢 Active • {attendanceStatus.attendance?.checkInAt ? 
                              new Date(attendanceStatus.attendance.checkInAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }) : 'Working'
                            }</>
                          ) : '⚪ Off Duty'}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-white/80 text-sm lg:text-base mt-1">
                    👋 Welcome back, <span className="text-white font-bold">{user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Service Person'}</span>
                  </p>
                </div>
              </div>
              
              {/* Date Card */}
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/30 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm lg:text-base">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-white/70 text-xs lg:text-sm">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats Bar */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {/* Active Activities */}
            <div className="group bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">Active</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{dashboardStats.activeActivities}</p>
                </div>
              </div>
            </div>

            {/* Pending Schedules - Needs Attention */}
            <div className="group bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden">
              {dashboardStats.pendingSchedules > 0 && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                  </span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">Pending</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{dashboardStats.pendingSchedules}</p>
                </div>
              </div>
            </div>

            {/* Accepted Schedules */}
            <div className="group bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                  <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">Accepted</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{dashboardStats.acceptedSchedules}</p>
                </div>
              </div>
            </div>

            {/* Completed Today */}
            <div className="group bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">Done Today</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{dashboardStats.completedToday}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          
          {/* New Assignment Alert Banner */}
          {dashboardStats.pendingSchedules > 0 && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-4 sm:p-5 shadow-lg shadow-orange-500/25 animate-fade-in">
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              </div>
              
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 flex-shrink-0">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base sm:text-lg">
                      New Assignment{dashboardStats.pendingSchedules > 1 ? 's' : ''}
                    </h3>
                    <p className="text-white/80 text-xs sm:text-sm">
                      You have {dashboardStats.pendingSchedules} scheduled activit{dashboardStats.pendingSchedules > 1 ? 'ies' : 'y'} awaiting your response
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setExpandedSections(prev => ({ ...prev, schedules: true }));
                      setTimeout(() => {
                        document.getElementById('schedules-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                    className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-white text-orange-600 rounded-xl font-semibold text-sm hover:bg-orange-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Review & Respond</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Attendance Widget */}
          <div className="group bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/50 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 to-indigo-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl sm:rounded-3xl"></div>
            <div className="relative">
              <CleanAttendanceWidget 
                onStatusChange={handleAttendanceChange}
                initialData={attendanceStatus}
              />
            </div>
          </div>

          {/* Create Activity Section */}
          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/50 shadow-xl overflow-hidden">
            <button
              onClick={() => toggleSection('createActivity')}
              className="relative w-full p-4 sm:p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <PlayCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Create New Activity</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">Start tracking a task or activity</p>
                </div>
              </div>
              <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-xl flex items-center justify-center transition-transform duration-300 ${expandedSections.createActivity ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
            </button>
            
            {/* Expanded Content */}
            <div className={`transition-all duration-300 ease-in-out ${expandedSections.createActivity ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <div className="border-t border-gray-100 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
                {/* Active Activities Section */}
                {activities.filter(a => !a.endTime && a.ActivityStage?.some((stage: ActivityStage) => !stage.endTime)).length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-100/50">
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <span>Active Activities</span>
                      <span className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                        {activities.filter(a => !a.endTime && a.ActivityStage?.some((stage: ActivityStage) => !stage.endTime)).length}
                      </span>
                    </h4>
                    <ActivityStatusManager 
                      activities={activities.filter(a => !a.endTime && a.ActivityStage?.some((stage: ActivityStage) => !stage.endTime))}
                      onActivityChange={handleActivityChange}
                    />
                  </div>
                )}
                
                {/* Create New Activity Form */}
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                      <PlayCircle className="w-4 h-4 text-white" />
                    </div>
                    <span>New Activity</span>
                  </h4>
                  <ActivityLogger 
                    activities={activities}
                    onActivityChange={handleActivityChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Scheduled Activities Section */}
          <div id="schedules-section" className="relative bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/50 shadow-xl overflow-hidden">
            <button
              onClick={() => toggleSection('schedules')}
              className="relative w-full p-4 sm:p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <CalendarCheck className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Scheduled Activities</h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">View your scheduled tasks</p>
                </div>
              </div>
              <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-xl flex items-center justify-center transition-transform duration-300 ${expandedSections.schedules ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
            </button>
            
            {/* Expanded Content */}
            <div className={`transition-all duration-300 ease-in-out ${expandedSections.schedules ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <div className="border-t border-gray-100 p-4 sm:p-6 lg:p-8">
                <ServicePersonSchedules />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Refreshing Overlay */}
      {isRefreshing && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 px-5 py-3 flex items-center gap-3">
            <div className="relative">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
            </div>
            <span className="text-sm text-gray-700 font-semibold">Updating...</span>
          </div>
        </div>
      )}

      {/* Ticket Status Dialog */}
      <TicketStatusDialogWithLocation
        ticket={selectedTicket ? {
          id: selectedTicket.id,
          title: selectedTicket.title,
          status: selectedTicket.status,
          priority: selectedTicket.priority,
          customer: selectedTicket.customer ? {
            companyName: selectedTicket.customer.companyName
          } : undefined,
          asset: selectedTicket.asset ? {
            serialNumber: selectedTicket.asset.serialNo || 'N/A',
            model: selectedTicket.asset.model || 'N/A'
          } : undefined
        } : null}
        isOpen={showStatusDialog}
        onClose={handleStatusDialogClose}
        onStatusUpdate={handleStatusUpdate}
        accuracyThreshold={50}
      />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
