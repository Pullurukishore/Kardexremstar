import { apiClient } from './client';
import { 
  DashboardData, 
  TicketStatus, 
  TicketPriority, 
  RecentTicket, 
  TicketTrend, 
  ZoneWiseTicket,
  DashboardStats,
  ZonePerformanceMetrics
} from '@/types/dashboard.types';

/**
 * Fetches the main dashboard data based on user role
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const response = await apiClient.get('/dashboard');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

/**
 * Fetches admin-specific statistics
 */
export const fetchAdminStats = async (): Promise<DashboardStats> => {
  try {
    const response = await apiClient.get('/dashboard/admin-stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

/**
 * Fetches recent tickets with optional limit
 * @param limit Number of recent tickets to fetch (default: 10)
 */
export const fetchRecentTickets = async (limit: number = 10): Promise<RecentTicket[]> => {
  try {
    const response = await apiClient.get('/dashboard/recent-tickets', {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching recent tickets:', error);
    throw error;
  }
};

/**
 * Fetches ticket status distribution
 */
export const fetchTicketStatusDistribution = async (): Promise<{ [key: string]: number }> => {
  try {
    const response = await apiClient.get('/dashboard/tickets/status-distribution');
    return response.data;
  } catch (error) {
    console.error('Error fetching ticket status distribution:', error);
    throw error;
  }
};

/**
 * Fetches ticket trends over time
 * @param days Number of days to fetch trends for (default: 30)
 */
export const fetchTicketTrends = async (days: number = 30): Promise<TicketTrend[]> => {
  try {
    const response = await apiClient.get('/dashboard/tickets/trends', {
      params: { days }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching ticket trends:', error);
    throw error;
  }
};

/**
 * Fetches zone-wise ticket statistics
 */
export const fetchZoneWiseTickets = async (): Promise<ZoneWiseTicket[]> => {
  try {
    const response = await apiClient.get('/dashboard/zones/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching zone-wise tickets:', error);
    return [];
  }
};

/**
 * Fetches SLA compliance metrics
 */
export const fetchSlaCompliance = async (): Promise<number> => {
  try {
    const response = await apiClient.get('/dashboard/metrics/sla-compliance');
    return response.data.complianceRate;
  } catch (error) {
    console.error('Error fetching SLA compliance:', error);
    return 0;
  }
};

/**
 * Fetches average response time
 */
export const fetchAvgResponseTime = async (): Promise<number> => {
  try {
    const response = await apiClient.get('/dashboard/metrics/avg-response-time');
    return response.data.averageResponseTime;
  } catch (error) {
    console.error('Error fetching average response time:', error);
    throw error;
  }
};

/**
 * Fetches detailed performance metrics for a specific zone
 * @param zoneId The ID of the zone to fetch metrics for
 */
export const fetchZonePerformanceMetrics = async (zoneId: string): Promise<ZonePerformanceMetrics> => {
  try {
    // Try the FSA dashboard endpoint first
    try {
      const response = await apiClient.get(`/zone-dashboard/fsa/${zoneId}`);
      console.log('FSA Dashboard Response:', response.data);
      return response.data;
    } catch (fsaError) {
      console.debug('FSA dashboard endpoint not available, falling back to service-zones stats endpoint', fsaError);
      // Fall back to the service-zones stats endpoint if FSA dashboard is not available
      const response = await apiClient.get(`/service-zones/${zoneId}/stats`);
      console.log('Service Zone Stats Response:', response.data);
      return response.data;
    }
  } catch (error) {
    console.error(`Error fetching metrics for zone ${zoneId}:`, error);
    throw new Error('Failed to fetch service zone stats');
  }
};
