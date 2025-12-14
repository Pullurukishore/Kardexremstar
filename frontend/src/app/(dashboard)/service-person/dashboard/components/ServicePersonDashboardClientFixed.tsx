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

// Types
interface DashboardStats {
  activeActivities: number;
  assignedTickets: number;
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

const STATUS_CONFIG = {
  'OPEN': { color: 'bg-blue-100 text-blue-800', icon: '📋' },
  'ASSIGNED': { color: 'bg-yellow-100 text-yellow-800', icon: '👤' },
  'IN_PROGRESS': { color: 'bg-orange-100 text-orange-800', icon: '🔧' },
  'ONSITE_VISIT_STARTED': { color: 'bg-purple-100 text-purple-800', icon: '🚗' },
  'ONSITE_VISIT_REACHED': { color: 'bg-indigo-100 text-indigo-800', icon: '📍' },
  'ONSITE_VISIT_IN_PROGRESS': { color: 'bg-pink-100 text-pink-800', icon: '🔨' },
  'ONSITE_VISIT_RESOLVED': { color: 'bg-teal-100 text-teal-800', icon: '✅' },
  'RESOLVED': { color: 'bg-green-100 text-green-800', icon: '✅' },
  'CLOSED': { color: 'bg-gray-100 text-gray-800', icon: '🔒' },
  'CANCELLED': { color: 'bg-red-100 text-red-800', icon: '❌' },
  'WAITING_CUSTOMER': { color: 'bg-amber-100 text-amber-800', icon: '⏳' },
};

const PRIORITY_CONFIG = {
  'CRITICAL': { color: 'bg-red-100 text-red-800', icon: '🚨' },
  'HIGH': { color: 'bg-orange-100 text-orange-800', icon: '⚠️' },
  'MEDIUM': { color: 'bg-yellow-100 text-yellow-800', icon: '📋' },
  'LOW': { color: 'bg-green-100 text-green-800', icon: '📝' },
};

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
  
  // Removed tab state - using unified dashboard
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    activeActivities: 0,
    assignedTickets: 0,
    completedToday: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(initialAttendanceData || null);
  const [isLoading, setIsLoading] = useState(!initialAttendanceData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedRef = useRef<boolean>(Boolean(initialAttendanceData));
  const loadErrorShownRef = useRef<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showNewActivityDialog, setShowNewActivityDialog] = useState(false);
  
  // Mobile-specific state
  const [expandedSections, setExpandedSections] = useState({
    activities: false,
    createActivity: false,
    schedules: false,
  });
  const [ticketsPage, setTicketsPage] = useState(1);
  const [selectedTicketForSheet, setSelectedTicketForSheet] = useState<Ticket | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const TICKETS_PER_PAGE = 5;

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      if (!hasLoadedRef.current) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      // Fetch all data in parallel with individual error handling
      const [activitiesResponse, ticketsResponse, attendanceResponse] = await Promise.allSettled([
        apiClient.get('/activities?limit=50&includeStages=true&includeTicket=true'),
        apiClient.get('/tickets?filter=assigned-to-service-person&limit=50'),
        apiClient.get('/attendance/status'),
      ]);

      // Handle activities response
      let activitiesData = [];
      if (activitiesResponse.status === 'fulfilled') {
        // The response is directly the data, not wrapped in .data
        const responseData = activitiesResponse.value as any;
        if (responseData?.activities) {
          activitiesData = responseData.activities;
          } else if (Array.isArray(responseData)) {
          activitiesData = responseData;
        }
      } else {
        }
      setActivities(activitiesData);

      // Handle tickets response
      let ticketsData = [];
      if (ticketsResponse.status === 'fulfilled') {
        // Check if tickets response is also direct (not wrapped in .data)
        const ticketsResponseData = ticketsResponse.value as any;
        if (ticketsResponseData?.data) {
          ticketsData = ticketsResponseData.data;
        } else if (Array.isArray(ticketsResponseData)) {
          ticketsData = ticketsResponseData;
        }
        
        // Filter out closed tickets - only show active tickets
        ticketsData = ticketsData.filter((ticket: any) => 
          ticket.status !== 'CLOSED' && 
          ticket.status !== 'RESOLVED' && 
          ticket.status !== 'CANCELLED'
        );
      } else {
        }
      setTickets(ticketsData);
      // Debug: Check if contact data is present
      if (ticketsData.length > 0) {
        }

      // Handle attendance response
      if (attendanceResponse.status === 'fulfilled') {
        const attendanceData = attendanceResponse.value as any;
        // Force state update with new object reference to ensure React detects the change
        setAttendanceStatus((prev: any) => {
          const newData = attendanceData ? JSON.parse(JSON.stringify(attendanceData)) : null;
          // Only update if data actually changed to prevent unnecessary re-renders
          if (JSON.stringify(prev) !== JSON.stringify(newData)) {
            return newData;
          }
          return prev;
        });
      } else {
        }

      // Use the extracted data for stats computation

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Active activities: no endTime (including WORK_FROM_HOME)
      const activeActivities = activitiesData.filter((a: any) => !a.endTime).length;

      // Completed today: activities that ended today
      const completedToday = activitiesData.filter((a: any) => {
        if (!a.endTime) return false;
        const end = new Date(a.endTime);
        return end >= startOfToday && end <= endOfToday;
      }).length;

      const stats = {
        activeActivities,
        assignedTickets: ticketsData.length,
        completedToday,
      };

      setDashboardStats(stats);

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
    
    // Set up periodic refresh for active activities (every 5 minutes)
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Log initial attendance data for debugging
  useEffect(() => {
    }, [initialAttendanceData, attendanceStatus]);

  const handleActivityChange = useCallback(async () => {
    // Add a longer delay to ensure backend has processed activity change and local state updates are visible
    setTimeout(async () => {
      try {
        await fetchDashboardData();
        } catch (error) {
        }
    }, 1000); // Reduced delay for better responsiveness while still allowing local state updates
  }, [fetchDashboardData]);

  const handleAttendanceChange = useCallback(async () => {
    // Refresh dashboard data instead of reloading the page
    await fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTicketStatusUpdate = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowStatusDialog(true);
  };

  const handleStatusDialogClose = () => {
    setSelectedTicket(null);
    setShowStatusDialog(false);
  };

  const handleStatusUpdate = async () => {
    // Refresh dashboard data instead of reloading the page
    await fetchDashboardData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Modern Background */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.05),_transparent_50%)] pointer-events-none"></div>
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.05),_transparent_50%)] pointer-events-none"></div>
        
        {/* Floating Orbs */}
        <div className="fixed top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
        <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400/5 rounded-full blur-3xl animate-pulse delay-500 pointer-events-none"></div>
        
        <div className="text-center relative z-10">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-blue-500 border-r-purple-500 mx-auto shadow-lg"></div>
            <div className="absolute inset-2 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-b-blue-400 border-l-purple-400 animate-reverse"></div>
            <div className="absolute inset-4 animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-blue-300 border-r-purple-300"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-3xl">🛠️</div>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Loading Service Dashboard</h2>
            <p className="text-gray-600 animate-pulse font-medium">Preparing your workspace...</p>
            <div className="flex items-center justify-center space-x-2 mt-6">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm"></div>
              <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce delay-100 shadow-sm"></div>
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-200 shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pb-safe overflow-x-hidden w-full max-w-full relative">
      {/* Modern Background Pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.05),_transparent_50%)] pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.05),_transparent_50%)] pointer-events-none"></div>
      
      {/* Floating Orbs for Depth */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400/5 rounded-full blur-3xl animate-pulse delay-500 pointer-events-none"></div>
      
      {/* Mobile-Optimized Header with Glassmorphism */}
      <div className="relative bg-white/80 backdrop-blur-xl border-b border-gray-200/50 text-gray-800 px-4 py-3 sm:px-6 sm:py-6 shadow-lg sticky top-0 z-50 w-full box-border">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5"></div>
        
        <div className="max-w-7xl mx-auto w-full relative">
          {/* Mobile Header - Compact */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex-shrink-0">
                  <span className="text-white text-base">🛠️</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-gray-900 truncate">Service Dashboard</h1>
                  <p className="text-xs text-gray-500">Field Operations</p>
                </div>
              </div>
              {/* Attendance Status Badge - Mobile */}
              {attendanceStatus && (
                <div className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                  attendanceStatus.isCheckedIn 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-gray-100 border-gray-200 text-gray-600'
                }`}>
                  {attendanceStatus.isCheckedIn ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span>Off</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-600 font-medium">
              👋 Welcome, <span className="font-bold text-gray-900">{user?.name?.split(' ')[0] || 'Service Person'}</span>
            </p>
          </div>

          {/* Desktop Header - Full */}
          <div className="hidden sm:block">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1.5 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full shadow-lg shadow-blue-500/30"></div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                      <span className="text-white text-lg font-bold">🛠️</span>
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                        Service Dashboard
                      </h1>
                      <p className="text-sm text-gray-500 font-medium">
                        Field Operations Center
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-gray-600 font-medium">
                    👋 Welcome back, <span className="font-bold text-gray-900">{user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Service Person'}</span>
                  </p>
                  {/* Attendance Status Badge - Desktop */}
                  {attendanceStatus && (
                    <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full border transition-all duration-300 ${
                      attendanceStatus.isCheckedIn 
                        ? 'bg-green-50 border-green-200 text-green-700 shadow-sm shadow-green-500/20' 
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}>
                      {attendanceStatus.isCheckedIn ? (
                        <>
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                          <span className="text-sm font-semibold">
                            🟢 Active • {attendanceStatus.attendance?.checkInAt ? 
                              new Date(attendanceStatus.attendance.checkInAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              }) : 'Working'
                            }
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                          <span className="text-sm font-medium">⚪ Off Duty</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 flex-shrink-0 min-w-0">
                {/* Date Card */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                      <span className="text-white text-lg">📅</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {new Date().toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Modern Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12 sm:px-6 w-full box-border relative z-10">
        <div className="space-y-6 sm:space-y-8 w-full">
          {/* Modern Attendance Widget */}
          <div className="group bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300" data-section="attendance">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative">
              <CleanAttendanceWidget 
                onStatusChange={handleAttendanceChange}
                initialData={attendanceStatus}
              />
            </div>
          </div>

          {/* Collapsible Create New Activity with Stages */}
          <div className="group relative bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl shadow-lg border border-emerald-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300" data-section="new-activity">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, createActivity: !prev.createActivity }))}
                className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-green-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg">
                    <span className="text-white text-2xl">➕</span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Create New Activity</h3>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Start tracking a task</p>
                  </div>
                </div>
                <div className={`text-2xl transition-transform duration-300 ${expandedSections.createActivity ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </button>
              {expandedSections.createActivity && (
                <div className="border-t border-emerald-200/50 p-6 sm:p-8 space-y-8">
                  {/* Active Activities Section */}
                  {activities.filter(a => !a.endTime && a.ActivityStage?.some((stage: ActivityStage) => !stage.endTime)).length > 0 && (
                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-emerald-200/30">
                      <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-lg">🔄</span>
                        Active Activities ({activities.filter(a => !a.endTime && a.ActivityStage?.some((stage: ActivityStage) => !stage.endTime)).length})
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
                      <span className="text-lg">➕</span>
                      New Activity
                    </h4>
                    <ActivityLogger 
                      activities={activities}
                      onActivityChange={handleActivityChange}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Scheduled Activities Section */}
          <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative">
              <button
                onClick={() => setExpandedSections(prev => ({ ...prev, schedules: !prev.schedules }))}
                className="w-full p-6 sm:p-8 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-3 rounded-xl shadow-lg">
                    <span className="text-white text-2xl">📅</span>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Scheduled Activities</h3>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">Your scheduled tasks</p>
                  </div>
                </div>
                <div className={`text-2xl transition-transform duration-300 ${expandedSections.schedules ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </button>
              {expandedSections.schedules && (
                <div className="border-t border-gray-200/50 p-6 sm:p-8 space-y-8">
                  {/* Scheduled Activities Component */}
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-lg">📅</span>
                      Scheduled Tasks
                    </h4>
                    <ServicePersonSchedules />
                  </div>

                </div>
              )}
            </div>
          </div>


          </div>
      </div>

      {/* Modern Refreshing Overlay */}
      {isRefreshing && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm text-gray-600 font-medium">Updating dashboard...</span>
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

    </div>
  );
}
