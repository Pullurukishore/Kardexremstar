'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { preloadRoute, isBrowser } from '@/lib/browser';
import { useAuth } from '@/contexts/AuthContext';

interface NavigationContextType {
  isNavigating: boolean;
  navigatingTo: string | null;
  navigate: (path: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  // Always false for smooth navigation without loading states
  const [isNavigating] = useState(false);
  const [navigatingTo] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const navigate = (path: string) => {
    if (path === pathname) return; // Don't navigate to same path
    
    // No loading states for smooth navigation
    // setIsNavigating(true);
    // setNavigatingTo(path);
    
    // Preload the route for faster navigation
    preloadRoute(path);
    
    // Use router.push for client-side navigation
    router.push(path);
  };

  // Preload role-specific routes on mount
  useEffect(() => {
    if (isBrowser && user?.role) {
      // Only preload routes that the user actually has access to
      const getRoleSpecificRoutes = (role: string) => {
        switch (role) {
          case 'ADMIN':
            return ['/admin/dashboard', '/auth/login'];
          case 'ZONE_USER':
            return ['/zone/dashboard', '/auth/login'];
          case 'SERVICE_PERSON':
            return ['/service-person/dashboard', '/auth/login'];
          default:
            return ['/auth/login'];
        }
      };
      
      const routesToPreload = getRoleSpecificRoutes(user.role);
      
      routesToPreload.forEach(route => {
        if (route !== pathname) {
          preloadRoute(route);
        }
      });
    }
  }, [pathname, user?.role]);

  // Navigation state management disabled for smooth navigation
  // Clear navigation state when route changes
  // useEffect(() => {
  //   setIsNavigating(false);
  //   setNavigatingTo(null);
  // }, [pathname]);

  // Clear navigation state after timeout (fallback)
  // useEffect(() => {
  //   if (isNavigating) {
  //     const timeout = setTimeout(() => {
  //       setIsNavigating(false);
  //       setNavigatingTo(null);
  //     }, 5000); // 5 second timeout

  //     return () => clearTimeout(timeout);
  //   }
  // }, [isNavigating]);

  return (
    <NavigationContext.Provider value={{ isNavigating, navigatingTo, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
