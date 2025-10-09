'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/user.types';

interface DashboardClientWrapperProps {
  children: React.ReactNode;
  userRole: UserRole;
}

export function DashboardClientWrapper({ children, userRole }: DashboardClientWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  
  // Service persons and external users don't need sidebar - single dashboard approach
  const showSidebar = userRole !== 'SERVICE_PERSON' && userRole !== 'EXTERNAL_USER';

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      // Auto-collapse sidebar on desktop, but keep it as overlay on mobile
      if (!mobile && window.innerWidth < 1280) { // xl breakpoint
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar on route change and handle page transitions
  useEffect(() => {
    setSidebarOpen(false);
    setPageKey(prev => prev + 1);
  }, [pathname]);

  // Removed loading states to prevent delays

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay - only show if sidebar is enabled */}
      {showSidebar && (
        <AnimatePresence>
          {sidebarOpen && isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>
      )}

      {/* Sidebar - only show if sidebar is enabled */}
      {showSidebar && (
        <AnimatePresence>
          {(sidebarOpen || !isMobile) && (
            <motion.div
              initial={isMobile ? { x: -320 } : undefined}
              animate={isMobile ? { x: 0 } : undefined}
              exit={isMobile ? { x: -320 } : undefined}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn(
                isMobile ? "fixed z-[60]" : "lg:block",
                !isMobile && !sidebarOpen ? "hidden lg:block" : "block"
              )}
            >
              <Sidebar 
                userRole={userRole}
                collapsed={!isMobile && isCollapsed}
                setCollapsed={setIsCollapsed}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
      
      {/* Main content */}
      <div 
        className={cn(
          "flex flex-col min-h-screen transition-all duration-500 ease-out",
          // Conditional margins based on sidebar visibility and user role
          !showSidebar 
            ? "ml-0" // No sidebar for service persons
            : isMobile 
              ? "ml-0" // No margin on mobile (overlay sidebar)
              : isCollapsed 
                ? "lg:ml-16" 
                : "lg:ml-64"
        )}
      >
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          showSidebar={showSidebar}
        />
        
        <main className="flex-1 overflow-y-auto focus:outline-none bg-gray-50">
          <div className={cn(
            "min-h-full",
            // Mobile-optimized padding
            isMobile 
              ? "py-4 px-4" 
              : "py-6 px-4 sm:px-6 lg:px-8"
          )}>
            <AnimatePresence mode="wait">
              <motion.div
                key={pageKey}
                initial={{ opacity: 0, y: 5 }} // Reduced movement
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ 
                  duration: 0.1, // Much faster
                  ease: "easeOut"
                }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
