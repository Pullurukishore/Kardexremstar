'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Mobile-responsive container component
interface MobileContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className={cn(
      "w-full max-w-7xl mx-auto",
      "px-4 sm:px-6 lg:px-8",
      "py-4 sm:py-6 lg:py-8",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive page header
interface MobilePageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function MobilePageHeader({ title, description, action, className }: MobilePageHeaderProps) {
  return (
    <div className={cn(
      "header-mobile mb-6",
      className
    )}>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

// Mobile-responsive card grid
interface MobileCardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function MobileCardGrid({ children, columns = 3, className }: MobileCardGridProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };

  return (
    <div className={cn(
      "grid gap-4 sm:gap-6",
      gridClasses[columns],
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive stats grid
interface MobileStatsGridProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileStatsGrid({ children, className }: MobileStatsGridProps) {
  return (
    <div className={cn(
      "stats-mobile",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive table wrapper
interface MobileTableProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileTable({ children, className }: MobileTableProps) {
  return (
    <div className={cn(
      "table-mobile",
      "border border-gray-200 rounded-lg overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive form wrapper
interface MobileFormProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileForm({ children, className }: MobileFormProps) {
  return (
    <div className={cn(
      "form-mobile",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive form row
interface MobileFormRowProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileFormRow({ children, className }: MobileFormRowProps) {
  return (
    <div className={cn(
      "form-row",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive tabs
interface MobileTabsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileTabs({ children, className }: MobileTabsProps) {
  return (
    <div className={cn(
      "tabs-mobile",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive tab item
interface MobileTabItemProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileTabItem({ children, className }: MobileTabItemProps) {
  return (
    <div className={cn(
      "tab-item",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-responsive modal
interface MobileModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
}

export function MobileModal({ children, isOpen, onClose, title, className }: MobileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={cn(
          "relative w-full max-w-lg",
          "bg-white rounded-lg shadow-xl",
          "max-h-[90vh] overflow-y-auto",
          className
        )}>
          {title && (
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 btn-touch"
              >
                ×
              </button>
            </div>
          )}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile-responsive button
interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function MobileButton({ 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className,
  children,
  ...props 
}: MobileButtonProps) {
  const baseClasses = "btn-touch focus-mobile transition-all duration-200 font-medium rounded-lg";
  
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300",
    ghost: "hover:bg-gray-100 text-gray-700",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Mobile-responsive card
interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
}

export function MobileCard({ children, className, clickable = false, onClick }: MobileCardProps) {
  return (
    <div
      className={cn(
        "card-mobile",
        "bg-white rounded-lg border border-gray-200 p-4 sm:p-6",
        clickable && "cursor-pointer hover:shadow-md active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
