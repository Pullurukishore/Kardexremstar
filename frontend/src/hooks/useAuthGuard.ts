import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user.types';

export const useAuthGuard = (requiredRoles?: UserRole | UserRole[], redirectPath = '/auth/login') => {
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.push(`${redirectPath}?callbackUrl=${callbackUrl}`);
      return;
    }

    // Check roles if required
    if (requiredRoles && !hasPermission(requiredRoles)) {
      // Redirect to dashboard based on user role
      const getRoleBasedPath = (role?: UserRole): string => {
        switch (role) {
          case UserRole.ADMIN:
            return '/admin/dashboard';
          case UserRole.ZONE_USER:
            return '/zone/dashboard';
          case UserRole.SERVICE_PERSON:
            return '/service-person/dashboard';
          case UserRole.EXTERNAL_USER:
            return '/external/tickets';
          default:
            return '/';
        }
      };
      
      const defaultPath = getRoleBasedPath(user?.role);
      router.push(defaultPath);
    }
  }, [isAuthenticated, isLoading, requiredRoles, router, redirectPath, hasPermission, user]);

  return {
    user,
    isAuthenticated,
    isLoading,
    hasPermission,
  };
};

export default useAuthGuard;
