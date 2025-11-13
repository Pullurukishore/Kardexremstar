'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Menu, LogOut, ChevronDown, Activity, Ticket, Zap, Shield, Users } from 'lucide-react';
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
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  
  // Ensure time-dependent UI renders only after mount to avoid hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  // Monitor online status
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
      console.error('Logout failed:', error);
    }
  };

  const getEmailInitial = () => {
    if (!user?.email) return 'U';
    return user.email[0].toUpperCase();
  };
  
  const getUserDisplayName = () => {
    if (!user) return 'User';
    
    // Prioritize name, then email username, then fallback
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

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }} // Reduced from -100 to -20
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }} // Reduced from 0.6s to 0.2s
      className={cn(
        'relative z-50 border-b border-slate-200/60 shadow-xl',
        'bg-gradient-to-r from-white/98 via-slate-50/98 to-white/98 backdrop-blur-2xl',
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-600/3 before:via-indigo-600/3 before:to-purple-600/3 before:pointer-events-none',
        'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-blue-500/30 after:to-transparent',
        className
      )}
      suppressHydrationWarning
    >
      <div className={cn(
        "relative flex items-center justify-between",
        // Mobile-optimized header height and padding
        isMobile ? "h-16 px-4" : "h-20 px-4 md:px-6"
      )}>
        {/* Left section (menu + title) */}
        <motion.div 
          className="flex items-center gap-4"
          initial={{ x: -20, opacity: 0 }} // Reduced from -50 to -20
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.15, delay: 0.02 }} // Much faster
        >
          {/* Only show menu button if sidebar is enabled */}
          {showSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-xl hover:bg-blue-100 text-slate-600 hover:text-blue-700 transition-all duration-300 hover:scale-110 group touch-manipulation shadow-sm hover:shadow-md",
                isMobile ? "h-12 w-12 lg:hidden" : "lg:hidden h-10 w-10"
              )}
              onClick={onMenuClick}
            >
              <Menu className={cn(
                "group-hover:rotate-180 transition-transform duration-200", // Reduced from 300ms
                isMobile ? "h-7 w-7" : "h-6 w-6"
              )} />
              <span className="sr-only">Toggle menu</span>
            </Button>
          )}
          
          <div className="flex items-center gap-3">
            {/* Logo Icon */}
            <motion.div
              className="relative"
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <Ticket className={cn(
                  "text-blue-600 drop-shadow-lg",
                  isMobile ? "h-8 w-8" : "h-10 w-10 lg:h-12 lg:w-12"
                )} />
                <motion.div
                  className="absolute inset-0 bg-blue-500/20 rounded-lg blur-xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </motion.div>
            
            {/* Title Text */}
            <motion.div
              className="relative group"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <h1 className={cn(
                "relative font-bold tracking-tight text-slate-800 hover:text-slate-900",
                "drop-shadow-sm hover:drop-shadow-md transition-all duration-300",
                "bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text hover:text-transparent",
                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-600/10 before:via-indigo-600/10 before:to-purple-600/10",
                "before:blur-xl before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-500",
                "after:absolute after:inset-0 after:bg-gradient-to-r after:from-blue-500/5 after:via-indigo-500/5 after:to-purple-500/5",
                "after:rounded-lg after:opacity-0 after:group-hover:opacity-100 after:transition-opacity after:duration-300",
                isMobile ? "text-xl" : "text-2xl lg:text-3xl"
              )}>
                <span className="relative z-10 inline-block">
                  <span className="inline-block transform group-hover:scale-105 transition-transform duration-300">
                    Ticket
                  </span>
                  <span className="mx-2 inline-block bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent font-extrabold">
                    •
                  </span>
                  <span className="inline-block transform group-hover:scale-105 transition-transform duration-300 delay-75">
                    Management
                  </span>
                </span>
                
                {/* Animated underline */}
                <motion.div
                  className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
                
                {/* Floating particles effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"
                      style={{
                        left: `${20 + i * 30}%`,
                        top: `${10 + i * 20}%`,
                      }}
                      animate={{
                        y: [-2, -8, -2],
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
                
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: "linear",
                  }}
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    transform: "skewX(-20deg)",
                  }}
                />
              </h1>
            </motion.div>
          </div>
        </motion.div>

        {/* Right section (notifications + user menu) */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ x: 20, opacity: 0 }} // Reduced from 50 to 20
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.15, delay: 0.04 }} // Much faster
        >
          {/* Enhanced Quick Stats - Hidden on mobile */}
          <div className={cn(
            "items-center gap-4 mr-4",
            isMobile ? "hidden" : "hidden lg:flex"
          )}>
            {hasMounted && (
              <motion.div 
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 shadow-sm"
                whileHover={{ scale: 1.01, y: -0.5 }} // Reduced scale and movement
                transition={{ type: "spring", stiffness: 600, damping: 15 }} // Faster spring
              >
                <Shield className="h-4 w-4 text-blue-600" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-700">
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </p>
                  <p className="text-xs text-slate-500 -mt-0.5">
                    {currentTime.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
          

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "relative rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 group border border-transparent hover:border-blue-200/50 shadow-sm hover:shadow-md touch-manipulation",
                    isMobile ? "h-10 px-2" : "h-12 px-3"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className={cn(
                      "ring-2 ring-blue-400/40 group-hover:ring-blue-500/60 transition-all duration-300 shadow-md",
                      isMobile ? "h-8 w-8" : "h-9 w-9"
                    )}>
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm">
                        {getEmailInitial()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "text-left",
                      isMobile ? "hidden" : "hidden sm:block"
                    )}>
                      <p className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 truncate max-w-32 transition-colors">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-slate-500 group-hover:text-slate-600 truncate max-w-32 transition-colors">
                        {getRoleDisplayName(user?.role)}
                      </p>
                    </div>
                    <motion.div
                      animate={{ rotate: 0 }}
                      whileHover={{ rotate: 180 }}
                      transition={{ duration: 0.2 }} // Reduced from 0.3s
                    >
                      <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                    </motion.div>
                  </div>
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-xl"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-blue-400/40 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-lg">
                      {getEmailInitial()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {getUserDisplayName()}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-slate-500 truncate">
                        {user.email}
                      </p>
                    )}
                    {user?.role && (
                      <Badge variant="outline" className="mt-1 text-xs border-blue-400/30 text-blue-600 bg-blue-50">
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator className="bg-slate-200/60" />
              
              {/* Admin-only options */}
              {user?.role === 'ADMIN' && (
                <>
                  <div className="p-2 space-y-1">
                    <DropdownMenuItem asChild>
                      <a href="/admin/manage-admins" className="flex w-full items-center px-3 py-2 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-blue-50 transition-all duration-200 group">
                        <Shield className="mr-3 h-4 w-4 group-hover:text-blue-600 transition-colors" />
                        <span>Manage Admins</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/admin/manage-external" className="flex w-full items-center px-3 py-2 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-indigo-50 transition-all duration-200 group">
                        <Users className="mr-3 h-4 w-4 group-hover:text-indigo-600 transition-colors" />
                        <span>Manage External Users</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="/admin/pin-management" className="flex w-full items-center px-3 py-2 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-blue-50 transition-all duration-200 group">
                        <svg className="mr-3 h-4 w-4 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 7a2 2 0 1 0-4 0v2a2 2 0 1 0 4 0V7z"/><path d="M12 15v2"/><circle cx="12" cy="12" r="10"/></svg>
                        <span>Pin Management</span>
                      </a>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-slate-200/60" />
                </>
              )}
              
              <div className="p-2">
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer flex w-full items-center px-3 py-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 group"
                >
                  <LogOut className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      </div>
    </motion.header>
  );
}