import api from '@/lib/api/axios';

// Types
export interface ServiceZonePerformance {
  id: string;
  name: string;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  slaCompliance: number;
  customerSatisfaction: number;
  technicianCount: number;
  activeCustomers: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface TechnicianEfficiency {
  technicianId: string;
  name: string | null;
  email?: string;
  zoneId?: string;
  zoneName?: string;
  ticketsResolved: number;
  avgResolutionTime: number | string;
  firstTimeFixRate?: number;
  customerRating?: number;
  utilization?: number;
  travelTime?: number;
  partsAvailability?: number;
}

export interface FSAData {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  serviceZones: ServiceZonePerformance[];
  technicianEfficiency: TechnicianEfficiency[];
  overallMetrics: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    slaCompliance: number;
    customerSatisfaction: number;
    firstTimeFixRate: number;
    technicianUtilization: number;
  };
  distribution?: {
    byStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    byPriority: Array<{
      priority: string;
      count: number;
      percentage: number;
    }>;
  };
}

// Server-side fetch function
export async function fetchFSADataServer(params: { startDate?: string; endDate?: string } = {}) {
  try {
    const { startDate, endDate } = params;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/fsa/dashboard?${new URLSearchParams({
        startDate: startDate || '',
        endDate: endDate || ''
      })}`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 } // Revalidate every 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch FSA data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in fetchFSADataServer:', error);
    throw error;
  }
}

// Client-side fetch function (kept for backward compatibility)
const fetchWithSSR = async (url: string, params: Record<string, any> = {}) => {
  try {
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
};

export const fetchFSAData = async (startDate?: string, endDate?: string): Promise<FSAData> => {
  try {
    // Fetch data from the API
    const response = await fetchWithSSR('/fsa/dashboard', { 
      startDate,
      endDate 
    });
    
    // Extract the dashboard data from the response
    const { dashboard } = response.data;
    
    if (!dashboard) {
      throw new Error('No dashboard data found in response');
    }
    
    // Transform the data to match our frontend format
    const serviceZones = dashboard.performance.zonePerformance?.map((zone: any) => ({
      id: zone.id.toString(),
      name: zone.name,
      totalTickets: zone.totalTickets || 0,
      openTickets: zone.totalTickets - zone.resolvedTickets,
      resolvedTickets: zone.resolvedTickets || 0,
      avgResolutionTime: parseFloat(zone.avgResolutionTime) || 0,
      slaCompliance: 0, // Not provided in the response
      customerSatisfaction: 0, // Not provided in the response
      technicianCount: 0, // Not provided in the response
      activeCustomers: zone.activeCustomers || 0,
      revenue: 0, // Not provided in the response
      cost: 0, // Not provided in the response
      profit: 0 // Not provided in the response
    })) || [];
    
    const technicianEfficiency = dashboard.performance.topPerformers?.map((tech: any) => ({
      technicianId: tech.id.toString(),
      name: tech.name || tech.email || 'Unnamed Technician',
      email: tech.email || '',
      zoneId: '', // Not provided in the response
      zoneName: 'Unassigned', // Not provided in the response
      ticketsResolved: tech.resolvedTickets || 0,
      avgResolutionTime: parseFloat(tech.avgResolutionTime) || 0,
      firstTimeFixRate: 0, // Not provided in the response
      customerRating: 0, // Not provided in the response
      utilization: 0, // Not provided in the response
      travelTime: 0, // Not provided in the response
      partsAvailability: 0 // Not provided in the response
    })) || [];
    
    // Calculate metrics from the dashboard data
    const totalTickets = dashboard.overview?.totalTickets || 0;
    const resolvedTickets = dashboard.overview?.resolvedTickets || 0;
    const resolutionRate = resolvedTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
    
    return {
      dateRange: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: endDate || new Date().toISOString().split('T')[0],
      },
      serviceZones,
      technicianEfficiency,
      overallMetrics: {
        totalTickets,
        openTickets: totalTickets - resolvedTickets,
        resolvedTickets,
        resolutionRate,
        avgResponseTime: 0, // Not provided in the response
        avgResolutionTime: parseFloat(dashboard.overview?.avgResolutionTime) || 0,
        slaCompliance: dashboard.overview?.slaCompliance || 0,
        customerSatisfaction: 0, // Not provided in the response
        firstTimeFixRate: 0, // Not provided in the response
        technicianUtilization: 0 // Not provided in the response
      }
    };
  } catch (error) {
    console.error('Error fetching FSA data:', error);
    throw error;
  }
};

export const exportFSAData = async (startDate: string, endDate: string, format: 'csv' | 'pdf' = 'csv') => {
  try {
    const response = await api.get('/fsa/export/' + format, {
      params: { startDate, endDate },
      responseType: 'blob'
    });
    
    // Create a download link and trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fsa-report-${new Date().toISOString().split('T')[0]}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return response.data;
  } catch (error) {
    console.error('Error exporting FSA data:', error);
    throw error;
  }
};