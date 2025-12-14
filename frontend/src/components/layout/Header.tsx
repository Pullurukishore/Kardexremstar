'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Menu, LogOut, ChevronDown, Ticket, Zap, Shield, Users, Bell, Search, Sparkles, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/user.types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

// Kardex brand colors
const KARDEX_PRIMARY = "#507295"; // Steel blue from logo
const KARDEX_LIGHT = "#6889ab";
const KARDEX_DARK = "#3d5a78";

interface HeaderProps {
  onMenuClick: () => void;
  className?: string;
  isMobile?: boolean;
  sidebarOpen?: boolean;
  showSidebar?: boolean;
}

export function Header({ onMenuClick, className, isMobile = false, sidebarOpen = false, showSidebar = true }: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
    }
  };

  const getEmailInitial = () => {
    if (!user?.email) return 'U';
    return user.email[0].toUpperCase();
  };
  
  const getUserDisplayName = () => {
    if (!user) return 'User';
    
    const name = user.name?.trim();
    if (name && name !== '' && name !== 'null' && name !== 'undefined' && name !== 'User') {
      return name;
    }
    if (user.email) {
      const emailUsername = user.email.split('@')[0];
      return emailUsername;
    }
    return 'User';
  };

  const getRoleDisplayName = (role?: UserRole) => {
    if (!role) return 'User';
    return role
      .toLowerCase()
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-lg shadow-purple-600/30';
      case UserRole.ZONE_MANAGER:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg shadow-blue-500/30';
      case UserRole.ZONE_USER:
        return 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-0 shadow-lg shadow-cyan-500/30';
      case UserRole.SERVICE_PERSON:
        return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/30';
      case UserRole.EXPERT_HELPDESK:
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg shadow-amber-500/30';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };
  
  const getAvatarGradient = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'from-blue-600 via-purple-600 to-indigo-600';
      case UserRole.ZONE_MANAGER:
        return 'from-blue-500 via-blue-600 to-blue-700';
      case UserRole.ZONE_USER:
        return 'from-cyan-500 via-cyan-600 to-cyan-700';
      case UserRole.SERVICE_PERSON:
        return 'from-emerald-500 via-emerald-600 to-emerald-700';
      case UserRole.EXPERT_HELPDESK:
        return 'from-amber-500 via-amber-600 to-amber-700';
      default:
        return 'from-blue-600 via-purple-600 to-indigo-600';
    }
  };

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        'relative z-50',
        'bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100',
        'border-b border-purple-600/20',
        'shadow-lg shadow-purple-600/10',
        className
      )}
      suppressHydrationWarning
    >
      {/* Top gradient accent - Blue to Purple */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600" />
      
      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-600/30 to-transparent" />
      
      {/* Subtle background glow - Blue to Purple */}
      <div className="absolute top-0 right-1/4 w-96 h-20 bg-gradient-to-r from-purple-600/5 via-indigo-600/5 to-transparent blur-3xl pointer-events-none" />
      
      <div className={cn(
        "relative flex items-center justify-between",
        isMobile ? "h-18 px-5" : "h-[72px] px-8"
      )}>
        {/* Left section */}
        <motion.div 
          className="flex items-center gap-4"
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          {showSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "lg:hidden rounded-xl",
                "text-slate-500 hover:text-purple-600",
                "hover:bg-purple-600/10 hover:shadow-md",
                "transition-all duration-300",
                isMobile ? "h-11 w-11" : "h-10 w-10"
              )}
              onClick={onMenuClick}
            >
              <Menu className={cn(
                "transition-transform duration-200",
                isMobile ? "h-6 w-6" : "h-5 w-5"
              )} />
              <span className="sr-only">Toggle menu</span>
            </Button>
          )}
          
          {/* Title section */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                Field Service Management
              </h1>
            </div>
          </div>
        </motion.div>

        {/* Right section */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ x: 10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {/* Time display */}
          {hasMounted && (
            <div className={cn(
              "items-center gap-2 px-3 py-2 rounded-xl",
              "bg-gradient-to-r from-slate-50 to-purple-600/5",
              "border border-slate-200/50",
              "shadow-sm",
              isMobile ? "hidden" : "hidden lg:flex"
            )}>
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" style={{ animationDuration: '2s' }} />
              </div>
              <span className="text-sm font-semibold text-slate-700">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-medium text-slate-500">
                {currentTime.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          )}
          


          {/* Divider */}
          <div className={cn(
            "w-px h-8 bg-gradient-to-b from-transparent via-slate-200 to-transparent",
            isMobile ? "hidden" : "hidden sm:block"
          )} />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "rounded-xl transition-all duration-300",
                "hover:bg-gradient-to-r hover:from-slate-50 hover:to-purple-600/10",
                "hover:shadow-md",
                "border border-transparent hover:border-purple-600/20",
                  isMobile ? "h-11 px-2" : "h-11 px-2.5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Avatar className={cn(
                      "ring-2 ring-offset-1 ring-offset-white shadow-lg transition-all",
                      "ring-purple-600/40",
                      isMobile ? "h-9 w-9" : "h-9 w-9"
                    )}>
                      <AvatarFallback className={cn(
                        "bg-gradient-to-br text-white font-bold text-sm",
                        getAvatarGradient(user?.role)
                      )}>
                        {getEmailInitial()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm",
                      isOnline ? "bg-gradient-to-br from-emerald-400 to-green-500" : "bg-gray-400"
                    )} />
                  </div>
                  
                  <div className={cn(
                    "text-left",
                    isMobile ? "hidden" : "hidden sm:block"
                  )}>
                    <p className="text-sm font-semibold text-slate-800 truncate max-w-[100px]">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 truncate max-w-[100px]">
                      {getRoleDisplayName(user?.role)}
                    </p>
                  </div>
                  
                  <ChevronDown className={cn(
                    "h-4 w-4 text-slate-400 transition-transform duration-200",
                    isMobile ? "hidden" : "hidden sm:block"
                  )} />
                </div>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent
              className="w-80 bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-2xl p-0 overflow-hidden"
              align="end"
              forceMount
            >
              {/* User header */}
              <div className="p-5 bg-gradient-to-br from-slate-50 via-purple-600/5 to-indigo-600/5 border-b border-slate-200/50">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 ring-2 ring-offset-2 ring-offset-white ring-purple-600/30 shadow-xl">
                    <AvatarFallback className={cn(
                      "bg-gradient-to-br text-white font-bold text-xl",
                      getAvatarGradient(user?.role)
                    )}>
                      {getEmailInitial()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-800 truncate">
                      {getUserDisplayName()}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {user.email}
                      </p>
                    )}
                    {user?.role && (
                      <Badge className={cn(
                        "mt-2 text-[10px] px-2.5 py-0.5 font-semibold",
                        getRoleBadgeStyle(user.role)
                      )}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Online status */}
                <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-white/80 rounded-xl border border-slate-100">
                  <div className="relative">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isOnline ? "bg-emerald-500" : "bg-gray-400"
                    )} />
                    {isOnline && (
                      <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  <Activity className="w-3 h-3 text-slate-400 ml-auto" />
                </div>
              </div>
              
              {/* Admin options */}
              {user?.role === 'ADMIN' && (
                <>
                  <div className="p-2">
                    <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Administration
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <a href="/admin/manage-admins" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-purple-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50/50 transition-all cursor-pointer group">
                        <div className="p-2 bg-purple-100 rounded-xl group-hover:scale-110 group-hover:shadow-md transition-all">
                          <Shield className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="font-semibold text-sm">Manage Admins</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/admin/manage-external" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100/50 transition-all cursor-pointer group">
                        <div className="p-2 bg-blue-100 rounded-xl group-hover:scale-110 group-hover:shadow-md transition-all">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-semibold text-sm">External Users</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/admin/manage-expert-helpdesk" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-amber-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100/50 transition-all cursor-pointer group">
                        <div className="p-2 bg-amber-100 rounded-xl group-hover:scale-110 group-hover:shadow-md transition-all">
                          <Zap className="h-4 w-4 text-amber-600" />
                        </div>
                        <span className="font-semibold text-sm">Expert Helpdesk</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/admin/pin-management" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-cyan-700 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-cyan-100/50 transition-all cursor-pointer group">
                        <div className="p-2 bg-cyan-100 rounded-xl group-hover:scale-110 group-hover:shadow-md transition-all">
                          <svg className="h-4 w-4 text-cyan-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 7a2 2 0 1 0-4 0v2a2 2 0 1 0 4 0V7z"/><path d="M12 15v2"/><circle cx="12" cy="12" r="10"/></svg>
                        </div>
                        <span className="font-semibold text-sm">Pin Management</span>
                      </a>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                </>
              )}

              {/* Expert Helpdesk options */}
              {user?.role === 'EXPERT_HELPDESK' && (
                <>
                  <div className="p-2">
                    <DropdownMenuItem asChild>
                      <a href="/expert/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-amber-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100/50 transition-all cursor-pointer group">
                        <div className="p-2 bg-amber-100 rounded-xl group-hover:scale-110 group-hover:shadow-md transition-all">
                          <Zap className="h-4 w-4 text-amber-600" />
                        </div>
                        <span className="font-semibold text-sm">Expert Dashboard</span>
                      </a>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                </>
              )}
              
              {/* Logout */}
              <div className="p-2">
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100/50 transition-all cursor-pointer group"
                >
                  <div className="p-2 bg-red-100 rounded-xl group-hover:scale-110 group-hover:shadow-md transition-all">
                    <LogOut className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="font-semibold text-sm">Sign Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </div>
    </motion.header>
  );
}
