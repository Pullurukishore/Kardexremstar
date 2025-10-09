export type ViewMode = 
  | 'overview'
  | 'zones'
  | 'users'
  | 'servicePersons'
  | 'realtime'
  | 'predictive'
  | 'analytics'
  | 'equipment'
  | 'satisfaction'
  | 'optimization';

export interface ZonePerformance {
  id: number;
  name: string;
  totalTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number | string;
  criticalResolutionRate?: number;
  customerCount?: number;
  activeCustomers?: number;
}

export interface UserPerformance {
  id: number;
  name: string;
  email: string;
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  avgResolutionTime: number | string;
  role: string;
}

export interface DashboardOverview {
  totalZones: number;
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  slaCompliance: number;
  avgResolutionTime: number;
}

export interface DashboardPerformance {
  zonePerformance: ZonePerformance[];
  topPerformers: UserPerformance[];
}

export interface FSADashboardData {
  overview: DashboardOverview;
  distribution: {
    byStatus: Array<{ status: string; count: number }>;
    byPriority: Array<{ priority: string; count: number }>;
  };
  performance: DashboardPerformance;
}

export interface ZoneAnalytics extends ZonePerformance {
  ticketsByPriority: Array<{ priority: string; count: number }>;
  ticketsByStatus: Array<{ status: string; count: number }>;
  recentTickets: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    resolvedAt?: string;
  }>;
}

export interface RealTimeMetrics {
  activeTickets: number;
  pendingTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  activeServicePersons: number;
  offlineServicePersons: number;
  lastUpdated: string;
}

export interface PredictiveAnalytics {
  predictedTickets: Array<{
    date: string;
    predictedCount: number;
    confidenceInterval: [number, number];
  }>;
  ticketTrend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  highPriorityPrediction: number;
  resourceUtilization: number;
}

export interface AdvancedPerformanceMetrics {
  firstResponseTime: number;
  firstContactResolution: number;
  reOpenRate: number;
  customerSatisfactionScore: number;
  ticketVolumeTrend: number;
  resolutionTrend: number;
  slaComplianceRate: number;
  escalationRate: number;
}

export interface EquipmentAnalytics {
  equipmentByStatus: Array<{ status: string; count: number }>;
  maintenanceSchedule: Array<{
    id: number;
    name: string;
    lastMaintenance: string;
    nextMaintenance: string;
    status: 'on-time' | 'due-soon' | 'overdue';
  }>;
  failureRates: Array<{
    equipmentType: string;
    failureRate: number;
    avgTimeToRepair: number;
  }>;
}

export interface CustomerSatisfactionMetrics {
  overallScore: number;
  responseTimeRating: number;
  resolutionRating: number;
  serviceRating: number;
  feedback: Array<{
    id: number;
    rating: number;
    comment: string;
    date: string;
  }>;
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
}

export interface ResourceOptimization {
  resourceAllocation: Array<{
    resourceType: string;
    allocated: number;
    utilized: number;
    utilizationRate: number;
  }>;
  costSavings: {
    potentialMonthlySavings: number;
    optimizationAreas: string[];
  };
  recommendations: Array<{
    area: string;
    recommendation: string;
    potentialImpact: 'high' | 'medium' | 'low';
  }>;
}
