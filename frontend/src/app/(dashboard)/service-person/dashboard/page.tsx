import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import ServicePersonDashboardClientFixed from './components/ServicePersonDashboardClientFixed';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import DashboardErrorFallback from '@/components/dashboard/DashboardErrorFallback';

// Page metadata for SEO and browser tabs
export const metadata: Metadata = {
  title: 'Dashboard | Service Person | KardexCare',
  description: 'Service person dashboard for managing attendance, activities, and tickets',
  robots: 'noindex, nofollow',
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Premium loading skeleton with matching design
 */
function DashboardLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.06),_transparent_50%)]"></div>
      
      {/* Floating orbs */}
      <div className="fixed top-20 left-10 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-32 right-10 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>
      
      {/* Header Skeleton */}
      <div className="relative bg-gradient-to-r from-[#3d5a78] via-[#507295] to-[#6889ab] px-4 py-6 sm:px-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-6 sm:h-8 w-48 sm:w-64 bg-white/20 rounded-lg animate-pulse"></div>
              <div className="h-4 w-32 sm:w-40 bg-white/20 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar Skeleton */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i}
                className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/50 shadow-lg animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl"></div>
                  <div className="space-y-2">
                    <div className="h-3 w-12 bg-gray-200 rounded"></div>
                    <div className="h-6 w-8 bg-gray-300 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-white/50 shadow-lg animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl sm:rounded-2xl"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-40 bg-gray-200 rounded-lg"></div>
                  <div className="h-3 w-28 bg-gray-100 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Fetches the service-person attendance data
 */
async function getServicePersonDashboardData(token: string, retryCount = 0): Promise<any> {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';
    const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${apiUrl}/attendance/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Request-Source': 'dashboard-ssr',
      },
      cache: 'no-store',
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clearTimeout(timeoutId);
    if (res.status === 401 || res.status === 403) redirect('/auth/login');
    if (res.status >= 500 && retryCount < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY * (retryCount + 1)));
      return getServicePersonDashboardData(token, retryCount + 1);
    }
    if (!res.ok) return null;
    const data = await res.json();
    return { attendance: data };
  } catch (e: any) {
    if (e.name === 'AbortError' && retryCount < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY * (retryCount + 1)));
      return getServicePersonDashboardData(token, retryCount + 1);
    }
    return null;
  }
}

/**
 * Service Person Dashboard – Server Component
 */
export default async function ServicePersonDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const accessToken = cookieStore.get('accessToken')?.value;
  const userRole = cookieStore.get('userRole')?.value;
  const authToken = accessToken || token;

  // Only redirect if NO token at all - let client-side handle expired tokens
  if (!authToken) redirect('/auth/login');
  
  // Role check - redirect to login if wrong role
  if (userRole && userRole !== 'SERVICE_PERSON') redirect('/auth/login');

  const dashboardData = await getServicePersonDashboardData(authToken);

  return (
    <DashboardErrorBoundary fallback={DashboardErrorFallback}> 
      <Suspense fallback={<DashboardLoading />}> 
        <div className="min-h-screen overflow-x-hidden relative">
          <ServicePersonDashboardClientFixed initialAttendanceData={dashboardData?.attendance ?? null} />
        </div>
      </Suspense>
    </DashboardErrorBoundary>
  );
}
