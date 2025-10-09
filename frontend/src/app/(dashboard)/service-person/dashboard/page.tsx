import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ServicePersonDashboardClientFixed from './components/ServicePersonDashboardClientFixed';

// Server-side data fetching
async function getServicePersonDashboardData() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  
  if (!token) {
    return null;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';
    const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

    // Fetch attendance status
    const attendanceResponse = await fetch(`${apiUrl}/attendance/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!attendanceResponse.ok) {
      console.error('Failed to fetch attendance status:', attendanceResponse.status);
      return null;
    }

    const attendanceData = await attendanceResponse.json();
    console.log('Server-side attendance data:', attendanceData);
    console.log('Server-side attendance isCheckedIn:', attendanceData?.isCheckedIn);
    console.log('Server-side attendance status:', attendanceData?.attendance?.status);
    
    return {
      attendance: attendanceData
    };
  } catch (error) {
    console.error('Server-side data fetch error:', error);
    return null;
  }
}

// Premium loading component
function PremiumLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      {/* Loading spinner */}
      <div className="relative z-10 flex flex-col items-center space-y-8">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-transparent border-t-blue-400 border-r-purple-400 rounded-full animate-spin"></div>
          <div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-b-blue-300 border-l-purple-300 rounded-full animate-spin animate-reverse"></div>
          <div className="absolute inset-4 w-8 h-8 border-4 border-transparent border-t-blue-200 border-r-purple-200 rounded-full animate-spin"></div>
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">KardexCare</h2>
          <p className="text-blue-200 animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    </div>
  );
}

export default async function ServicePersonDashboardPage() {
  // Server-side authentication check
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  const userRole = cookieStore.get('userRole')?.value;

  if (!token || userRole !== 'SERVICE_PERSON') {
    redirect('/auth/login');
  }

  // Fetch initial data
  const dashboardData = await getServicePersonDashboardData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ServicePersonDashboardClientFixed initialAttendanceData={dashboardData?.attendance} />
    </div>
  );
}