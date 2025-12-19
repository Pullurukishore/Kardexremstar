'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Menu, LogOut, ChevronDown, Zap, Shield, Users, Activity } from 'lucide-react';
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
const KARDEX_ACCENT = "#aac01d"; // Lime green accent
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
  const [isOnline, setIsOnline] = useState(true);
  
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
        return 'bg-gradient-to-r from-[#507295] to-[#3d7a9e] text-white border-0 shadow-lg shadow-[#507295]/30';
      case UserRole.ZONE_MANAGER:
        return 'bg-gradient-to-r from-[#507295] to-[#6889ab] text-white border-0 shadow-lg shadow-[#507295]/30';
      case UserRole.ZONE_USER:
        return 'bg-gradient-to-r from-[#6889ab] to-[#7a9cb8] text-white border-0 shadow-lg shadow-[#6889ab]/30';
      case UserRole.SERVICE_PERSON:
        return 'bg-gradient-to-r from-[#aac01d] to-[#96b216] text-white border-0 shadow-lg shadow-[#aac01d]/30';
      case UserRole.EXPERT_HELPDESK:
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg shadow-amber-500/30';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };
  
  const getAvatarGradient = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'from-[#507295] via-[#3d7a9e] to-[#2c5a7e]';
      case UserRole.ZONE_MANAGER:
        return 'from-[#507295] via-[#5a8bab] to-[#6889ab]';
      case UserRole.ZONE_USER:
        return 'from-[#6889ab] via-[#7a9cb8] to-[#8aacca]';
      case UserRole.SERVICE_PERSON:
        return 'from-[#aac01d] via-[#96b216] to-[#82a010]';
      case UserRole.EXPERT_HELPDESK:
        return 'from-amber-500 via-amber-600 to-amber-700';
      default:
        return 'from-[#507295] via-[#3d7a9e] to-[#2c5a7e]';
    }
  };

  // Role-based URL helpers
  const getNewTicketUrl = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/tickets/create';
      case UserRole.ZONE_MANAGER:
      case UserRole.ZONE_USER:
        return '/zone/tickets/create';
      case UserRole.EXPERT_HELPDESK:
        return '/expert/tickets/create';
      case UserRole.EXTERNAL_USER:
        return '/external/tickets/create';
      default:
        return '/admin/tickets/create';
    }
  };

  const getNewOfferUrl = () => {
    switch (user?.role) {
      case UserRole.ADMIN:
        return '/admin/offers/new';
      case UserRole.ZONE_MANAGER:
      case UserRole.ZONE_USER:
        return '/zone/offers/new';
      case UserRole.EXPERT_HELPDESK:
        return '/expert/offers/new';
      default:
        return '/admin/offers/new';
    }
  };

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        'relative z-50',
        'bg-white/90 backdrop-blur-2xl',
        'border-b border-[#507295]/10',
        'shadow-[0_4px_30px_-4px_rgba(80,114,149,0.12)]',
        className
      )}
      suppressHydrationWarning
    >
      {/* Top gradient accent - Kardex brand colors */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#507295] via-[#6889ab] to-[#aac01d]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#507295] via-[#6889ab] to-[#aac01d] blur-sm opacity-50" />
      </div>
      
      {/* Subtle animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 right-0 w-[500px] h-48 bg-gradient-to-bl from-[#507295]/[0.03] via-[#6889ab]/[0.02] to-transparent blur-3xl" />
        <div className="absolute -top-12 left-1/4 w-80 h-36 bg-gradient-to-br from-[#aac01d]/[0.04] via-transparent to-transparent blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#507295]/10 to-transparent" />
      </div>
      
      <div className={cn(
        "relative flex items-center justify-between",
        isMobile ? "h-18 px-5" : "h-[76px] px-8"
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
                "text-[#507295] hover:text-[#3d5a78]",
                "hover:bg-gradient-to-br hover:from-[#507295]/10 hover:to-[#507295]/5",
                "hover:shadow-lg hover:shadow-[#507295]/10",
                "transition-all duration-300",
                "border border-transparent hover:border-[#507295]/15",
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
          
          {/* Title section with enhanced styling */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              {/* Decorative element */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[#507295] to-[#aac01d] rounded-full opacity-80" />
              
              <div className="pl-2">
                <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold tracking-tight leading-tight">
                  <span className="bg-gradient-to-r from-[#3d5a78] via-[#507295] to-[#6889ab] bg-clip-text text-transparent">
                    Kardex
                  </span>
                  <span className="text-[#507295]/20 mx-2 font-light">|</span>
                  <span className="bg-gradient-to-r from-[#507295] via-[#6889ab] to-[#aac01d] bg-clip-text text-transparent">
                    Field Service
                  </span>
                </h1>
                <p className="text-[11px] font-medium text-[#507295]/50 tracking-wide uppercase mt-0.5 hidden sm:block">
                  Management System
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right section */}
        <motion.div 
          className="flex items-center gap-4"
          initial={{ x: 10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {/* Quick Action Buttons - Hidden for Service Person */}
          {user?.role !== UserRole.SERVICE_PERSON && (
            <div className={cn(
              "flex items-center gap-3",
              isMobile ? "hidden" : "hidden md:flex"
            )}>
              {/* New Ticket Button */}
              <a href={getNewTicketUrl()}>
                <Button
                  variant="ghost"
                  className={cn(
                    "relative overflow-hidden rounded-xl px-4 py-2.5 h-11",
                    "bg-gradient-to-r from-[#507295] to-[#6889ab]",
                    "hover:from-[#3d5a78] hover:to-[#507295]",
                    "text-white font-semibold text-sm",
                    "shadow-lg shadow-[#507295]/25 hover:shadow-xl hover:shadow-[#507295]/30",
                    "transition-all duration-300",
                    "hover:scale-105 active:scale-95",
                    "border border-white/10",
                    "group"
                  )}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  
                  <span className="relative flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Ticket</span>
                  </span>
                </Button>
              </a>
              
              {/* New Offer Button */}
              <a href={getNewOfferUrl()}>
                <Button
                  variant="ghost"
                  className={cn(
                    "relative overflow-hidden rounded-xl px-4 py-2.5 h-11",
                    "bg-gradient-to-r from-[#aac01d] to-[#96b216]",
                    "hover:from-[#96b216] hover:to-[#82a010]",
                    "text-white font-semibold text-sm",
                    "shadow-lg shadow-[#aac01d]/25 hover:shadow-xl hover:shadow-[#aac01d]/30",
                    "transition-all duration-300",
                    "hover:scale-105 active:scale-95",
                    "border border-white/10",
                    "group"
                  )}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  
                  <span className="relative flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>New Offer</span>
                  </span>
                </Button>
              </a>
            </div>
          )}

          {/* Divider */}
          <div className={cn(
            "w-px h-10 bg-gradient-to-b from-transparent via-[#507295]/15 to-transparent",
            isMobile ? "hidden" : "hidden md:block"
          )} />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "rounded-2xl transition-all duration-300",
                  "hover:bg-gradient-to-r hover:from-[#507295]/[0.08] hover:via-white hover:to-[#aac01d]/[0.05]",
                  "hover:shadow-xl hover:shadow-[#507295]/10",
                  "border border-transparent hover:border-[#507295]/15",
                  "group",
                  isMobile ? "h-12 px-2" : "h-14 px-4"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {/* Avatar ambient glow */}
                    <div className={cn(
                      "absolute -inset-1.5 rounded-full opacity-0 group-hover:opacity-60 transition-all duration-500 blur-lg",
                      "bg-gradient-to-br",
                      getAvatarGradient(user?.role)
                    )} />
                    
                    {/* Avatar ring animation on hover */}
                    <div className={cn(
                      "absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300",
                      "ring-2 ring-[#507295]/20"
                    )} />
                    
                    <Avatar className={cn(
                      "relative ring-2 ring-offset-2 ring-offset-white shadow-lg transition-all duration-300",
                      "ring-[#507295]/25 group-hover:ring-[#507295]/40",
                      "group-hover:scale-110",
                      isMobile ? "h-9 w-9" : "h-11 w-11"
                    )}>
                      <AvatarFallback className={cn(
                        "bg-gradient-to-br text-white font-bold",
                        isMobile ? "text-sm" : "text-base",
                        getAvatarGradient(user?.role)
                      )}>
                        {getEmailInitial()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Online status indicator */}
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[2.5px] border-white shadow-md transition-all duration-300",
                      isOnline 
                        ? "bg-gradient-to-br from-[#aac01d] to-[#96b216]" 
                        : "bg-gray-400"
                    )}>
                      {isOnline && (
                        <div className="absolute inset-0 rounded-full bg-[#aac01d] animate-ping opacity-40" style={{ animationDuration: '2s' }} />
                      )}
                    </div>
                  </div>
                  
                  <div className={cn(
                    "text-left",
                    isMobile ? "hidden" : "hidden sm:block"
                  )}>
                    <p className="text-sm font-bold text-[#3d5a78] truncate max-w-[130px] group-hover:text-[#507295] transition-colors">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-[11px] font-semibold text-[#507295]/50 truncate max-w-[130px]">
                      {getRoleDisplayName(user?.role)}
                    </p>
                  </div>
                  
                  <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-lg bg-[#507295]/5 group-hover:bg-[#507295]/10 transition-all",
                    isMobile ? "hidden" : "hidden sm:flex"
                  )}>
                    <ChevronDown className="h-3.5 w-3.5 text-[#507295]/60 transition-all duration-300 group-hover:text-[#507295] group-hover:translate-y-0.5" />
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent
              className="w-80 bg-white/[0.97] backdrop-blur-2xl border border-[#507295]/10 shadow-2xl shadow-[#507295]/15 rounded-2xl p-0 overflow-hidden"
              align="end"
              forceMount
            >
              {/* User header with premium styling */}
              <div className="relative p-6 border-b border-[#507295]/10 overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#507295]/5 via-white to-[#aac01d]/5" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#aac01d]/10 via-transparent to-transparent blur-2xl" />
                
                <div className="relative flex items-center gap-4">
                  <div className="relative">
                    <div className={cn(
                      "absolute -inset-2 rounded-full blur-xl opacity-40",
                      "bg-gradient-to-br",
                      getAvatarGradient(user?.role)
                    )} />
                    <Avatar className="relative h-16 w-16 ring-3 ring-offset-2 ring-offset-white ring-[#507295]/20 shadow-xl">
                      <AvatarFallback className={cn(
                        "bg-gradient-to-br text-white font-bold text-2xl",
                        getAvatarGradient(user?.role)
                      )}>
                        {getEmailInitial()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-[#3d5a78] truncate">
                      {getUserDisplayName()}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-[#507295]/60 truncate mt-0.5">
                        {user.email}
                      </p>
                    )}
                    {user?.role && (
                      <Badge className={cn(
                        "mt-2.5 text-[10px] px-3 py-1 font-bold",
                        getRoleBadgeStyle(user.role)
                      )}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Online status card */}
                <div className="relative mt-5 flex items-center gap-3 px-4 py-3 bg-white/80 rounded-xl border border-[#507295]/10 shadow-sm">
                  <div className="relative">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      isOnline ? "bg-gradient-to-br from-[#aac01d] to-[#96b216]" : "bg-gray-400"
                    )} />
                    {isOnline && (
                      <div className="absolute inset-0 w-3 h-3 bg-[#aac01d] rounded-full animate-ping opacity-40" style={{ animationDuration: '2s' }} />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[#3d5a78]">
                    {isOnline ? 'Online & Active' : 'Offline'}
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1 px-2 py-1 bg-[#507295]/5 rounded-lg">
                    <Activity className="w-3 h-3 text-[#507295]/60" />
                    <span className="text-[10px] font-medium text-[#507295]/60">Active</span>
                  </div>
                </div>
              </div>
              
              {/* Admin options */}
              {user?.role === 'ADMIN' && (
                <>
                  <div className="p-2">
                    <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold text-[#507295]/40 uppercase tracking-widest">
                      Administration
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <a href="/admin/manage-admins" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#3d5a78] hover:text-[#507295] hover:bg-gradient-to-r hover:from-[#507295]/10 hover:to-[#507295]/5 transition-all cursor-pointer group">
                        <div className="p-2.5 bg-gradient-to-br from-[#507295]/10 to-[#507295]/5 rounded-xl group-hover:from-[#507295]/15 group-hover:to-[#507295]/10 group-hover:scale-110 group-hover:shadow-lg transition-all">
                          <Shield className="h-4 w-4 text-[#507295]" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm block">Manage Admins</span>
                          <span className="text-[10px] text-[#507295]/50">System administrators</span>
                        </div>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/admin/manage-external" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#3d5a78] hover:text-[#507295] hover:bg-gradient-to-r hover:from-[#6889ab]/10 hover:to-[#6889ab]/5 transition-all cursor-pointer group">
                        <div className="p-2.5 bg-gradient-to-br from-[#6889ab]/10 to-[#6889ab]/5 rounded-xl group-hover:from-[#6889ab]/15 group-hover:to-[#6889ab]/10 group-hover:scale-110 group-hover:shadow-lg transition-all">
                          <Users className="h-4 w-4 text-[#6889ab]" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm block">External Users</span>
                          <span className="text-[10px] text-[#507295]/50">Customer accounts</span>
                        </div>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/admin/manage-expert-helpdesk" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#3d5a78] hover:text-amber-600 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100/50 transition-all cursor-pointer group">
                        <div className="p-2.5 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl group-hover:from-amber-100 group-hover:to-amber-50 group-hover:scale-110 group-hover:shadow-lg transition-all">
                          <Zap className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm block">Expert Helpdesk</span>
                          <span className="text-[10px] text-[#507295]/50">Support specialists</span>
                        </div>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/admin/pin-management" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#3d5a78] hover:text-[#aac01d] hover:bg-gradient-to-r hover:from-[#aac01d]/10 hover:to-[#aac01d]/5 transition-all cursor-pointer group">
                        <div className="p-2.5 bg-gradient-to-br from-[#aac01d]/10 to-[#aac01d]/5 rounded-xl group-hover:from-[#aac01d]/15 group-hover:to-[#aac01d]/10 group-hover:scale-110 group-hover:shadow-lg transition-all">
                          <svg className="h-4 w-4 text-[#aac01d]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 7a2 2 0 1 0-4 0v2a2 2 0 1 0 4 0V7z"/><path d="M12 15v2"/><circle cx="12" cy="12" r="10"/></svg>
                        </div>
                        <div>
                          <span className="font-semibold text-sm block">Pin Management</span>
                          <span className="text-[10px] text-[#507295]/50">Access control</span>
                        </div>
                      </a>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-[#507295]/10 to-transparent" />
                </>
              )}

              {/* Expert Helpdesk options */}
              {user?.role === 'EXPERT_HELPDESK' && (
                <>
                  <div className="p-2">
                    <DropdownMenuItem asChild>
                      <a href="/expert/dashboard" className="flex items-center gap-3 px-3 py-3 rounded-xl text-[#3d5a78] hover:text-amber-600 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100/50 transition-all cursor-pointer group">
                        <div className="p-2.5 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl group-hover:scale-110 group-hover:shadow-lg transition-all">
                          <Zap className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm block">Expert Dashboard</span>
                          <span className="text-[10px] text-[#507295]/50">Your workspace</span>
                        </div>
                      </a>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-[#507295]/10 to-transparent" />
                </>
              )}
              
              {/* Logout with enhanced styling */}
              <div className="p-2">
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100/50 transition-all cursor-pointer group"
                >
                  <div className="p-2.5 bg-gradient-to-br from-red-100 to-red-50 rounded-xl group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-red-200/50 transition-all">
                    <LogOut className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm block">Sign Out</span>
                    <span className="text-[10px] text-red-400">End your session</span>
                  </div>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </div>
    </motion.header>
  );
}
