"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/user.types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NavItemSkeleton } from "@/components/ui/NavigationLoading";
import { preloadRoute } from "@/lib/browser";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  Bell,
  MessageSquare,
  Box,
  ShoppingCart,
  BarChart2,
  AlertCircle,
  ClipboardList,
  MapPin,
  Menu,
  ChevronLeft,
  ChevronDown,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
  Calendar,
  Ticket,
  Activity,
  Sparkles,
} from "lucide-react";


type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children?: NavItem[];
  disabled?: boolean;
  badge?: string;
  iconColor?: string; // Custom icon color
  iconBgColor?: string; // Background color for icon
};

const navigation: NavItem[] = [
  // Admin
  { 
    title: "Dashboard", 
    href: "/admin/dashboard", 
    icon: LayoutDashboard, 
    roles: [UserRole.ADMIN],
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50"
  },
  { 
    title: "Daily Activity", 
    href: "/admin/attendance", 
    icon: Calendar, 
    roles: [UserRole.ADMIN],
    iconColor: "text-emerald-600",
    iconBgColor: "bg-emerald-50"
  },
  { 
    title: "Customers", 
    href: "/admin/customers", 
    icon: Users, 
    roles: [UserRole.ADMIN],
    iconColor: "text-purple-600",
    iconBgColor: "bg-purple-50"
  },
  { 
    title: "Service Persons", 
    href: "/admin/service-person", 
    icon: Activity, 
    roles: [UserRole.ADMIN],
    iconColor: "text-orange-600",
    iconBgColor: "bg-orange-50"
  },
  { 
    title: "Service Zones", 
    href: "/admin/service-zones", 
    icon: MapPin, 
    roles: [UserRole.ADMIN],
    iconColor: "text-rose-600",
    iconBgColor: "bg-rose-50"
  },
  { 
    title: "Zone Users", 
    href: "/admin/zone-users", 
    icon: Users, 
    roles: [UserRole.ADMIN],
    iconColor: "text-indigo-600",
    iconBgColor: "bg-indigo-50"
  },
  { 
    title: "Tickets", 
    href: "/admin/tickets", 
    icon: Ticket, 
    roles: [UserRole.ADMIN],
    iconColor: "text-cyan-600",
    iconBgColor: "bg-cyan-50"
  },
  { 
    title: "Reports", 
    href: "/admin/reports", 
    icon: BarChart2, 
    roles: [UserRole.ADMIN],
    iconColor: "text-amber-600",
    iconBgColor: "bg-amber-50"
  },

  // Service Person
  { 
    title: "Dashboard", 
    href: "/service-person/dashboard", 
    icon: LayoutDashboard, 
    roles: [UserRole.SERVICE_PERSON],
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50"
  },
  { 
    title: "My Tickets", 
    href: "/service-person/tickets", 
    icon: Ticket, 
    roles: [UserRole.SERVICE_PERSON],
    iconColor: "text-cyan-600",
    iconBgColor: "bg-cyan-50"
  },

  // Zone User
  { 
    title: "Dashboard", 
    href: "/zone/dashboard", 
    icon: LayoutDashboard, 
    roles: [UserRole.ZONE_USER],
    iconColor: "text-blue-600",
    iconBgColor: "bg-blue-50"
  },
  { 
    title: "Daily Activity", 
    href: "/zone/attendence", 
    icon: Calendar, 
    roles: [UserRole.ZONE_USER],
    iconColor: "text-emerald-600",
    iconBgColor: "bg-emerald-50"
  },
  { 
    title: "Service Persons", 
    href: "/zone/service-persons", 
    icon: Activity, 
    roles: [UserRole.ZONE_USER],
    iconColor: "text-orange-600",
    iconBgColor: "bg-orange-50"
  },
  { 
    title: "Customers", 
    href: "/zone/customers", 
    icon: Users, 
    roles: [UserRole.ZONE_USER],
    iconColor: "text-purple-600",
    iconBgColor: "bg-purple-50"
  },
  { 
    title: "Tickets", 
    href: "/zone/tickets", 
    icon: Ticket, 
    roles: [UserRole.ZONE_USER],
    iconColor: "text-cyan-600",
    iconBgColor: "bg-cyan-50"
  },
  { 
    title: "Reports", 
    href: "/zone/reports", 
    icon: BarChart2, 
    roles: [UserRole.ZONE_USER],
    iconColor: "text-amber-600",
    iconBgColor: "bg-amber-50"
  },
];

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  userRole?: UserRole;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  onClose?: () => void;
}

// Removed ClientOnly wrapper to prevent hydration delays
// Using suppressHydrationWarning for client-only content instead

export function Sidebar({
  userRole,
  onClose,
  className,
  collapsed = false,
  setCollapsed,
}: SidebarProps): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Respect prefers-reduced-motion for accessibility
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  // Handle initial load animation - reduced delay
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 50); // Reduced from 300ms to 50ms
    return () => clearTimeout(timer);
  }, []);


  const filteredNavItems = React.useMemo(() => {
    if (!userRole) return [];
    return navigation.filter((item) => item.roles.includes(userRole));
  }, [userRole]);

  const handleItemClick = React.useCallback((e: React.MouseEvent, item: NavItem) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    
    e.preventDefault();
    
    // Direct navigation without loading states for smooth experience
    router.push(item.href);
    
    // Close mobile sidebar immediately
    if (isMobile) {
      onClose?.();
    }
  }, [router, onClose, isMobile]);

  const handleItemHover = React.useCallback((item: NavItem) => {
    if (!isMobile && !item.disabled) {
      setHoveredItem(item.href);
      // Preload route on hover for faster navigation
      preloadRoute(item.href);
    }
  }, [isMobile]);

  const handleItemLeave = React.useCallback(() => {
    if (!isMobile) {
      setHoveredItem(null);
    }
  }, [isMobile]);


  const renderNavItem = React.useCallback((item: NavItem, index: number) => {
    const isActive = pathname?.startsWith(item.href) ?? false;
    const Icon = item.icon;
    const isHovered = hoveredItem === item.href;

    if (item.disabled) {
      return null;
    }

    return (
      <motion.div
        key={item.href}
        initial={isInitialLoad ? { opacity: 0, x: -10 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          duration: 0.15, // Reduced from 0.3s to 0.15s
          delay: isInitialLoad ? index * 0.02 : 0, // Reduced from 0.05 to 0.02
          ease: "easeOut" 
        }}
        suppressHydrationWarning
      >
          <motion.div
            whileHover={{ scale: isMobile ? 1 : 1.01, y: isMobile ? 0 : -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <button
              onClick={(e) => handleItemClick(e, item)}
              onMouseEnter={() => handleItemHover(item)}
              onMouseLeave={handleItemLeave}
              onTouchStart={() => isMobile && setHoveredItem(item.href)}
              onTouchEnd={() => isMobile && setHoveredItem(null)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.title}
              className={cn(
                "group relative flex items-center rounded-xl transition-all duration-200 ease-out w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent",
                // Mobile-optimized padding and sizing
                isMobile ? "px-3 py-3 text-base font-medium min-h-[56px]" : "px-2.5 py-2.5 text-sm font-medium",
                isActive
                  ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white/80 hover:shadow-md",
                // Mobile touch optimization
                isMobile ? "touch-manipulation" : ""
              )}
              title={collapsed && !isMobile ? item.title : undefined}
              >
                {/* Active indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div 
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      exit={{ scaleY: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white/80 shadow-sm" 
                    />
                  )}
                </AnimatePresence>
                
                {/* Hover glow effect */}
                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/8 via-indigo-500/8 to-purple-500/8" 
                    />
                  )}
                </AnimatePresence>
                
                {/* Icon with colored background */}
                <div className={cn(
                  "flex-shrink-0 rounded-lg transition-all duration-200 relative z-10 flex items-center justify-center",
                  isMobile ? "h-10 w-10" : "h-9 w-9",
                  isActive
                    ? "bg-white/20 shadow-lg"
                    : cn(item.iconBgColor, "group-hover:shadow-md group-hover:scale-105")
                )}>
                  <Icon
                    className={cn(
                      "transition-all duration-200",
                      isMobile ? "h-5 w-5" : "h-4 w-4",
                      isActive
                        ? "text-white drop-shadow-sm"
                        : cn(item.iconColor, "group-hover:scale-110")
                    )}
                  />
                </div>
                
                {(!collapsed || isMobile) && (
                  <span className={cn(
                    "flex flex-1 items-center justify-between relative z-10",
                    isMobile ? "ml-3" : "ml-2.5"
                  )}>
                    <span className={cn(
                      "truncate font-semibold",
                      isMobile ? "text-base" : "text-sm"
                    )}>{item.title}</span>
                    {item.badge && (
                      <motion.span
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={cn(
                          "ml-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 font-bold text-white shadow-lg",
                          isMobile ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
                        )}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                  </span>
                )}
                {/* Tooltip when collapsed */}
                {collapsed && !isMobile && (
                  <span
                    className={cn(
                      "pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900/95 px-2 py-1 text-xs font-medium text-white shadow-lg",
                      "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150"
                    )}
                    role="tooltip"
                  >
                    {item.title}
                  </span>
                )}
              </button>
            </motion.div>
      </motion.div>
    );
  }, [pathname, collapsed, hoveredItem, isMobile, isInitialLoad, handleItemClick, handleItemHover, handleItemLeave]);

  const navItems = React.useMemo(() => {
    if (isInitialLoad) {
      // Show skeletons during initial load - faster animations
      return Array.from({ length: filteredNavItems.length }, (_, index) => (
        <motion.div
          key={`skeleton-${index}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.1, delay: index * 0.01 }} // Much faster
          suppressHydrationWarning
        >
          <NavItemSkeleton isMobile={isMobile} collapsed={collapsed} />
        </motion.div>
      ));
    }
    
    return filteredNavItems.map((item, index) => renderNavItem(item, index));
  }, [filteredNavItems, renderNavItem, isInitialLoad, isMobile, collapsed]);

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-[60] flex h-screen flex-col bg-gradient-to-br from-white via-slate-50/80 to-blue-50/30 border-r border-slate-200/80 shadow-xl transition-all duration-300 ease-out",
        // Mobile-first responsive design
        isMobile 
          ? "w-80" // Wider on mobile for better touch targets
          : collapsed ? "w-16" : "w-64",
        className
      )}
      role="navigation"
      aria-label="Primary"
    >
      {/* Clean accent elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-60"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.02] via-transparent to-transparent pointer-events-none"></div>

      {/* Modern Header */}
      <div className={cn(
        "flex items-center justify-between border-b border-slate-200/50 bg-white/90 relative z-10 shadow-sm",
        // Mobile-optimized header height and padding
        isMobile ? "h-16 px-6" : "h-20 px-4"
      )}>
        <div suppressHydrationWarning>
          {(!collapsed || isMobile) && (
            <div className="flex items-center justify-center w-full gap-3">
              <Image 
                src="/favicon-circle.svg" 
                alt="Kardex Logo" 
                width={isMobile ? 36 : 40} 
                height={isMobile ? 36 : 40} 
                className="rounded-lg transition-all duration-200 hover:scale-105" // Reduced duration
                priority // Add priority for faster loading
              />
              <Image 
                src="/kardex.png" 
                alt="Kardex" 
                width={isMobile ? 200 : 240} 
                height={isMobile ? 62 : 75} 
                className="transition-all duration-200 hover:scale-105" // Reduced duration
                style={{ width: 'auto', height: 'auto' }}
                priority // Add priority for faster loading
              />
            </div>
          )}
          {collapsed && !isMobile && (
            <div className="flex items-center justify-center w-full">
              <Image 
                src="/favicon-circle.svg" 
                alt="Kardex Logo" 
                width={32} 
                height={32} 
                className="rounded-lg transition-all duration-200 hover:scale-105" // Reduced duration
                priority // Add priority for faster loading
              />
            </div>
          )}
        </div>

        {/* Mobile close button or desktop collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-slate-500 hover:text-slate-700 hover:bg-white/80 hover:shadow-sm rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent",
            isMobile ? "h-10 w-10" : "h-9 w-9"
          )}
          onClick={() => isMobile ? onClose?.() : setCollapsed?.(!collapsed)}
        >
          {isMobile ? (
            <X className={cn("transition-transform duration-300", isMobile ? "h-5 w-5" : "h-4 w-4")} />
          ) : collapsed ? (
            <ChevronRight className="h-4 w-4 transition-transform duration-300" />
          ) : (
            <ChevronLeft className="h-4 w-4 transition-transform duration-300" />
          )}
        </Button>
      </div>

      {/* Navigation Section */}
      <ScrollArea className={cn(
        "flex-1",
        isMobile ? "py-4" : "py-6"
      )}>
        <div suppressHydrationWarning>
          {(!collapsed || isMobile) && (
            <motion.nav 
              initial={isInitialLoad ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.1, delay: 0.02 }} // Much faster
              className={cn(
                "space-y-1",
                isMobile ? "px-6" : "px-4"
              )}
            >
              <AnimatePresence mode="wait">
                {navItems}
              </AnimatePresence>
            </motion.nav>
          )}
        </div>
      </ScrollArea>

        {/* Logout section */}
        <div className={cn(
          "border-t border-slate-200/60 bg-white/90 relative z-10 shadow-sm",
          isMobile ? "px-6 py-4" : "px-4 py-3"
        )}>
          <button
            onClick={() => logout?.()}
            aria-label="Logout"
            className={cn(
              "group w-full flex items-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-transparent",
              "hover:bg-red-50 hover:shadow-md text-slate-700 hover:text-red-700",
              isMobile ? "px-3 py-3 text-base" : "px-2.5 py-2.5 text-sm"
            )}
          >
            {/* Icon with colored background */}
            <div className={cn(
              "flex-shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center bg-red-50 group-hover:bg-red-100 group-hover:shadow-md group-hover:scale-105",
              isMobile ? "h-10 w-10" : "h-9 w-9"
            )}>
              <LogOut className={cn(
                "transition-all duration-200 text-red-600 group-hover:scale-110",
                isMobile ? "h-5 w-5" : "h-4 w-4"
              )} />
            </div>
            {(!collapsed || isMobile) && (
              <span className={cn(
                "font-semibold",
                isMobile ? "ml-3" : "ml-2.5"
              )}>Logout</span>
            )}
            {/* Tooltip when collapsed */}
            {collapsed && !isMobile && (
              <span
                className={cn(
                  "pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900/95 px-2 py-1 text-xs font-medium text-white shadow-lg",
                  "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150"
                )}
                role="tooltip"
              >
                Logout
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }