import { Suspense } from 'react';
import Script from 'next/script';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import DashboardErrorFallback from '@/components/dashboard/DashboardErrorFallback';
import { getAllZoneDashboardData } from '@/lib/server/dashboard';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { ZoneDashboardData } from '@/lib/server/dashboard';
import ZoneDashboardClient from '@/components/dashboard/zone/ZoneDashboardClient';

// Client-side redirect component to prevent NEXT_REDIRECT errors during prefetching
function ClientRedirect({ role }: { role: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const role = '${role}';
            let redirectPath = '/auth/login';
            
            switch (role) {
              case 'ADMIN':
              case 'SUPER_ADMIN':
                redirectPath = '/admin/dashboard';
                break;
              case 'SERVICE_PERSON':
                redirectPath = '/service-person/dashboard';
                break;
            }
            
            if (typeof window !== 'undefined') {
              window.location.href = redirectPath;
            }
          })();
        `
      }}
    />
  );
}

// Loading component for Suspense boundary
function ZoneDashboardLoading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Loading zone dashboard data...</p>
      </div>
    </div>
  );
}

// Server Component - runs on the server for initial data fetching
export default async function ZoneDashboardPage() {
  try {
    const cookieStore = cookies();
    const userRole = cookieStore.get('userRole')?.value;
    const accessToken = cookieStore.get('accessToken')?.value;
    const token = cookieStore.get('token')?.value;
    const apiHref = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    // Check if user is authenticated
    if (!userRole || (!accessToken && !token)) {
      redirect('/auth/login');
    }

    // Check if user has access to zone dashboard - ZONE_USER, ZONE_MANAGER, or ADMIN can access
    const normalizedUserRole = userRole.toUpperCase();
    
    if (normalizedUserRole !== 'ZONE_USER' && normalizedUserRole !== 'ZONE_MANAGER' && normalizedUserRole !== 'ADMIN') {
      // Return a client-side redirect component instead of server-side redirect
      // This prevents NEXT_REDIRECT errors during prefetching
      return <ClientRedirect role={normalizedUserRole} />;
    }

    // Fetch initial data on the server
    const { zoneDashboardData } = await getAllZoneDashboardData();

    // Pass the actual data from backend (or null to trigger client-side fetch)
    const safeZoneDashboardData: ZoneDashboardData | null = zoneDashboardData || null;
    
    return (
      <>
        {/* Preload critical resources */}
        <Script
          id="zone-dashboard-preload"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Preload critical dashboard resources
              const preloadLinks = [
                { rel: 'preconnect', href: '${apiHref}' },
                { rel: 'dns-prefetch', href: '${apiHref}' }
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
          id="zone-dashboard-analytics"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize performance monitoring
              if (typeof window !== 'undefined' && window.performance) {
                window.zoneDashboardLoadTime = Date.now();
              }
            `
          }}
        />

        <div className="overflow-x-hidden">
          <DashboardErrorBoundary fallback={DashboardErrorFallback}>
            <Suspense fallback={<ZoneDashboardLoading />}>
              <ZoneDashboardClient initialZoneDashboardData={safeZoneDashboardData} />
            </Suspense>
          </DashboardErrorBoundary>
        </div>
      </>
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && 
        (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('No access token found'))) {
      redirect('/auth/login');
      return null;
    }

    // Return error state
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Failed to load zone dashboard</h2>
          <p className="text-gray-600 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
}
