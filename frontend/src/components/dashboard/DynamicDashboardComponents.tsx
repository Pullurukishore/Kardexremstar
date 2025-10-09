'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Loading component for heavy analytics
const AnalyticsLoading = () => (
  <div className="bg-white rounded-lg border p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
    <div className="space-y-3">
      <div className="h-3 bg-gray-200 rounded"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      <div className="h-3 bg-gray-200 rounded w-4/6"></div>
    </div>
    <div className="mt-4 h-32 bg-gray-100 rounded"></div>
  </div>
);

// Dynamic imports for heavy components with loading states
export const DynamicFieldServiceAnalytics = dynamic(
  () => import('./FieldServiceAnalytics'),
  {
    loading: () => <AnalyticsLoading />,
    ssr: false, // Client-side only for better performance
  }
);

export const DynamicPerformanceAnalytics = dynamic(
  () => import('./PerformanceAnalytics'),
  {
    loading: () => <AnalyticsLoading />,
    ssr: false,
  }
);

export const DynamicAdvancedAnalytics = dynamic(
  () => import('./AdvancedAnalytics'),
  {
    loading: () => <AnalyticsLoading />,
    ssr: false,
  }
);

export const DynamicZonePerformanceAnalytics = dynamic(
  () => import('./ZonePerformanceAnalytics'),
  {
    loading: () => <AnalyticsLoading />,
    ssr: false,
  }
);

// Lazy load chart libraries only when needed
export const DynamicChartComponents = {
  FieldService: DynamicFieldServiceAnalytics,
  Performance: DynamicPerformanceAnalytics,
  Advanced: DynamicAdvancedAnalytics,
  ZonePerformance: DynamicZonePerformanceAnalytics,
};
