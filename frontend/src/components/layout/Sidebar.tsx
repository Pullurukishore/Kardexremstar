"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/user.types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NavItemSkeleton } from "@/components/ui/NavigationLoading";
import { preloadRoute } from "@/lib/browser";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChevronLeft,
  ChevronDown,
  LogOut,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import { getNavigationForRole, type NavItem } from "./navigationConfig";

// Constants
const MOBILE_BREAKPOINT = 1024;
const INITIAL_LOAD_DELAY = 20;

// Kardex brand colors
const KARDEX_PRIMARY = "#507295"; // Steel blue from logo

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  userRole?: UserRole;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  onClose?: () => void;
}

// Memoized Nav Item Component
const MemoizedNavItem = React.memo(({ 
  item, 
  pathname, 
  collapsed, 
  isMobile, 
  level = 0,
  onItemClick,
  onSectionToggle,
  expandedSections 
}: {
  item: NavItem;
  pathname: string | null;
  collapsed: boolean;
  isMobile: boolean;
  level?: number;
  onItemClick: (e: React.MouseEvent, item: NavItem) => void;
  onSectionToggle: (href: string) => void;
  expandedSections: Record<string, boolean>;
}) => {
  const isActive = pathname?.startsWith(item.href) ?? false;
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedSections[item.href] ?? false;
  const Icon = item.icon;

  if (item.disabled) {
    return null;
  }

  return (
    <div className={cn("relative")}>
      <div className={cn("relative", {
        "mb-1": hasChildren && isExpanded
      })}>
        <motion.button
          onClick={(e) => hasChildren ? onSectionToggle(item.href) : onItemClick(e, item)}
          onMouseEnter={() => !isMobile && preloadRoute(item.href)}
          aria-current={isActive && !hasChildren ? 'page' : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-label={item.title}
          whileHover={{ x: collapsed ? 0 : 4 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "group relative flex items-center rounded-xl transition-all duration-300 ease-out w-full focus:outline-none focus:ring-2 focus:ring-purple-600/50 focus:ring-offset-2 focus:ring-offset-transparent",
            isMobile ? "px-3 py-3 text-base font-medium min-h-[56px]" : "px-2.5 py-2.5 text-sm font-medium",
            isActive && !hasChildren
              ? "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
              : "text-slate-600 hover:text-slate-900 hover:bg-gradient-to-r hover:from-white hover:to-slate-50 hover:shadow-md",
            level > 0 && !isMobile ? `pl-${level * 2 + 2.5}` : "",
            isMobile ? "touch-manipulation" : ""
          )}
          title={collapsed && !isMobile ? item.title : undefined}
        >
          {/* Active indicator line */}
          {!hasChildren && isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-r-full bg-white/80 shadow-lg shadow-white/50"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          
          {/* Icon container */}
          <div className={cn(
            "flex-shrink-0 rounded-xl transition-all duration-300 relative z-10 flex items-center justify-center",
            isMobile ? "h-10 w-10" : "h-9 w-9",
            isActive && !hasChildren
              ? "bg-white/20 shadow-inner backdrop-blur-sm"
              : cn(item.iconBgColor, "group-hover:shadow-lg group-hover:scale-110")
          )}>
            <Icon
              className={cn(
                "transition-all duration-300",
                isMobile ? "h-5 w-5" : "h-4 w-4",
                isActive && !hasChildren
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
                "truncate font-semibold text-left tracking-tight",
                isMobile ? "text-base" : "text-sm"
              )}>
                {item.title}
              </span>
              
              {hasChildren && (
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-2"
                >
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-white/70" : "text-slate-400"
                  )} />
                </motion.span>
              )}
              
              {item.badge && (
                <span className={cn(
                  "ml-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 font-bold text-white shadow-lg shadow-purple-600/30",
                  isMobile ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
                )}>
                  {item.badge}
                </span>
              )}
            </span>
          )}
          
          {/* Tooltip when collapsed */}
          {collapsed && !isMobile && (
            <div className={cn(
              "pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white shadow-2xl z-[100]",
              "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
            )}>
              {item.title}
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
            </div>
          )}
        </motion.button>
      </div>
      
      {/* Children items */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("overflow-hidden", {
              "ml-4 pl-3 border-l-2 border-purple-600/30": !isMobile
            })}
          >
            <div className="pt-1 space-y-0.5">
              {item.children?.map((child) => (
                <MemoizedNavItem
                  key={child.href}
                  item={child}
                  pathname={pathname}
                  collapsed={collapsed}
                  isMobile={isMobile}
                  level={level + 1}
                  onItemClick={onItemClick}
                  onSectionToggle={onSectionToggle}
                  expandedSections={expandedSections}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MemoizedNavItem.displayName = 'MemoizedNavItem';

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
  const [isMobile, setIsMobile] = React.useState(false);
  const [isInitialLoad, setIsInitialLoad] = React.useState(true);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, INITIAL_LOAD_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const filteredNavItems = React.useMemo(() => {
    if (!userRole) return [];
    return getNavigationForRole(userRole);
  }, [userRole]);

  const handleItemClick = React.useCallback((e: React.MouseEvent, item: NavItem) => {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    
    e.preventDefault();
    router.push(item.href);
    
    if (isMobile) {
      onClose?.();
    }
  }, [router, onClose, isMobile]);

  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});

  const toggleSection = React.useCallback((href: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  }, []);

  const navItems = React.useMemo(() => {
    if (isInitialLoad) {
      return Array.from({ length: 6 }, (_, index) => (
        <div key={`skeleton-${index}`} className={cn("mb-1", isMobile ? "px-6" : "px-4")}>
          <NavItemSkeleton isMobile={isMobile} collapsed={collapsed} />
        </div>
      ));
    }
    
    return (
      <div className="space-y-1">
        {filteredNavItems.map((item) => (
          <MemoizedNavItem
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            isMobile={isMobile}
            onItemClick={handleItemClick}
            onSectionToggle={toggleSection}
            expandedSections={expandedSections}
          />
        ))}
      </div>
    );
  }, [filteredNavItems, pathname, collapsed, isMobile, isInitialLoad, handleItemClick, toggleSection, expandedSections]);

  return (
    <motion.div
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "fixed left-0 top-0 z-[60] flex h-screen flex-col",
        "bg-gradient-to-b from-slate-100 via-slate-150 to-slate-200/70",
        "border-r border-purple-600/20",
        "shadow-xl shadow-purple-600/15",
        "transition-all duration-300 ease-out",
        isMobile 
          ? "w-80"
          : collapsed ? "w-[72px]" : "w-64",
        className
      )}
      role="navigation"
      aria-label="Primary"
    >
      {/* Top gradient accent bar - Blue to Purple */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600" />
      
      {/* Animated background glows - Blue to Purple */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-32 left-1/3 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />

      {/* Header */}
      <div className={cn(
        "relative flex items-center justify-between border-b border-slate-200/50",
        "bg-white/90 backdrop-blur-xl",
        isMobile ? "h-16 px-5" : "h-[72px] px-3"
      )}>
        <div suppressHydrationWarning className="flex-1 flex items-center justify-center">
          {(!collapsed || isMobile) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2.5"
            >
              <div className="relative">
                <Image 
                  src="/favicon-circle.svg" 
                  alt="Kardex Logo" 
                  width={isMobile ? 36 : 40} 
                  height={isMobile ? 36 : 40} 
                  className="rounded-xl shadow-lg shadow-purple-600/20"
                  priority
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
              </div>
              <Image 
                src="/kardex.png" 
                alt="Kardex" 
                width={isMobile ? 180 : 200} 
                height={isMobile ? 56 : 62} 
                className="transition-transform duration-200"
                style={{ width: 'auto', height: 'auto' }}
                priority
              />
            </motion.div>
          )}
          {collapsed && !isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative"
            >
              <Image 
                src="/favicon-circle.svg" 
                alt="Kardex Logo" 
                width={36} 
                height={36} 
                className="rounded-xl shadow-lg shadow-purple-600/20"
                priority
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full border-2 border-white shadow-sm animate-pulse" />
            </motion.div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-2 rounded-xl transition-all duration-300",
            "text-slate-400 hover:text-purple-600",
            "hover:bg-purple-600/10 hover:shadow-md",
            "active:scale-95",
            isMobile ? "h-10 w-10" : "h-8 w-8"
          )}
          onClick={() => isMobile ? onClose?.() : setCollapsed?.(!collapsed)}
        >
          {isMobile ? (
            <X className="h-5 w-5" />
          ) : collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <div suppressHydrationWarning>
          {(!collapsed || isMobile) ? (
            <nav className={cn(
              "space-y-1",
              isMobile ? "px-4" : "px-3"
            )}>
              <AnimatePresence mode="wait">
                {navItems}
              </AnimatePresence>
            </nav>
          ) : (
            /* Collapsed icons only */
            <nav className="px-2 space-y-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname?.startsWith(item.href);
                return (
                  <motion.button
                    key={item.href}
                    onClick={(e) => handleItemClick(e, item)}
                    onMouseEnter={() => preloadRoute(item.href)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "group relative flex items-center justify-center w-full h-12 rounded-xl transition-all duration-300",
                      isActive
                        ? "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
                        : cn(item.iconBgColor, "hover:shadow-lg hover:scale-105")
                    )}
                    title={item.title}
                  >
                    <Icon className={cn(
                      "h-5 w-5 transition-all",
                      isActive ? "text-white drop-shadow-sm" : item.iconColor
                    )} />
                    
                    {/* Tooltip */}
                    <div className={cn(
                      "pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white shadow-2xl z-[100]",
                      "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                    )}>
                      {item.title}
                      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                    </div>
                  </motion.button>
                );
              })}
            </nav>
          )}
        </div>
      </ScrollArea>

      {/* Logout */}
      <div className={cn(
        "relative border-t border-slate-200/50",
        "bg-white/90 backdrop-blur-xl",
        isMobile ? "px-4 py-4" : "px-3 py-3"
      )}>
        <motion.button
          onClick={() => logout?.()}
          whileHover={{ x: collapsed ? 0 : 4 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Logout"
          className={cn(
            "group w-full flex items-center rounded-xl transition-all duration-300",
            "focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2",
            "hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:shadow-md text-slate-600 hover:text-red-600",
            isMobile ? "px-3 py-3 text-base" : collapsed ? "justify-center py-2.5" : "px-2.5 py-2.5 text-sm"
          )}
        >
          <div className={cn(
            "flex-shrink-0 rounded-xl transition-all duration-300 flex items-center justify-center",
            "bg-red-50 group-hover:bg-red-100 group-hover:shadow-lg group-hover:scale-110",
            isMobile ? "h-10 w-10" : "h-9 w-9"
          )}>
            <LogOut className={cn(
              "transition-all duration-300 text-red-500 group-hover:text-red-600",
              isMobile ? "h-5 w-5" : "h-4 w-4"
            )} />
          </div>
          {(!collapsed || isMobile) && (
            <span className={cn(
              "font-semibold tracking-tight",
              isMobile ? "ml-3" : "ml-2.5"
            )}>Logout</span>
          )}
          
          {/* Tooltip when collapsed */}
          {collapsed && !isMobile && (
            <div className={cn(
              "pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white shadow-2xl z-[100]",
              "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
            )}>
              Logout
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45" />
            </div>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
} 
