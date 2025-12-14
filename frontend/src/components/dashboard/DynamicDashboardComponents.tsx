'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { DashboardData, StatusDistribution, TrendsData } from './types';

// Props interfaces for dynamic components
interface FieldServiceAnalyticsProps {
  dashboardData: Partial<DashboardData>;
  loading?: boolean;
}

interface PerformanceAnalyticsProps {
  dashboardData: Partial<DashboardData>;
  loading?: boolean;
}

interface AdvancedAnalyticsProps {
  dashboardData: Partial<DashboardData>;
  statusDistribution: StatusDistribution;
  ticketTrends: TrendsData;
  loading: boolean;
}

interface ZonePerformanceAnalyticsProps {
  dashboardData: Partial<DashboardData>;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
}

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

// Dynamic imports for heavy components with loading states and proper typing
export const DynamicFieldServiceAnalytics = dynamic<FieldServiceAnalyticsProps>(
  () => import('./FieldServiceAnalytics').then(mod => mod.default as ComponentType<FieldServiceAnalyticsProps>),
  {
    loading: () => <AnalyticsLoading />,
    ssr: false, // Client-side only for better performance
  }
);

export const DynamicPerformanceAnalytics = dynamic<PerformanceAnalyticsProps>(
  () => import('./PerformanceAnalytics').then(mod => mod.default as ComponentType<PerformanceAnalyticsProps>),
  {
    loading: () => <AnalyticsLoading />,
    ssr: false,
  }
);

export const DynamicAdvancedAnalytics = dynamic<AdvancedAnalyticsProps>(
  () => import('./AdvancedAnalytics').then(mod => mod.default as ComponentType<AdvancedAnalyticsProps>),
  {
    loading: () => <AnalyticsLoading />,
    ssr: false,
  }
);

export const DynamicZonePerformanceAnalytics = dynamic<ZonePerformanceAnalyticsProps>(
  () => import('./ZonePerformanceAnalytics').then(mod => mod.default as ComponentType<ZonePerformanceAnalyticsProps>),
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
