// Common enums and interfaces
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

// Export auth types
export type { UserRole } from './auth';

// Export asset types
export type { Asset } from './asset';

// Export customer types
export type { Customer } from './customer';

// Export dashboard types
export type { DashboardData, TicketStatus } from './dashboard';

// Export FSA types
export type {
  ViewMode,
  FSADashboardData,
  ZonePerformance,
  UserPerformance,
  DashboardOverview,
  DashboardPerformance,
  ZoneAnalytics,
  RealTimeMetrics,
  PredictiveAnalytics,
  AdvancedPerformanceMetrics,
  EquipmentAnalytics,
  CustomerSatisfactionMetrics,
  ResourceOptimization
} from './fsa';

// Export FSA report types
export type {
  FSAReportStatus,
  FSAReportType,
  FSAReport,
  FSAReportFilters,
  FSAReportSummary,
  FSAReportResponse,
  UserOption,
  OverviewAnalytics,
  ExportFormat
} from './fsa.types';

// Export service types
export type {
  ServicePerson,
  ServiceZonesResponse,
  ServicePersonResponse,
  ServicePersonsResponse
} from './service';

// Export user types
export * from './user.types';

// Export ticket types
export type { 
  Ticket,
  TicketFormValues,
  TicketFormData,
  TicketFilterOptions,
  StatusUpdateData,
  AssignTicketData,
  AddCommentData,
  TicketStatusHistory,
  PORequest,
  AssignToZoneUserData,
  PlanOnsiteVisitData,
  CompleteOnsiteVisitData,
  RequestPOData,
  ApprovePOData,
  UpdateSparePartsData,
  CloseTicketData,
  AddNoteData,
  Notification
} from './ticket';

// Export zone types
export type { ServiceZone, ZoneUser, CreateServiceZoneInput } from './zone';

// Common utility types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: Record<string, unknown>;
}

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
};
