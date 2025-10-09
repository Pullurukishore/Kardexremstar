import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Force dynamic rendering for dashboard layout
export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getCurrentUser } from '@/lib/api/auth';
import { UserRole } from '@/types/user.types';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the auth token from cookies
  const cookieStore = cookies();
  const token = cookieStore.get('accessToken') || cookieStore.get('token');
  
  // If no token, redirect to login
  if (!token?.value) {
    redirect('/auth/login');
  }

  try {
    // Get current user on the server
    const user = await getCurrentUser();
    
    // If no user, redirect to login
    if (!user) {
      redirect('/auth/login');
    }

    // The role is already validated by the AuthResponseUser type
    const userRole = user.role;

    return (
      <TooltipProvider>
        <DashboardLayout userRole={userRole}>
          {children}
        </DashboardLayout>
      </TooltipProvider>
    );
  } catch (error) {
    console.error('Error getting user:', error);
    redirect('/auth/login');
  }
}