import type { ReportData } from './types';

// Import report components directly
import { TicketSummaryReport } from './TicketSummaryReport';
import { CustomerSatisfactionReport } from './CustomerSatisfactionReport';
import { ZonePerformanceReport } from './ZonePerformanceReport';
import { AgentProductivityReport } from './AgentProductivityReport';
import { IndustrialDataReport } from './IndustrialDataReport';
import { ExecutiveSummaryReport } from './ExecutiveSummaryReport';
import { ServicePersonAttendanceReport } from './ServicePersonAttendanceReport';
import { ServicePersonPerformanceReport } from './ServicePersonPerformanceReport';

interface ReportRendererProps {
  reportType: string;
  reportData: ReportData;
}

export function ReportRenderer({ reportType, reportData }: ReportRendererProps) {
  switch (reportType) {
    case 'ticket-summary':
      return <TicketSummaryReport reportData={reportData} />;
    case 'customer-satisfaction':
      return <CustomerSatisfactionReport reportData={reportData} />;
    case 'zone-performance':
      return <ZonePerformanceReport reportData={reportData} />;
    case 'agent-productivity':
      return <AgentProductivityReport reportData={reportData} />;
    case 'industrial-data':
      return <IndustrialDataReport reportData={reportData} />;
    case 'executive-summary':
      return <ExecutiveSummaryReport reportData={reportData} />;
    case 'service-person-attendance':
      return <ServicePersonAttendanceReport reportData={reportData} />;
    case 'service-person-reports':
      return <ServicePersonPerformanceReport reportData={reportData} />;
    default:
      return null;
  }
}
