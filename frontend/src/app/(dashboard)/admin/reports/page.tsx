import { subDays, parse, format } from 'date-fns';
import { getZones, getCustomers, getAssets, generateReport } from '@/lib/server/reports';
import ReportsClient from '@/components/reports/ReportsClient';
import type { ReportFilters as ReportFiltersType } from '@/components/reports/types';

interface ReportsPageProps {
  searchParams: {
    from?: string;
    to?: string;
    zoneId?: string;
    customerId?: string;
    assetId?: string;
    reportType?: string;
  };
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  // Parse search params to create filters
  const filters: ReportFiltersType = {
    dateRange: {
      from: searchParams.from 
        ? parse(searchParams.from, 'yyyy-MM-dd', new Date())
        : subDays(new Date(), 30),
      to: searchParams.to 
        ? parse(searchParams.to, 'yyyy-MM-dd', new Date())
        : new Date(),
    },
    reportType: searchParams.reportType || 'ticket-summary',
    zoneId: searchParams.zoneId,
    customerId: searchParams.customerId,
    assetId: searchParams.assetId,
  };

  // Fetch all required data server-side
  const [zones, customers, assets] = await Promise.all([
    getZones(),
    filters.reportType === 'industrial-data' ? getCustomers() : Promise.resolve([]),
    filters.customerId ? getAssets(filters.customerId) : Promise.resolve([])
  ]);
  
  // Don't auto-generate - let client handle it with proper logic for all report types
  const reportData = null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      {/* Client Component for API calls */}
      <ReportsClient 
        initialFilters={filters}
        initialReportData={reportData}
        zones={zones}
        customers={customers}
        assets={assets}
      />
    </div>
  );
}
