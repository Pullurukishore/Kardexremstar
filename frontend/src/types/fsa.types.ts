export type FSAReportStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type FSAReportType = 'SUMMARY' | 'DETAILED';

export interface FSAReport {
  id: string;
  reportId: string;
  zoneUserId: string;
  zoneUserName: string;
  servicePersonId: string;
  servicePersonName: string;
  reportType: FSAReportType;
  startDate: string;
  endDate: string;
  status: FSAReportStatus;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string;
}

export interface FSAReportFilters {
  startDate?: string | null;
  endDate?: string | null;
  zoneUserId?: string;
  servicePersonId?: string;
  reportType?: FSAReportType | '';
}

export interface FSAReportSummary {
  totalReports: number;
  completedReports: number;
  pendingReports: number;
  lastGeneratedDate: string | null;
}

export interface FSAReportResponse {
  data: FSAReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserOption {
  id: string;
  name: string;
}

export interface OverviewAnalytics {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  customerSatisfaction: number;
  slaCompliance: number;
  recentActivities: Array<{
    id: string;
    action: string;
    timestamp: string;
    user: string;
  }>;
}

export interface ExportFormat {
  type: 'PDF' | 'EXCEL' | 'CSV';
  label: string;
  icon: string;
}
