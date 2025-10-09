import { UserRole } from './user.types';

export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'ONSITE_VISIT' | 'RESOLVED' | 'CLOSED' | 'CANCELLED' | 'REOPENED' | 'ON_HOLD' | 'ESCALATED' | 'PENDING';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface RecentTicket {
  id: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    name: string;
  };
  assignedTo?: {
    id: number;
    name: string;
  };
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface PriorityCount {
  priority: string;
  count: number;
}

export interface ZoneWiseTicket {
  id: number;
  name: string;
  totalTickets: number;
  servicePersonCount: number;
  customerCount: number;
}

export interface TicketTrend {
  date: string;
  count: number;
  status: string;
}

export interface AdminStats {
  totalCustomers: number;
  totalServicePersons: number;
  totalServiceZones: number;
  totalZones: number;
  ticketStatusDistribution: Record<string, number>;
  ticketTrends: TicketTrend[];
  zoneWiseTickets: ZoneWiseTicket[];
  recentTickets?: RecentTicket[];
  avgResponseTime: number;
  avgResolutionTime: string;
  overdueTickets: number;
  slaCompliance: number;
}

export interface KPI {
  value: number | string;
  change?: number | string;
  isPositive?: boolean;
  unit?: string;
  critical?: boolean;
}

export interface TicketDistribution {
  byStatus: Array<{ name: string; value: number }>;
  byPriority: Array<{ name: string; value: number }>;
}

export interface DashboardKPIs {
  totalTickets: KPI;
  slaCompliance: KPI;
  avgResponseTime: KPI;
  avgResolutionTime: KPI;
  activeCustomers: KPI;
  activeServicePersons: KPI;
  totalServiceZones: KPI;
  totalZones: KPI;
  overdueTickets: KPI;
  unassignedTickets: KPI;
}

export interface DashboardStats {
  kpis: DashboardKPIs;
  ticketDistribution: TicketDistribution;
  ticketStatusDistribution: Record<string, number>;
  ticketTrends: TicketTrend[];
  zoneWiseTickets: ZoneWiseTicket[];
  alerts: any[];
  recentActivity: any[];
}

export interface ServicePersonPerformance {
  id: number;
  name: string;
  email: string;
  totalTickets: number;
  resolvedTickets: number;
  inProgressTickets: number;
  pendingTickets: number;
  avgResolutionTime: string;
  responseTime: string;
  satisfactionScore: number;
  lastActive: string;
  currentStatus: 'AVAILABLE' | 'ON_SITE' | 'ON_LEAVE' | 'OFFLINE';
}

export interface ZonePerformanceMetrics {
  zoneId: string;
  zoneName: string;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  inProgressTickets: number;
  avgResolutionTime: string;
  avgResponseTime: string;
  customerSatisfaction: number;
  servicePersonCount: number;
  customerCount: number;
  ticketTrends: TicketTrend[];
  statusDistribution: Array<{ status: string; count: number }>;
  priorityDistribution: Array<{ priority: string; count: number }>;
  servicePersons: ServicePersonPerformance[];
  topPerformingServicePersons: ServicePersonPerformance[];
  recentActivities: Array<{
    id: number;
    type: 'TICKET_CREATED' | 'TICKET_UPDATED' | 'SERVICE_VISIT' | 'STATUS_CHANGE';
    title: string;
    description: string;
    timestamp: string;
    user?: {
      id: number;
      name: string;
      role: UserRole;
    };
  }>;
}

export interface DashboardData {
  stats: {
    kpis: DashboardKPIs;
    ticketDistribution: TicketDistribution;
  };
  recentTickets: RecentTicket[];
  adminStats?: AdminStats;
  userRole: UserRole;
  totalServiceZones: number;
  totalServicePersons: number;
  totalZones: number;
  ticketStatusDistribution: Record<string, number>;
  ticketTrends: TicketTrend[];
  zoneWiseTickets: ZoneWiseTicket[];
}
