import { Suspense } from 'react';
import Script from 'next/script';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import DashboardErrorFallback from '@/components/dashboard/DashboardErrorFallback';
import { getAllDashboardData } from '@/lib/server/dashboard';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { 
  DashboardData,
  StatusDistribution,
  TrendsData 
} from '@/components/dashboard/types';
import DashboardClient from '@/components/dashboard/DashboardClient';

// Loading component for Suspense boundary
function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Loading dashboard data...</p>
      </div>
    </div>
  );
}

// Error component for error boundaries
function DashboardError({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div className="bg-red-50 rounded-lg p-6 max-w-2xl mx-auto my-8">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="p-3 bg-red-100 rounded-full">
          <div className="w-8 h-8 text-red-600">!</div>
        </div>
        <h3 className="text-lg font-medium text-red-800">Failed to load dashboard</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={retry}
          className="px-4 py-2 border border-red-200 text-red-700 rounded-md hover:bg-red-50 mt-2 flex items-center gap-2"
        >
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}

// Server Component - runs on the server for initial data fetching
export default async function DashboardPage() {
  try {
    const cookieStore = cookies();
    const userRole = cookieStore.get('userRole')?.value;
    
    if (!userRole) {
      redirect('/auth/login');
    }

    // Fetch initial data on the server
    const { dashboardData, statusDistribution, ticketTrends } = await getAllDashboardData();

    // Create safe dashboard data with proper typing
    const safeDashboardData: DashboardData = {
      stats: {
        openTickets: { count: 0, change: 0 },
        unassignedTickets: { count: 0, critical: false },
        inProgressTickets: { count: 0, change: 0 },
        avgResponseTime: { hours: 0, minutes: 0, change: 0, isPositive: true },
        avgResolutionTime: { days: 0, hours: 0, minutes: 0, change: 0, isPositive: true },
        avgDowntime: { hours: 0, minutes: 0, change: 0, isPositive: true },
        avgTravelTime: { hours: 0, minutes: 0, change: 0, isPositive: true },
        avgOnsiteResolutionTime: { hours: 0, minutes: 0, change: 0, isPositive: true },
        monthlyTickets: { count: 0, change: 0 },
        activeMachines: { count: 0, change: 0 },
        ticketDistribution: {
          byStatus: [],
          byPriority: []
        },
        kpis: {
          totalTickets: { value: 0, change: '0%', isPositive: true },
          slaCompliance: { value: 0, change: 0, isPositive: true },
          avgResponseTime: { value: '0h 0m', unit: 'h', change: 0, isPositive: true },
          avgResolutionTime: { value: '0h 0m', unit: 'h', change: 0, isPositive: true },
          unassignedTickets: { value: 0, critical: false },
          activeCustomers: { value: 0, change: 0 },
          activeServicePersons: { value: 0, change: 0 }
        }
      },
      adminStats: {
        totalCustomers: 0,
        totalServicePersons: 0,
        totalServiceZones: 0,
        ticketStatusDistribution: {},
        ticketTrends: [],
        zoneWiseTickets: []
      },
      recentTickets: [],
      ...dashboardData
    };

    return (
      <>
        {/* Preload critical resources */}
        <Script
          id="dashboard-preload"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Preload critical dashboard resources
              const preloadLinks = [
                { rel: 'preconnect', href: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000' },
                { rel: 'dns-prefetch', href: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000' }
              ];
              preloadLinks.forEach(link => {
                const linkEl = document.createElement('link');
                Object.assign(linkEl, link);
                document.head.appendChild(linkEl);
              });
            `
          }}
        />
        
        {/* Non-critical analytics scripts */}
        <Script
          id="dashboard-analytics"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize performance monitoring
              if (typeof window !== 'undefined' && window.performance) {
                window.dashboardLoadTime = Date.now();
              }
            `
          }}
        />

        <DashboardErrorBoundary fallback={DashboardErrorFallback}>
          <Suspense fallback={<DashboardLoading />}>
            <DashboardClient 
              initialDashboardData={safeDashboardData}
              initialStatusDistribution={statusDistribution || { distribution: [] }}
              initialTicketTrends={ticketTrends || { trends: [] }}
            />
          </Suspense>
        </DashboardErrorBoundary>
      </>
    );
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    
    // Handle authentication errors
    if (error instanceof Error && 
        (error.message.includes('401') || error.message.includes('Unauthorized'))) {
      redirect('/auth/login');
      return null;
    }

    // Return error state
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Failed to load dashboard</h2>
          <p className="text-gray-600 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
}