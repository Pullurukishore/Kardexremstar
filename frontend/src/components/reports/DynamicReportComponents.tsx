'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { ReportData } from './types';

// =============================================================================
// LOADING SKELETON COMPONENTS
// =============================================================================

const ReportLoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Summary Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg p-6 h-32">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-1/2"></div>
        </div>
      ))}
    </div>
    
    {/* Charts Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
      <div className="bg-white rounded-lg border p-6">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    </div>
  </div>
);

const TableLoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-12 bg-gray-100 rounded"></div>
      ))}
    </div>
  </div>
);

// =============================================================================
// PROPS INTERFACES
// =============================================================================

interface AdvancedTicketSummaryReportProps {
  reportData: ReportData;
}

interface CustomerSatisfactionReportProps {
  reportData: any;
}

interface AdvancedMachineAnalyticsReportProps {
  reportData: any;
}

interface AdvancedZonePerformanceReportProps {
  reportData: any;
}

interface ServicePersonPerformanceReportProps {
  reportData: any;
}

interface ServicePersonAttendanceReportProps {
  reportData: any;
}

interface ProductTypeAnalysisReportProps {
  data: any;
}

interface CustomerPerformanceReportProps {
  data: any;
}

interface TargetReportAnalyticsProps {
  zoneTargets: any[];
  userTargets: any[];
  summary: any;
  targetPeriod: string;
  periodType: 'MONTHLY' | 'YEARLY';
  zones: Array<{ id: number; name: string }>;
  isZoneUser?: boolean;
  onOpenZoneDetails?: (zoneId: number, targetPeriod: string, periodType: 'MONTHLY' | 'YEARLY') => void;
  onOpenUserDetails?: (userId: number, targetPeriod: string, periodType: 'MONTHLY' | 'YEARLY') => void;
}

// =============================================================================
// DYNAMIC IMPORTS - Heavy components loaded on demand
// =============================================================================

export const DynamicAdvancedTicketSummaryReport = dynamic<AdvancedTicketSummaryReportProps>(
  () => import('./AdvancedTicketSummaryReport').then(mod => mod.AdvancedTicketSummaryReport as ComponentType<AdvancedTicketSummaryReportProps>),
  {
    loading: () => <ReportLoadingSkeleton />,
    ssr: false,
  }
);

export const DynamicCustomerSatisfactionReport = dynamic<CustomerSatisfactionReportProps>(
  () => import('./CustomerSatisfactionReport').then(mod => mod.CustomerSatisfactionReport as ComponentType<CustomerSatisfactionReportProps>),
  {
    loading: () => <ReportLoadingSkeleton />,
    ssr: false,
  }
);

export const DynamicAdvancedMachineAnalyticsReport = dynamic<AdvancedMachineAnalyticsReportProps>(
  () => import('./AdvancedMachineAnalyticsReport').then(mod => mod.AdvancedMachineAnalyticsReport as ComponentType<AdvancedMachineAnalyticsReportProps>),
  {
    loading: () => <ReportLoadingSkeleton />,
    ssr: false,
  }
);

export const DynamicAdvancedZonePerformanceReport = dynamic<AdvancedZonePerformanceReportProps>(
  () => import('./AdvancedZonePerformanceReport').then(mod => mod.AdvancedZonePerformanceReport as ComponentType<AdvancedZonePerformanceReportProps>),
  {
    loading: () => <ReportLoadingSkeleton />,
    ssr: false,
  }
);

export const DynamicServicePersonPerformanceReport = dynamic<ServicePersonPerformanceReportProps>(
  () => import('./ServicePersonPerformanceReport').then(mod => mod.ServicePersonPerformanceReport as ComponentType<ServicePersonPerformanceReportProps>),
  {
    loading: () => <ReportLoadingSkeleton />,
    ssr: false,
  }
);

export const DynamicServicePersonAttendanceReport = dynamic<ServicePersonAttendanceReportProps>(
  () => import('./ServicePersonAttendanceReport').then(mod => mod.ServicePersonAttendanceReport as ComponentType<ServicePersonAttendanceReportProps>),
  {
    loading: () => <ReportLoadingSkeleton />,
    ssr: false,
  }
);

export const DynamicProductTypeAnalysisReport = dynamic<ProductTypeAnalysisReportProps>(
  () => import('./ProductTypeAnalysisReport').then(mod => mod.default as ComponentType<ProductTypeAnalysisReportProps>),
  {
    loading: () => <ReportLoadingSkeleton />,
    ssr: false,
  }
);

export const DynamicCustomerPerformanceReport = dynamic<CustomerPerformanceReportProps>(
  () => import('./CustomerPerformanceReport').then(mod => mod.default as ComponentType<CustomerPerformanceReportProps>),
  {
    loading: () => <ReportLoadingSkeleton />,
    ssr: false,
  }
);

export const DynamicTargetReportAnalytics = dynamic<TargetReportAnalyticsProps>(
  () => import('./TargetReportAnalytics').then(mod => mod.default as ComponentType<TargetReportAnalyticsProps>),
  {
    loading: () => <ReportLoadingSkeleton />,
    ssr: false,
  }
);

// =============================================================================
// COMPONENT MAP FOR EASY ACCESS
// =============================================================================

export const DynamicReportComponents = {
  AdvancedTicketSummary: DynamicAdvancedTicketSummaryReport,
  CustomerSatisfaction: DynamicCustomerSatisfactionReport,
  AdvancedMachineAnalytics: DynamicAdvancedMachineAnalyticsReport,
  AdvancedZonePerformance: DynamicAdvancedZonePerformanceReport,
  ServicePersonPerformance: DynamicServicePersonPerformanceReport,
  ServicePersonAttendance: DynamicServicePersonAttendanceReport,
  ProductTypeAnalysis: DynamicProductTypeAnalysisReport,
  CustomerPerformance: DynamicCustomerPerformanceReport,
  TargetReportAnalytics: DynamicTargetReportAnalytics,
};
