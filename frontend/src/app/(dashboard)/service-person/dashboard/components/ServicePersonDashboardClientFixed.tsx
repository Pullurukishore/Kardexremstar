'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  todayHours: number;
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
  // Removed tab state - using unified dashboard
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    todayHours: 0,
    activeActivities: 0,
    assignedTickets: 0,
    completedToday: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(initialAttendanceData || null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      console.log('fetchDashboardData: Starting data refresh...');
      setIsLoading(true);
      
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
        console.log('Activities API response:', responseData);
        if (responseData?.activities) {
          activitiesData = responseData.activities;
          console.log('Activities with stages:', activitiesData.map((a: any) => ({ id: a.id, title: a.title, stages: a.ActivityStage })));
        } else if (Array.isArray(responseData)) {
          activitiesData = responseData;
        }
      } else {
        console.error('Activities API failed:', activitiesResponse.reason);
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
      } else {
        console.error('Tickets API failed:', ticketsResponse.reason);
      }
      setTickets(ticketsData);
      console.log('Tickets loaded:', ticketsData.length, ticketsData);

      // Handle attendance response
      if (attendanceResponse.status === 'fulfilled') {
        const attendanceData = attendanceResponse.value as any;
        console.log('fetchDashboardData: Attendance API response:', attendanceData);
        console.log('fetchDashboardData: isCheckedIn:', attendanceData?.isCheckedIn);
        console.log('fetchDashboardData: attendance status:', attendanceData?.attendance?.status);
        // Force state update with new object reference to ensure React detects the change
        setAttendanceStatus((prev: any) => {
          const newData = attendanceData ? JSON.parse(JSON.stringify(attendanceData)) : null;
          // Only update if data actually changed to prevent unnecessary re-renders
          if (JSON.stringify(prev) !== JSON.stringify(newData)) {
            console.log('fetchDashboardData: Attendance status updated from:', prev, 'to:', newData);
            return newData;
          }
          return prev;
        });
      } else {
        console.error('Attendance API failed:', attendanceResponse.reason);
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

      // Today hours: sum of durations for portions of activities that overlap with today
      let totalMsToday = 0;
      for (const a of activitiesData) {
        const start = a.startTime ? new Date(a.startTime) : null;
        if (!start) continue;

        // For active activities (no endTime), use current time as end
        // For completed activities, use their endTime
        const end = a.endTime ? new Date(a.endTime) : now;

        // Calculate overlap with today's boundaries
        const overlapStart = start > startOfToday ? start : startOfToday;
        const overlapEnd = end < endOfToday ? end : endOfToday;

        // Only count if there's actual overlap with today
        if (overlapEnd > overlapStart && overlapStart < endOfToday && overlapEnd > startOfToday) {
          const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
          totalMsToday += overlapMs;
          console.log(`Activity ${a.id} (${a.title}): ${overlapMs / (1000 * 60 * 60)} hours today`);
        }
      }

      const todayHours = totalMsToday / (1000 * 60 * 60);
      console.log(`Total hours calculated: ${todayHours} from ${activitiesData.length} activities`);

      const stats = {
        todayHours,
        activeActivities,
        assignedTickets: ticketsData.length,
        completedToday,
      };

      console.log('Dashboard stats updated:', stats);

      setDashboardStats(stats);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up periodic refresh for active activities (every 5 minutes)
    const interval = setInterval(() => {
      console.log('Periodic refresh for active activities...');
      fetchDashboardData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Log initial attendance data for debugging
  useEffect(() => {
    console.log('ServicePersonDashboardClientFixed: Initial attendance data received:', initialAttendanceData);
    console.log('ServicePersonDashboardClientFixed: Current attendance status state:', attendanceStatus);
  }, [initialAttendanceData, attendanceStatus]);

  const handleActivityChange = useCallback(async () => {
    console.log('handleActivityChange called - refreshing dashboard data...');
    // Add a small delay to ensure backend has processed the activity change
    setTimeout(async () => {
      try {
        await fetchDashboardData();
        console.log('Dashboard data refreshed after activity change');
      } catch (error) {
        console.error('Failed to refresh dashboard after activity change:', error);
      }
    }, 500); // Increased delay to ensure backend processing is complete
  }, [fetchDashboardData]);

  const handleAttendanceChange = useCallback(async () => {
    console.log('handleAttendanceChange called - refreshing dashboard data...');
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
    console.log('handleStatusUpdate called - refreshing dashboard data...');
    // Refresh dashboard data instead of reloading the page
    await fetchDashboardData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 sm:h-20 sm:w-20 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl">⚡</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Loading Dashboard</h2>
            <p className="text-sm text-gray-600">Preparing your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Mobile-First Header with Status Bar Support */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-4 sm:px-6 sm:py-6 shadow-lg pt-safe">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold">Service Dashboard</h1>
              <p className="text-blue-100 text-sm">Welcome, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Service Person'}!</p>
              {/* Mobile-Optimized Attendance Status */}
              {attendanceStatus && (
                <div className="mt-2 flex items-center space-x-2">
                  {(() => {
                    console.log('Header: Rendering attendance status, isCheckedIn:', attendanceStatus.isCheckedIn);
                    return attendanceStatus.isCheckedIn ? (
                      <>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs sm:text-sm text-green-200">
                          Checked In {attendanceStatus.attendance?.checkInAt ? 
                            new Date(attendanceStatus.attendance.checkInAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : ''
                          }
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-xs sm:text-sm text-gray-300">Not Checked In</span>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs sm:text-sm text-blue-100">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
              {/* Mobile Location Status */}
              {attendanceStatus?.attendance && (
                <p className="text-xs text-blue-200 mt-1 truncate max-w-[250px] sm:max-w-xs">
                  📍 {attendanceStatus.isCheckedIn 
                    ? (attendanceStatus.attendance.checkInAddress || 'Location not available')
                    : (attendanceStatus.attendance.checkOutAddress || attendanceStatus.attendance.checkInAddress || 'Location not available')
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed-Height Mobile Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 mb-6 sm:px-6 sm:-mt-8 sm:mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-blue-500 touch-manipulation h-20 sm:h-24">
            <div className="flex items-center h-full">
              <div className="text-xl sm:text-2xl flex-shrink-0">⏰</div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1 flex flex-col justify-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate leading-tight">Today's Hours</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">{dashboardStats.todayHours.toFixed(1)}h</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-green-500 touch-manipulation h-20 sm:h-24">
            <div className="flex items-center h-full">
              <div className="text-xl sm:text-2xl flex-shrink-0">🔄</div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1 flex flex-col justify-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate leading-tight">Active Activities</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">{dashboardStats.activeActivities}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-orange-500 touch-manipulation h-20 sm:h-24">
            <div className="flex items-center h-full">
              <div className="text-xl sm:text-2xl flex-shrink-0">🎫</div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1 flex flex-col justify-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate leading-tight">Assigned Tickets</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">{dashboardStats.assignedTickets}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-purple-500 touch-manipulation h-20 sm:h-24">
            <div className="flex items-center h-full">
              <div className="text-xl sm:text-2xl flex-shrink-0">✅</div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1 flex flex-col justify-center">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate leading-tight">Completed Today</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">{dashboardStats.completedToday}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 sm:pb-12">
        {/* Unified Dashboard */}
        <div className="space-y-4 sm:space-y-6">
          {/* Attendance Widget */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <CleanAttendanceWidget 
              onStatusChange={handleAttendanceChange}
              initialData={attendanceStatus}
            />
          </div>

          {/* Consolidated Activity Status Manager - Single Component */}
          <div className="bg-white rounded-lg shadow-md border-l-4 border-l-blue-500">
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="text-lg sm:text-xl">🔄</span>
                <span className="truncate">Active Activities</span>
              </h3>
              <ActivityStatusManager 
                activities={activities.filter(a => !a.endTime)}
                onActivityChange={handleActivityChange}
              />
            </div>
          </div>

          {/* Mobile-Optimized Create New Activity */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-md border border-green-200">
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="text-lg sm:text-xl bg-green-100 p-1 rounded-lg">➕</span>
                <span className="truncate">New Activity</span>
              </h3>
              <ActivityLogger 
                activities={activities}
                onActivityChange={handleActivityChange}
              />
            </div>
          </div>

          {/* Enhanced Assigned Tickets - Side by Side Layout */}
          <div className="bg-white rounded-lg shadow-md border-l-4 border-l-red-500">
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="text-lg sm:text-xl">🎯</span>
                Total Tickets ({tickets.length})
              </h3>
              {tickets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-gray-500 text-sm">No tickets assigned yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1">
                      {/* Enhanced Header with Status Prominence */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                            #{ticket.id}
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG]?.icon} {ticket.priority}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      {/* Prominent Current Status Display */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">Current Status:</span>
                        </div>
                        <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold mt-1 ${STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-800'} border-2 border-opacity-20`}>
                          <span className="mr-2">{STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG]?.icon}</span>
                          <span>{ticket.status.replace(/_/g, ' ')}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2 leading-tight min-h-[2.5rem]">
                        {ticket.title}
                      </h4>

                      {/* Compact Key Info */}
                      <div className="space-y-2 mb-4 text-xs">
                        <div className="flex items-center">
                          <span className="w-4 text-gray-400">🏢</span>
                          <span className="ml-2 font-medium text-gray-600 w-16">Customer:</span>
                          <span className="flex-1 truncate text-gray-800">{ticket.customer?.companyName || 'N/A'}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-4 text-gray-400">⚙️</span>
                          <span className="ml-2 font-medium text-gray-600 w-16">Asset:</span>
                          <span className="flex-1 truncate text-gray-800">{ticket.asset?.model || 'N/A'}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-4 text-gray-400">🔢</span>
                          <span className="ml-2 font-medium text-gray-600 w-16">Serial:</span>
                          <span className="flex-1 font-mono bg-gray-100 px-2 py-1 rounded text-xs truncate">
                            {ticket.asset?.serialNo || 'N/A'}
                          </span>
                        </div>
                        {(ticket.asset?.location || ticket.customer?.address) && (
                          <div className="flex items-start">
                            <span className="w-4 text-gray-400 mt-0.5">📍</span>
                            <span className="ml-2 font-medium text-gray-600 w-16 mt-0.5">Location:</span>
                            <span className="flex-1 text-xs leading-relaxed line-clamp-2 text-gray-800">
                              {ticket.asset?.location || ticket.customer?.address}
                            </span>
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
