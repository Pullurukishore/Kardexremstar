export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'ONSITE_VISIT' | 'RESOLVED' | 'CLOSED' | 'CANCELLED' | 'REOPENED' | 'ON_HOLD' | 'ESCALATED' | 'PENDING';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  assignedToId?: string;
}

interface KPIValue {
  value: number | string;
  change?: number | string;
  isPositive?: boolean;
  unit?: string;
  critical?: boolean;
}

export interface DashboardData {
  stats: {
    kpis: {
      totalTickets: KPIValue;
      slaCompliance: KPIValue;
      avgResponseTime: KPIValue;
      avgResolutionTime: KPIValue;
      activeCustomers: KPIValue;
      activeServicePersons: KPIValue;
      unassignedTickets: KPIValue;
    };
    ticketDistribution: {
      byStatus: Array<{ name: string; value: number }>;
      byPriority: Array<{ name: string; value: number }>;
    };
  };
  recentTickets: Ticket[];
  adminStats: {
    totalCustomers: number;
    totalServicePersons: number;
    totalServiceZones: number;
    ticketStatusDistribution: Record<string, unknown>;
    ticketTrends: Array<unknown>;
    zoneWiseTickets: Array<unknown>;
  };
  totalServiceZones: number;
  totalServicePersons: number;
  totalZones: number;
}

export interface StatusData {
  status: string;
  count: number;
  color?: string;
  name?: string; // Add name to match the data structure
  value?: number; // Add value to match the data structure
}

export interface TrendData {
  date: string;
  opened: number;
  resolved: number;
}
