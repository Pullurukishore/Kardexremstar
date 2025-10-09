import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from '@/types/user.types';
import { isRouteAccessible, shouldRedirectToLogin } from './lib/utils/navigation';

function getRoleBasedRedirect(role?: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return '/admin/dashboard';
    case UserRole.ZONE_USER:
      return '/zone/dashboard';
    case UserRole.SERVICE_PERSON:
      return '/service-person/dashboard';
    default:
      return '/auth/login';
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;
  const token = request.cookies.get('token')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const userRole = request.cookies.get('userRole')?.value as UserRole | undefined;
  
  // Use fallback token logic like other parts of the app
  const authToken = accessToken || token;

  // Log all API calls with detailed information
  if (pathname.startsWith('/api/')) {
    console.log('\n--- API Request ---');
    console.log(`[${new Date().toISOString()}] ${request.method} ${pathname}`);
    console.log('User Role:', userRole || 'Unauthenticated');
    
    // Clone the request to read the body
    const requestClone = request.clone();
    try {
      const body = await requestClone.text();
      if (body) {
        console.log('Request Body:', body);
      }
    } catch (error) {
      console.log('Could not read request body');
    }

    // Block access to API routes if not authenticated
    if (!authToken || !refreshToken) {
      console.log('Unauthenticated API access attempt');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has access to the API route
    if (!isRouteAccessible(pathname, userRole)) {
      console.log('Unauthorized API access attempt');
      return NextResponse.json(
        { error: 'You do not have permission to access this resource' },
        { status: 403 }
      );
    }

    // Add CORS headers for API routes
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // Handle public routes - allow them to load without interference
  if (!shouldRedirectToLogin(pathname)) {
    return NextResponse.next();
  }
  
  // Special handling for root path - let client-side routing handle it
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Require authentication for protected routes
  if (!authToken || !refreshToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if user has access to the requested route
  if (!isRouteAccessible(pathname, userRole)) {
    const redirectPath = getRoleBasedRedirect(userRole);
    console.log(`Middleware: Redirecting ${userRole} from ${pathname} to ${redirectPath}`);
    
    // Add a small delay header to prevent conflicts with client-side redirects
    const response = NextResponse.redirect(new URL(redirectPath, request.url));
    response.headers.set('X-Redirect-Reason', 'role-access');
    return response;
  }

  return NextResponse.next();
}

// Configure which routes should be processed by this middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    '/api/:path*',
  ],
};
