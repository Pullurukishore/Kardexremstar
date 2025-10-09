'use client';

import React from 'react';

interface ComponentLoadingProps {
  className?: string;
  rows?: number;
}

export const ComponentLoading: React.FC<ComponentLoadingProps> = ({ 
  className = '', 
  rows = 5 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6 space-y-4">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        
        {/* Table header skeleton */}
        <div className="grid grid-cols-7 gap-4 pb-2 border-b">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
        
        {/* Table rows skeleton */}
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-4 py-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded w-28"></div>
              <div className="h-3 bg-gray-200 rounded w-36"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-12 mx-auto"></div>
            <div className="h-6 bg-gray-200 rounded w-12 mx-auto"></div>
            <div className="h-6 bg-gray-200 rounded w-16 mx-auto"></div>
            <div className="flex gap-1 justify-end">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComponentLoading;
