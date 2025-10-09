import { useState, useEffect, useCallback } from 'react';
import { 
  fetchDashboardData, 
  fetchAdminStats, 
  fetchRecentTickets, 
  fetchTicketStatusDistribution, 
  fetchTicketTrends, 
  fetchZoneWiseTickets,
  fetchSlaCompliance,
  fetchAvgResponseTime
} from '@/lib/api/dashboard';
import { DashboardData, DashboardStats, RecentTicket } from '@/types/dashboard.types';

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<{
    dashboard?: DashboardData;
    adminStats?: DashboardStats;
    recentTickets?: RecentTicket[];
    statusDistribution?: { [key: string]: number };
    ticketTrends?: any[];
    zoneWiseTickets?: any[];
    slaCompliance?: number;
    avgResponseTime?: number;
  }>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [
        dashboard,
        adminStats,
        recentTickets,
        statusDistribution,
        ticketTrends,
        zoneWiseTickets,
        slaCompliance,
        avgResponseTime
      ] = await Promise.all([
        fetchDashboardData(),
        fetchAdminStats(),
        fetchRecentTickets(5), // Get 5 most recent tickets
        fetchTicketStatusDistribution(),
        fetchTicketTrends(30), // Last 30 days
        fetchZoneWiseTickets(),
        fetchSlaCompliance(),
        fetchAvgResponseTime()
      ]);

      setData({
        dashboard,
        adminStats,
        recentTickets,
        statusDistribution,
        ticketTrends,
        zoneWiseTickets,
        slaCompliance,
        avgResponseTime
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshData = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    ...data,
    loading,
    error,
    refreshData,
  };
};
