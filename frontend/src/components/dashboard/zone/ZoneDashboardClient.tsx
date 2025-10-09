'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api/axios';
import type { ZoneDashboardData } from '@/lib/server/dashboard';

// Import admin dashboard components (reused for zone)
import ZoneExecutiveHeader from './ZoneExecutiveHeader';
import ExecutiveSummaryCards from '../ExecutiveSummaryCards';
import LazyDashboardSection from '../LazyDashboardSection';
import RecentTickets from '../RecentTickets';

// Import heavy components dynamically
import {
  DynamicFieldServiceAnalytics,
  DynamicPerformanceAnalytics,
  DynamicAdvancedAnalytics,
  DynamicZonePerformanceAnalytics,
} from '../DynamicDashboardComponents';

// Import types
import type { DashboardData, StatusDistribution, TrendsData } from '@/components/dashboard/types';

interface ZoneDashboardClientProps {
  initialZoneDashboardData: ZoneDashboardData | null;
}

// Helper function to transform zone data to dashboard data format
const transformZoneDataToDashboardData = (zoneData: ZoneDashboardData): Partial<DashboardData> => {
  // Calculate travel time from metrics (convert from minutes to hours/minutes)
  const travelTimeMinutes = zoneData.metrics?.avgTravelTime || 0;
  const travelHours = Math.floor(travelTimeMinutes / 60);
  const travelMins = Math.round(travelTimeMinutes % 60);
  
  // Calculate total tickets for this zone
  const totalTickets = (zoneData.stats?.openTickets?.count || 0) + 
                       (zoneData.stats?.inProgressTickets?.count || 0) + 
                       (zoneData.metrics?.resolvedTickets || 0);
  
  // Calculate average resolution time in hours
  const avgResolutionTimeHours = zoneData.metrics?.avgResolutionTime || 0;
  
  return {
    stats: {
      ...zoneData.stats,
      avgTravelTime: { hours: travelHours, minutes: travelMins, change: 0, isPositive: true },
      avgOnsiteResolutionTime: { hours: 0, minutes: 0, change: 0, isPositive: true },
      ticketDistribution: {
        byStatus: [],
        byPriority: []
      },
      kpis: {
        totalTickets: { value: totalTickets, change: '0%', isPositive: true },
        slaCompliance: { value: 0, change: 0, isPositive: true },
        avgResponseTime: { 
          value: `${zoneData.stats?.avgResponseTime?.hours || 0}h ${zoneData.stats?.avgResponseTime?.minutes || 0}m`, 
          unit: 'h', 
          change: zoneData.stats?.avgResponseTime?.change || 0, 
          isPositive: zoneData.stats?.avgResponseTime?.isPositive !== false 
        },
        avgResolutionTime: { 
          value: `${zoneData.stats?.avgResolutionTime?.days || 0}d ${zoneData.stats?.avgResolutionTime?.hours || 0}h`, 
          unit: 'h', 
          change: zoneData.stats?.avgResolutionTime?.change || 0, 
          isPositive: zoneData.stats?.avgResolutionTime?.isPositive !== false 
        },
        unassignedTickets: { value: zoneData.stats?.unassignedTickets?.count || 0, critical: zoneData.stats?.unassignedTickets?.critical || false },
        // For zone users, active customers = customers with open/in-progress tickets
        activeCustomers: { 
          value: Math.min(
            (zoneData.stats?.openTickets?.count || 0) + (zoneData.stats?.inProgressTickets?.count || 0),
            zoneData.zone?.totalCustomers || 0
          ), 
          change: 0 
        },
        // For zone users, active service persons = total technicians (assuming all are active)
        activeServicePersons: { value: zoneData.zone?.totalTechnicians || 0, change: 0 }
      }
    },
    adminStats: {
      totalCustomers: zoneData.zone?.totalCustomers || 0,
      totalServicePersons: zoneData.zone?.totalTechnicians || 0,
      totalServiceZones: 1, // Zone user sees only their zone
      ticketStatusDistribution: {},
      ticketTrends: [],
      // Create zoneWiseTickets array with this single zone's data for ZonePerformanceAnalytics component
      zoneWiseTickets: [{
        id: zoneData.zone?.id || 0,
        name: zoneData.zone?.name || 'Unknown Zone',
        totalTickets: totalTickets,
        servicePersonCount: zoneData.zone?.totalTechnicians || 0,
        customerCount: zoneData.zone?.totalCustomers || 0,
        avgResolutionTimeHours: avgResolutionTimeHours
      }]
    },
    recentTickets: (zoneData.recentActivities || []).map(activity => ({
      id: activity.id,
      title: activity.description || activity.type,
      status: 'OPEN',
      priority: activity.priority || 'MEDIUM',
      createdAt: activity.timestamp,
      customer: {
        id: 0,
        companyName: activity.technician || 'N/A'
      },
      asset: undefined
    }))
  };
};

export default function ZoneDashboardClient({ 
  initialZoneDashboardData 
}: ZoneDashboardClientProps) {
  const [zoneDashboardData, setZoneDashboardData] = useState<ZoneDashboardData | null>(initialZoneDashboardData);
  const [dashboardData, setDashboardData] = useState<Partial<DashboardData>>(
    initialZoneDashboardData ? transformZoneDataToDashboardData(initialZoneDashboardData) : {}
  );
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution>({ distribution: [] });
  const [ticketTrends, setTicketTrends] = useState<TrendsData>({ trends: [] });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(!initialZoneDashboardData); // Loading if no initial data
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (showSuccessToast: boolean = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      console.log('Fetching zone dashboard data...');
      
      const [zoneRes, statusRes, trendsRes] = await Promise.all([
        api.get('/zone-dashboard'),
        api.get('/zone-dashboard/status-distribution').catch((err) => {
          console.warn('Failed to fetch status distribution:', err);
          return { data: { distribution: [] } };
        }),
        api.get('/zone-dashboard/ticket-trends').catch((err) => {
          console.warn('Failed to fetch ticket trends:', err);
          return { data: { trends: [] } };
        })
      ]);
      
      console.log('Zone dashboard data received:', zoneRes.data);
      console.log('Status distribution received:', statusRes.data);
      console.log('Ticket trends received:', trendsRes.data);
      
      const transformedData = transformZoneDataToDashboardData(zoneRes.data);
      console.log('Transformed dashboard data:', transformedData);
      
      setZoneDashboardData(zoneRes.data || null);
      setDashboardData(transformedData);
      setStatusDistribution(statusRes.data || { distribution: [] });
      setTicketTrends(trendsRes.data || { trends: [] });
      
      // Only show success toast when explicitly requested (manual refresh)
      if (showSuccessToast) {
        toast.success('Zone dashboard data refreshed successfully');
      }
      
      setIsInitialLoading(false);
      return true;
    } catch (err) {
      console.error('Failed to fetch zone dashboard data:', err);
      setError('Failed to load zone dashboard data. Please try again.');
      toast.error('Failed to refresh zone dashboard data');
      setIsInitialLoading(false);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial data load - no success toast
    fetchDashboardData(false);
  }, []);

  const handleRefresh = async () => {
    // Manual refresh - show success toast
    await fetchDashboardData(true);
  };

  // Show loading state during initial data fetch
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Loading Zone Dashboard</h3>
          <p className="mt-2 text-sm text-gray-600">
            Fetching real-time data from backend...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Error loading zone dashboard</h3>
          <p className="mt-2 text-sm text-gray-600">
            {error}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                'Try again'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 md:p-6 lg:p-8">
      {/* Zone Executive Header - Always visible */}
      <ZoneExecutiveHeader 
        zoneData={zoneDashboardData?.zone || {
          id: 0,
          name: 'Loading...',
          description: '',
          totalCustomers: 0,
          totalTechnicians: 0,
          totalAssets: 0
        }}
        onRefresh={handleRefresh} 
        isRefreshing={isRefreshing} 
      />

      {/* Initial loading state */}
      {isRefreshing && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">Updating data...</span>
          </div>
        </div>
      )}

      {/* Executive Summary Cards - Critical above-the-fold content */}
      <ExecutiveSummaryCards 
        dashboardData={dashboardData} 
      />

      {/* Lazy-loaded analytics components with intersection observer */}
      <LazyDashboardSection className="mb-8">
        <DynamicFieldServiceAnalytics 
          dashboardData={dashboardData} 
        />
      </LazyDashboardSection>

      <LazyDashboardSection>
        <DynamicPerformanceAnalytics 
          dashboardData={dashboardData} 
        />
      </LazyDashboardSection>

      <LazyDashboardSection>
        <DynamicAdvancedAnalytics 
          dashboardData={dashboardData}
          statusDistribution={statusDistribution}
          ticketTrends={ticketTrends}
          loading={isRefreshing}
        />
      </LazyDashboardSection>

      <LazyDashboardSection>
        <RecentTickets 
          dashboardData={dashboardData} 
          loading={isRefreshing}
        />
      </LazyDashboardSection>

      <LazyDashboardSection>
        <DynamicZonePerformanceAnalytics 
          dashboardData={dashboardData} 
          onRefresh={handleRefresh} 
          isRefreshing={isRefreshing} 
        />
      </LazyDashboardSection>
    </div>
  );
}
