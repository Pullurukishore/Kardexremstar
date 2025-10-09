'use client';

import { RefreshCw } from 'lucide-react';

export const LoadingCard = ({ className = '' }) => (
  <div className={`bg-gray-100 rounded animate-pulse ${className}`}>
    <div className="flex items-center justify-center h-full">
      <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  </div>
);

export const LoadingHeader = () => (
  <div className="h-16 bg-gray-100 rounded animate-pulse" />
);

export const LoadingSection = () => (
  <div className="h-96 bg-gray-100 rounded animate-pulse my-4" />
);

export const LoadingSmallCard = () => (
  <div className="h-32 bg-gray-100 rounded animate-pulse" />
);
