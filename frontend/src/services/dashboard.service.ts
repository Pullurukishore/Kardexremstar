import { DashboardData } from '@/types/dashboard';
import api from '@/lib/api/axios';

const handleApiError = (error: any) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('API Error:', error.response.status, error.response.data);
    throw new Error(error.response.data?.message || 'API request failed');
  } else if (error.request) {
    // The request was made but no response was received
    console.error('No response from server:', error.request);
    throw new Error('No response from server. Please check your connection.');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Request setup error:', error.message);
    throw new Error('Request setup failed');
  }
};

export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const response = await api.get('/dashboard');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchAdminStats = async () => {
  try {
    const response = await api.get('/dashboard/admin-stats');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchRecentTickets = async (limit: number = 5) => {
  try {
    const response = await api.get(`/dashboard/recent-tickets?limit=${limit}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchTicketStatusDistribution = async () => {
  try {
    const response = await api.get('/dashboard/tickets/status-distribution');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchTicketTrends = async (params?: { queryKey: any[]; signal?: AbortSignal }) => {
  try {
    // Extract days from queryKey if it exists, otherwise default to 30
    const days = params?.queryKey?.[1]?.days || 30;
    
    const response = await api.get('/dashboard/tickets/trends', {
      params: { days },
      signal: params?.signal
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};
