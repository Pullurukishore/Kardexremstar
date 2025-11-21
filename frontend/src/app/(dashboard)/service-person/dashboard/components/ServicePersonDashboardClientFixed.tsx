'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api/api-client';
import { toast } from 'sonner';
import CleanAttendanceWidget from '@/components/attendance/CleanAttendanceWidget';
import TicketStatusDialogWithLocation from '@/components/tickets/TicketStatusDialogWithLocation';
import ActivityLogger from '@/components/activity/ActivityLogger';
import ActivityStatusManager from '@/components/activity/ActivityStatusManager';
import { LocationResult } from '@/services/LocationService';

// Types
interface DashboardStats {
  activeActivities: number;
  assignedTickets: number;
  completedToday: number;
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
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showNewActivityDialog, setShowNewActivityDialog] = useState(false);

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
      toast.error('Failed to load dashboard data');
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
    // Add a small delay to ensure backend has processed the activity change
    setTimeout(async () => {
      try {
        await fetchDashboardData();
        } catch (error) {
        }
    }, 200); // Reduced delay for better responsiveness
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
      
      {/* Modern Header with Glassmorphism */}
      <div className="relative bg-white/80 backdrop-blur-xl border-b border-gray-200/50 text-gray-800 px-4 py-4 sm:px-6 sm:py-6 shadow-lg sticky top-0 z-50 w-full box-border">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5"></div>
        
        <div className="max-w-7xl mx-auto w-full relative">
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
                {/* Modern Attendance Status Badge */}
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
              {/* Modern Date Card */}
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
              {/* Modern Location Badge */}
              {attendanceStatus?.attendance && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-2.5 max-w-[200px]" 
                     title={attendanceStatus.isCheckedIn 
                       ? (attendanceStatus.attendance.checkInAddress || 'Location not available')
                       : (attendanceStatus.attendance.checkOutAddress || attendanceStatus.attendance.checkInAddress || 'Location not available')}>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500 text-sm">📍</span>
                    <p className="text-xs text-gray-600 font-medium truncate">
                      {attendanceStatus.isCheckedIn 
                        ? (attendanceStatus.attendance.checkInAddress || 'Location not available')
                        : (attendanceStatus.attendance.checkOutAddress || attendanceStatus.attendance.checkInAddress || 'Location not available')
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 mt-8 mb-8 sm:px-6 w-full box-border relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full">
          {/* Active Activities Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 overflow-hidden hover:shadow-2xl hover:border-blue-300/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg">
                  <span className="text-white text-2xl">🔄</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Active Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardStats.activeActivities}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">In Progress</span>
              </div>
            </div>
          </div>
          
          {/* Assigned Tickets Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 overflow-hidden hover:shadow-2xl hover:border-amber-300/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400/10 to-amber-400/10 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
                  <span className="text-white text-2xl">🎫</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Assigned</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardStats.assignedTickets}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-amber-600">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium">Pending Work</span>
              </div>
            </div>
          </div>
          
          {/* Completed Today Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 overflow-hidden hover:shadow-2xl hover:border-purple-300/50 transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-violet-400/10 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-3 rounded-xl shadow-lg">
                  <span className="text-white text-2xl">✅</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardStats.completedToday}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-purple-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium">Today's Tasks</span>
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

          {/* Modern Activity Status Manager */}
          <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300" data-section="activities">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                  <span className="text-white text-2xl">🔄</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Active Activities</h3>
                  <p className="text-sm text-gray-500 font-medium">Manage your ongoing tasks</p>
                </div>
              </div>
              <ActivityStatusManager 
                activities={activities.filter(a => !a.endTime)}
                onActivityChange={handleActivityChange}
              />
            </div>
          </div>

          {/* Modern Create New Activity */}
          <div className="group relative bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl shadow-lg border border-emerald-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300" data-section="new-activity">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg">
                  <span className="text-white text-2xl">➕</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Create New Activity</h3>
                  <p className="text-sm text-gray-600 font-medium">Start tracking a new task</p>
                </div>
              </div>
              <ActivityLogger 
                activities={activities}
                onActivityChange={handleActivityChange}
              />
            </div>
          </div>

          {/* Modern Assigned Tickets Section */}
          <div className="group relative bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50/30 to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-3 rounded-xl shadow-lg">
                    <span className="text-white text-2xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Active Tickets</h3>
                    <p className="text-sm text-gray-600 font-medium">Your assigned work orders</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-rose-100 to-pink-100 px-4 py-2 rounded-full border-2 border-rose-200">
                  <span className="text-sm font-bold text-rose-700">{tickets.length}</span>
                </div>
              </div>
              {tickets.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="text-6xl mb-4 opacity-50">📋</div>
                  <p className="text-gray-600 text-base font-semibold">No tickets assigned yet</p>
                  <p className="text-gray-400 text-sm mt-2">New tickets will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="group relative bg-white border border-gray-200/50 rounded-2xl p-5 hover:shadow-xl hover:border-blue-400/50 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                      {/* Decorative gradient overlay */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      
                      <div className="relative">
                        {/* Modern Header with ID and Priority */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 flex-shrink-0">
                              #{ticket.id}
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold truncate shadow-sm ${PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG]?.color || 'bg-gray-100 text-gray-800'}`}>
                              <span className="mr-1">{PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG]?.icon}</span>
                              {ticket.priority}
                            </span>
                          </div>
                          <div className="bg-gray-100 px-2 py-1 rounded-lg text-xs text-gray-600 font-bold flex-shrink-0 ml-2">
                            {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>

                        {/* Modern Status Badge */}
                        <div className="mb-3">
                          <div className={`inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold w-full justify-center shadow-md ${STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-800'} border-2 border-opacity-50`}>
                            <span className="mr-1.5 text-base">{STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]?.icon}</span>
                            <span className="truncate uppercase tracking-wide">{ticket.status.replace(/_/g, ' ')}</span>
                          </div>
                        </div>

                        {/* Modern Title */}
                        <h4 className="text-base font-bold text-gray-900 mb-3 line-clamp-2 leading-snug min-h-[2.5rem]">
                          {ticket.title}
                        </h4>

                        {/* Modern Key Info */}
                        <div className="space-y-2 text-xs">
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-3 space-y-2 border border-gray-200/50">
                          <div className="flex items-start gap-1">
                            <span className="text-gray-400 flex-shrink-0 mt-0.5">🏢</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-600 text-xs mb-0.5">Customer</div>
                              <div className="text-gray-800 text-xs break-words">{ticket.customer?.companyName || 'N/A'}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-1">
                            <span className="text-gray-400 flex-shrink-0 mt-0.5">⚙️</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-600 text-xs mb-0.5">Asset</div>
                              <div className="text-gray-800 text-xs break-words">{ticket.asset?.model || 'N/A'}</div>
                            </div>
                          </div>
                          {ticket.asset?.serialNo && (
                            <div className="flex items-start gap-1">
                              <span className="text-gray-400 flex-shrink-0 mt-0.5">🔢</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-600 text-xs mb-0.5">Serial</div>
                                <div className="font-mono bg-white px-1.5 py-0.5 rounded text-xs border break-all">
                                  {ticket.asset.serialNo}
                                </div>
                              </div>
                            </div>
                          )}
                          {(ticket.asset?.location || ticket.customer?.address) && (
                            <div className="flex items-start gap-1">
                              <span className="text-gray-400 flex-shrink-0 mt-0.5">📍</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-600 text-xs mb-0.5">Location</div>
                                <div className="text-gray-800 text-xs leading-relaxed break-words">
                                  {ticket.asset?.location || ticket.customer?.address}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Contact Person Details */}
                          {(() => {
                            const ticketWithContact = ticket as any;
                            const contactPerson = ticketWithContact.contact;
                            
                            if (!contactPerson) {
                              return (
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 flex-shrink-0 mt-0.5">👤</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-600 text-xs mb-0.5">Contact Person</div>
                                    <div className="text-gray-800 text-xs break-words">
                                      <div className="font-medium text-gray-400">
                                        Contact info not available
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="flex items-start gap-1">
                                <span className="text-gray-400 flex-shrink-0 mt-0.5">👤</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-600 text-xs mb-0.5">Contact Person</div>
                                  <div className="text-gray-800 text-xs break-words">
                                    <div className="font-medium">
                                      {contactPerson.name || 'N/A'}
                                    </div>
                                    {contactPerson.phone && (
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-gray-400">📞</span>
                                        <a 
                                          href={`tel:${contactPerson.phone}`}
                                          className="text-blue-600 hover:text-blue-800 font-mono text-xs"
                                        >
                                          {contactPerson.phone}
                                        </a>
                                      </div>
                                    )}
                                    {contactPerson.email && (
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-gray-400">✉️</span>
                                        <a 
                                          href={`mailto:${contactPerson.email}`}
                                          className="text-blue-600 hover:text-blue-800 text-xs break-all"
                                        >
                                          {contactPerson.email}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          </div>
                        </div>
                        
                        {/* Modern Action Button */}
                        <div className="mt-4 pt-4 border-t border-gray-200/50">
                          <button
                            onClick={() => handleTicketStatusUpdate(ticket)}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                          >
                            Update Status
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
