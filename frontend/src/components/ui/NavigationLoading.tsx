'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationLoadingProps {
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
}

export const NavigationLoadingOverlay: React.FC<NavigationLoadingProps> = ({
  isLoading = false,
  loadingText = "Loading...",
  className
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm",
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center space-y-4 p-8 bg-white/90 rounded-2xl shadow-2xl border border-slate-200/60"
          >
            {/* Animated loader with sparkles */}
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-2"
              >
                <Sparkles className="h-3 w-3 text-blue-400 absolute top-0 left-0" />
                <Sparkles className="h-2 w-2 text-indigo-400 absolute bottom-0 right-0" />
              </motion.div>
            </div>
            
            {/* Loading text with typing animation */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-medium text-slate-600"
            >
              {loadingText}
            </motion.p>
            
            {/* Progress bar */}
            <div className="w-32 h-1 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface NavItemLoadingProps {
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const NavItemLoading: React.FC<NavItemLoadingProps> = ({
  isLoading = false,
  children,
  className
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-end pr-4 bg-gradient-to-r from-transparent via-white/60 to-white/80 rounded-xl backdrop-blur-sm"
          >
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const NavItemSkeleton: React.FC<{ isMobile?: boolean; collapsed?: boolean }> = ({
  isMobile = false,
  collapsed = false
}) => {
  return (
    <div className={cn(
      "flex items-center rounded-xl bg-slate-100 animate-pulse",
      isMobile ? "px-4 py-4 min-h-[56px]" : "px-3 py-3 h-12"
    )}>
      <div className={cn(
        "rounded-lg bg-slate-200",
        isMobile ? "h-6 w-6" : "h-5 w-5"
      )} />
      {(!collapsed || isMobile) && (
        <div className={cn(
          "bg-slate-200 rounded",
          isMobile ? "ml-4 h-4 w-32" : "ml-3 h-3 w-24"
        )} />
      )}
    </div>
  );
};

interface LoadingProgressProps {
  progress: number;
  className?: string;
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({
  progress,
  className
}) => {
  return (
    <div className={cn("w-full h-1 bg-slate-200 rounded-full overflow-hidden", className)}>
      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
      />
    </div>
  );
};

export const PulseLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
          className="w-2 h-2 bg-blue-500 rounded-full"
        />
      ))}
    </div>
  );
};
