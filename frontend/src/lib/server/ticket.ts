import { cookies } from 'next/headers';
import { Ticket, TicketStatus, Priority } from '@/types/ticket';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api';

type ApiResponse = {
  data: Ticket[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type TicketFilters = {
  status?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  view?: 'all' | 'unassigned' | 'assigned-to-zone' | 'assigned-to-service-person';
};

async function makeServerRequest(endpoint: string) {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const token = cookieStore.get('token')?.value;
  
  // Check for either accessToken or token (based on authentication inconsistencies)
  const authToken = accessToken || token;
  
  if (!authToken) {
    throw new Error('No access token found');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store', // Ensure fresh data
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
  }

  return response.json();
}

export async function getTickets(filters: TicketFilters = {}): Promise<ApiResponse> {
  const queryParams = new URLSearchParams();
  
  // Add filters to query params
  if (filters.page) queryParams.set('page', filters.page.toString());
  if (filters.limit) queryParams.set('limit', filters.limit.toString());
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.priority) queryParams.set('priority', filters.priority);
  if (filters.search) queryParams.set('search', filters.search);
  if (filters.view && filters.view !== 'all') {
    queryParams.set('view', filters.view);
  }

  try {
    const data = await makeServerRequest(`/tickets?${queryParams.toString()}`);
    return data;
  } catch (error) {
    console.error('Error fetching tickets:', error);
    throw error;
  }
}

export async function getTicketById(id: string): Promise<Ticket> {
  try {
    const data = await makeServerRequest(`/tickets/${id}`);
    return data.data;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    throw error;
  }
}

export async function updateTicketStatus(ticketId: number, status: TicketStatus): Promise<void> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const token = cookieStore.get('token')?.value;
  
  // Check for either accessToken or token (based on authentication inconsistencies)
  const authToken = accessToken || token;
  
  if (!authToken) {
    throw new Error('No access token found');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update ticket status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error updating ticket status:', error);
    throw error;
  }
}

// Calculate ticket statistics
export function calculateTicketStats(tickets: Ticket[]) {
  return {
    total: tickets.length,
    open: tickets.filter(t => t.status === TicketStatus.OPEN).length,
    assigned: tickets.filter(t => 
      t.status === TicketStatus.ASSIGNED || t.status === TicketStatus.IN_PROGRESS
    ).length,
    closed: tickets.filter(t => t.status === TicketStatus.CLOSED).length,
    critical: tickets.filter(t => t.priority === Priority.CRITICAL).length,
  };
}