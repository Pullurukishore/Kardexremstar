'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

// Import lightweight components directly
import ExecutiveHeader from './ExecutiveHeader';
import ExecutiveSummaryCards from './ExecutiveSummaryCards';
import RecentTickets from './RecentTickets';

// Import heavy components dynamically
import {
  DynamicAdvancedAnalytics,
  DynamicZonePerformanceAnalytics,
} from './DynamicDashboardComponents';

// Import types
import type { DashboardData, StatusDistribution, TrendsData } from '@/components/dashboard/types';
import api from '@/lib/api/axios';

interface DashboardClientProps {
  initialDashboardData: Partial<DashboardData>;
  initialStatusDistribution: StatusDistribution;
  initialTicketTrends: TrendsData;
}

export default function DashboardClient({
  initialDashboardData,
  initialStatusDistribution,
  initialTicketTrends,
}: DashboardClientProps) {
  const [dashboardData, setDashboardData] = useState<Partial<DashboardData>>(initialDashboardData);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution>(initialStatusDistribution);
  const [ticketTrends, setTicketTrends] = useState<TrendsData>(initialTicketTrends);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  
  // Refs to prevent duplicate API calls (Strict Mode / double render protection)
  const hasInitialized = useRef(false);
  const isFetching = useRef(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Memoized fetch function with deduplication
  const fetchDashboardData = useCallback(async (showToast: boolean = true) => {
    // Prevent duplicate concurrent fetches
    if (isFetching.current) {
      return false;
    }
    
    try {
      isFetching.current = true;
      setIsRefreshing(true);
      setError(null);
      
      const [dashboardRes, statusRes, trendsRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/dashboard/status-distribution'),
        api.get('/dashboard/ticket-trends')
      ]);
      
      setDashboardData(dashboardRes.data || {});
      setStatusDistribution(statusRes.data || { distribution: [] });
      setTicketTrends(trendsRes.data || { trends: [] });
      
      if (showToast) {
        toast.success('Dashboard data refreshed');
      }
      return true;
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      toast.error('Failed to refresh dashboard data');
      return false;
    } finally {
      isFetching.current = false;
      setIsRefreshing(false);
    }
  }, []);

  // Initial data fetch - with strict mode protection
  useEffect(() => {
    // Skip if already initialized (React Strict Mode protection)
    if (hasInitialized.current) {
      return;
    }
    
    const hasValidInitialData = 
      initialDashboardData && 
      initialDashboardData.stats && 
      Object.keys(initialDashboardData).length > 0;
    
    // Only fetch if no valid initial data was provided from server
    if (!hasValidInitialData) {
      hasInitialized.current = true;
      fetchDashboardData(false); // Don't show toast on initial load
    } else {
      hasInitialized.current = true;
    }
  }, [initialDashboardData, fetchDashboardData]);

  // Auto-refresh every 5 minutes - separate effect for clarity
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (isOnline && !isFetching.current) {
        fetchDashboardData(false); // Silent refresh
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [isOnline, fetchDashboardData]);

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center">
        <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full text-center border border-white/50">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-red-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-blue-200/30 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 shadow-xl mb-6">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">Error loading dashboard</h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/80 to-indigo-100/80 p-4 sm:p-6 md:p-8 lg:p-10 overflow-x-hidden w-full max-w-full">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/30 to-cyan-200/20 rounded-full blur-3xl" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-purple-200/25 to-pink-200/15 rounded-full blur-3xl" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/20 to-blue-200/10 rounded-full blur-3xl" style={{ animationDuration: '12s', animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 w-full max-w-full overflow-x-hidden">
        {/* Connection Status Indicator */}
        {!isOnline && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white px-5 py-2.5 rounded-full shadow-lg shadow-red-500/30 border border-red-400/30">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-semibold">Offline Mode</span>
            </div>
          </div>
        )}

        {/* Refresh Indicator */}
        {isRefreshing && (
          <div className="fixed top-4 right-4 z-50">
            <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-xl px-4 py-2.5 rounded-full shadow-xl border border-slate-200/50">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="text-sm font-semibold text-slate-700">Syncing...</span>
            </div>
          </div>
        )}

        {/* Executive Header */}
        <ExecutiveHeader 
          onRefresh={handleRefresh} 
          isRefreshing={isRefreshing}
          stats={{
            totalCustomers: dashboardData?.adminStats?.totalCustomers,
            totalServicePersons: dashboardData?.adminStats?.totalServicePersons,
            totalServiceZones: dashboardData?.adminStats?.totalServiceZones,
          }}
        />

        {/* Executive Summary Cards - All metrics consolidated here */}
        <ExecutiveSummaryCards 
          dashboardData={dashboardData} 
        />

        {/* Advanced Analytics - Status Distribution & Trends */}
        <div className="mb-8 sm:mb-10">
          <DynamicAdvancedAnalytics 
            dashboardData={dashboardData}
            statusDistribution={statusDistribution}
            ticketTrends={ticketTrends}
            loading={isRefreshing}
          />
        </div>

        {/* Recent Tickets */}
        <div className="mb-8 sm:mb-10">
          <RecentTickets 
            dashboardData={dashboardData} 
            loading={isRefreshing}
          />
        </div>

        {/* Zone Performance Analytics */}
        <div className="mb-8 sm:mb-10">
          <DynamicZonePerformanceAnalytics 
            dashboardData={dashboardData} 
            onRefresh={handleRefresh} 
            isRefreshing={isRefreshing} 
          />
        </div>

        {/* Footer Spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
