export interface DashboardData {
  stats: {
    openTickets: { count: number; change: number };
    unassignedTickets: { count: number; critical: boolean };
    inProgressTickets: { count: number; change: number };
    avgResponseTime: { hours: number; minutes: number; change: number; isPositive: boolean };
    avgResolutionTime: { days: number; hours: number; minutes: number; change: number; isPositive: boolean };
    avgDowntime: { hours: number; minutes: number; change: number; isPositive: boolean };
    avgTravelTime: { hours: number; minutes: number; change: number; isPositive: boolean };
    avgOnsiteResolutionTime: { hours: number; minutes: number; change: number; isPositive: boolean };
    monthlyTickets: { count: number; change: number };
    activeMachines: { count: number; change: number };
    ticketDistribution: {
      byStatus: Array<{ name: string; value: number }>;
      byPriority: Array<{ name: string; value: number }>;
    };
    kpis: {
      totalTickets: { value: number; change: string; isPositive: boolean };
      slaCompliance: { value: number; change: number; isPositive: boolean };
      avgResponseTime: { value: string; unit: string; change: number; isPositive: boolean };
      avgResolutionTime: { value: string; unit: string; change: number; isPositive: boolean };
      unassignedTickets: { value: number; critical: boolean };
      activeCustomers: { value: number; change: number };
      activeServicePersons: { value: number; change: number };
    };
  };
  adminStats: {
    totalCustomers: number;
    totalServicePersons: number;
    totalServiceZones: number;
    ticketStatusDistribution: Record<string, number>;
    ticketTrends: Array<{ date: string; count: number; status: string }>;
    zoneWiseTickets: Array<{
      id: number;
      name: string;
      totalTickets: number;
      servicePersonCount: number;
      customerCount: number;
      avgResolutionTimeHours: number;
    }>;
  };
  recentTickets: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    customer: { id: number; companyName: string };
    asset?: { id: number; model: string };
  }>;
}

export interface StatusDistribution {
  distribution: Array<{ status: string; count: number }>;
}

export interface TrendsData {
  trends: Array<{ date: string; count: number }>;
}

export interface DashboardProps {
  dashboardData: Partial<DashboardData>;
  statusDistribution: StatusDistribution;
  ticketTrends: TrendsData;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
}
