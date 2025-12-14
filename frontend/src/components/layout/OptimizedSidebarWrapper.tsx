"use client";

import * as React from "react";
import { UserRole } from "@/types/user.types";
import { Sidebar } from "./Sidebar";

interface OptimizedSidebarWrapperProps {
  userRole?: UserRole;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  onClose?: () => void;
  className?: string;
}

// Lazy load the Sidebar component to reduce initial bundle size
const LazySidebar = React.lazy(() => 
  import('./Sidebar').then(module => ({ 
    default: module.Sidebar 
  }))
);

export function OptimizedSidebarWrapper(props: OptimizedSidebarWrapperProps) {
  return (
    <React.Suspense 
      fallback={
        <div className="w-64 h-screen bg-white border-r border-slate-200 animate-pulse">
          <div className="h-20 border-b border-slate-200" />
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      }
    >
      <LazySidebar {...props} />
    </React.Suspense>
  );
}
