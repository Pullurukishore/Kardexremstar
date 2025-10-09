'use client';

import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div>
                <div className="w-24 h-5 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="text-right">
              <div className="w-16 h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          
          <div className="w-full h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Title Skeleton */}
          <div className="text-center mb-8">
            <div className="w-64 h-8 bg-gray-200 rounded animate-pulse mx-auto mb-2"></div>
            <div className="w-48 h-5 bg-gray-200 rounded animate-pulse mx-auto"></div>
          </div>

          {/* Cards Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="w-32 h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="w-full h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Bottom Notice Skeleton */}
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="w-24 h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="space-y-1">
              <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-5/6 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-4/5 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Activity Bar Skeleton */}
      <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="w-32 h-5 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-24 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
