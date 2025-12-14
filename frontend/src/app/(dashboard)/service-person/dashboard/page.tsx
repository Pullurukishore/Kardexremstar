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
  robots: 'noindex, nofollow', // Prevent indexing of authenticated pages
};

// Force dynamic rendering for this page (always server‑side render)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Premium loading skeleton – mirrors the admin dashboard loading UI.
 */
function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      {/* Header skeleton */}
      <div className="mb-6 sm:mb-8">
        <div className="h-32 sm:h-40 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl sm:rounded-3xl animate-pulse" />
        <div className="mt-4 sm:mt-5 h-12 bg-blue-100/50 rounded-xl sm:rounded-2xl animate-pulse" />
      </div>

      {/* Content skeleton – a few placeholder cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-white/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/50 shadow-lg animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="h-6 bg-slate-200/60 rounded w-3/4 mb-2" />
            <div className="h-8 bg-slate-200/80 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Checks if a JWT token is expired by decoding its payload.
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp ? payload.exp < now + 60 : true;
  } catch {
    return true;
  }
}

/**
 * Fetches the service‑person attendance data.
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
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  const accessToken = cookieStore.get('accessToken')?.value;
  const userRole = cookieStore.get('userRole')?.value;
  const authToken = accessToken || token;

  if (!authToken) redirect('/auth/login');
  if (userRole !== 'SERVICE_PERSON') redirect('/auth/login');
  if (isTokenExpired(authToken)) redirect('/auth/login');

  const dashboardData = await getServicePersonDashboardData(authToken);

  return (
    <DashboardErrorBoundary fallback={DashboardErrorFallback}> 
      <Suspense fallback={<DashboardLoading />}> 
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-x-hidden relative">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <ServicePersonDashboardClientFixed initialAttendanceData={dashboardData?.attendance ?? null} />
          </main>
        </div>
      </Suspense>
    </DashboardErrorBoundary>
  );
}
