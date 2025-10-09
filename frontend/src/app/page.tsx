'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Add a small delay to prevent conflicts with server-side redirects
    const redirectTimer = setTimeout(() => {
      // Only redirect after auth state is fully initialized
      if (!isLoading) {
        if (isAuthenticated && user) {
          // Redirect authenticated users to their dashboard
          const getRoleBasedRedirect = (role: string): string => {
            const normalizedRole = role.toUpperCase();
            switch (normalizedRole) {
              case 'ADMIN':
                return '/admin/dashboard';
              case 'ZONE_USER':
                return '/zone/dashboard';
              case 'SERVICE_PERSON':
                return '/service-person/dashboard';
              case 'EXTERNAL_USER':
                return '/external/tickets';
              default:
                console.log('Root page: Unknown role:', role, 'redirecting to login');
                return '/auth/login';
            }
          };
          
          console.log('Root page: Redirecting authenticated user to dashboard, role:', user.role);
          const redirectPath = getRoleBasedRedirect(user.role);
          console.log('Root page: Redirect path:', redirectPath);
          
          // Use window.location for more reliable redirect
          if (typeof window !== 'undefined') {
            window.location.href = redirectPath;
          }
        } else {
          // Redirect unauthenticated users to login
          console.log('Root page: Redirecting unauthenticated user to login, isAuthenticated:', isAuthenticated, 'user:', !!user);
          
          // Use window.location for more reliable redirect
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
      } else {
        console.log('Root page: Still loading, isLoading:', isLoading);
      }
    }, 100); // Small delay to prevent conflicts

    return () => clearTimeout(redirectTimer);
  }, [isLoading, isAuthenticated, user]);

  // Show loading spinner while determining authentication status
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#507295] via-[#5a7ba0] to-[#4a6b8a] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Enhanced Logo Card */}
        <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 p-8 mb-6 overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(80,114,149,0.3) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>
          </div>
          
          {/* Content */}
          <div className="relative text-center">
            {/* Logo container with enhanced styling */}
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#507295]/10 via-transparent to-[#507295]/10 rounded-2xl blur-xl"></div>
              <div className="relative bg-white rounded-2xl p-4 shadow-lg border border-gray-100/50">
                <Image
                  src="/kardex.png"
                  alt="Kardex Logo"
                  width={240}
                  height={96}
                  className="mx-auto drop-shadow-md filter brightness-105 contrast-110"
                  priority
                />
              </div>
            </div>
            
            {/* Elegant divider */}
            <div className="relative mb-6">
              <div className="h-px bg-gradient-to-r from-transparent via-[#507295]/30 to-transparent"></div>
              <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent transform translate-y-px"></div>
            </div>
            
            {/* Enhanced typography */}
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#507295] to-[#4a6b8a] bg-clip-text text-transparent mb-3">
              Ticket Management System
            </h1>
            <p className="text-gray-600/80 text-sm font-medium">
              Streamlined service management solutions
            </p>
          </div>
          
          {/* Decorative corner elements */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#507295]/10 to-transparent rounded-bl-full"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-[#aac01d]/10 to-transparent rounded-tr-full"></div>
        </div>
        
        {/* Enhanced Loading Card */}
        <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/30 overflow-hidden">
          {/* Subtle animated background */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-r from-[#507295]/20 via-[#aac01d]/10 to-[#507295]/20 animate-pulse"></div>
          </div>
          
          <div className="relative text-center">
            {/* Enhanced loading spinner */}
            <div className="mb-4">
              <div className="relative inline-block">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#507295]/20 to-[#aac01d]/20 blur-lg animate-pulse"></div>
                <div className="relative bg-white rounded-full p-3 shadow-lg">
                  <Loader2 className="h-8 w-8 text-[#507295] animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-[#aac01d]/30 animate-ping"></div>
              </div>
            </div>
            
            <p className="text-[#507295] font-semibold text-sm mb-4">
              {isLoading ? 'Loading your dashboard...' : 'Redirecting...'}
            </p>
            
            {/* Modern Progress Bar */}
            <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-r from-[#507295] via-[#aac01d] to-[#507295] rounded-full animate-pulse opacity-90"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full animate-shimmer"></div>
              <div className="absolute inset-0 rounded-full shadow-inner"></div>
            </div>
            
            {/* Animated dots */}
            <div className="mt-4 flex justify-center space-x-2">
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-[#507295] to-[#4a6b8a] rounded-full animate-bounce shadow-sm"></div>
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-[#aac01d] to-[#9bb01a] rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-[#507295] to-[#4a6b8a] rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-12 h-12 bg-gradient-to-br from-[#aac01d]/10 to-transparent rounded-br-full"></div>
          <div className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-tl from-[#507295]/10 to-transparent rounded-tl-full"></div>
        </div>
        
        {/* Enhanced Footer */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <div className="w-2 h-2 bg-[#aac01d] rounded-full animate-pulse"></div>
            <p className="text-white/80 text-xs font-medium">
              Powered by intelligent automation
            </p>
          </div>
        </div>
      </div>
      
      {/* Enhanced Background Pattern */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Primary pattern */}
        <div className="absolute inset-0 opacity-8">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}></div>
        </div>
        
        {/* Secondary pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 75% 75%, rgba(172,192,29,0.2) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        {/* Gradient overlays */}
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/5 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/10 to-transparent"></div>
      </div>
    </div>
  );
}
