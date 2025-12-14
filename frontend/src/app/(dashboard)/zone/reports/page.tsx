import ReportsClient from '@/components/reports/ReportsClient';
import type { ReportFilters } from '@/types/reports';
import { subDays } from 'date-fns';
import { getZones, getCustomers, getUserZone } from '@/lib/server/reports';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  // Fetch zone user's zone and customers for that zone
  let userZone: { id: number; name: string } | null = null;
  let zones: { id: number; name: string }[] = [];
  let customers: any[] = [];
  
  try {
    userZone = await getUserZone();
    zones = userZone ? [userZone] : [];
    customers = userZone ? await getCustomers(userZone.id.toString()) : [];
  } catch (error) {
    console.error('Error fetching zone data:', error);
    // Return empty data if zone fetch fails
    zones = [];
    customers = [];
  }
  
  // Convert customer types from string id to number id
  const customersData = customers.map(c => ({
    id: typeof c.id === 'string' ? parseInt(c.id) : c.id,
    companyName: c.companyName
  }));

  const initialFilters: ReportFilters = {
    dateRange: {
      from: subDays(new Date(), 90),
      to: new Date(),
    },
    reportType: 'ticket-summary',
    zoneId: userZone?.id.toString(),
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <ReportsClient
        initialFilters={initialFilters}
        initialReportData={null}
        zones={zones}
        customers={customersData}
        isZoneUser={true}
      />
    </div>
  );
}

