import { UserRole } from '@/types/user.types';

export function getRoleBasedRedirect(role?: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return '/admin/dashboard';
    case UserRole.SERVICE_PERSON:
      return '/service-person/dashboard';
    case UserRole.ZONE_USER:
      return '/zone/dashboard';
    default:
      return '/dashboard';
  }
}

export function isRouteAccessible(route: string, userRole?: UserRole): boolean {
  // Public routes accessible to everyone
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];
  if (publicRoutes.includes(route)) return true;

  // If no role is provided, only public routes are accessible
  if (!userRole) return false;

  // Role-based route access
  const roleRoutes: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: ['/admin', '/api/admin', '/admin/FSA', '/api/assets', '/api/customers'],
    [UserRole.SERVICE_PERSON]: ['/service-person', '/api/service-person'],
    [UserRole.ZONE_USER]: ['/zone', '/api/zone'],
  };

  // Get allowed routes for the user's role
  const allowedRoutes = roleRoutes[userRole as keyof typeof roleRoutes] || [];
  
  // Check if the route starts with any of the allowed paths for the user's role
  return allowedRoutes.some(prefix => route.startsWith(prefix));
}

export function shouldRedirectToLogin(route: string): boolean {
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/_next', '/favicon.ico', '/api/auth', '/'];
  return !publicRoutes.some(publicRoute => route.startsWith(publicRoute));
}
