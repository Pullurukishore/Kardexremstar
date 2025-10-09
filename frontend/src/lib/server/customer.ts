import { cookies } from 'next/headers';
import { Customer } from '@/types/customer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api';

interface CustomerFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

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

export async function getCustomers(filters: CustomerFilters = {}): Promise<Customer[]> {
  const { search = '', status = 'all', page = 1, limit = 10 } = filters;
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  });

  try {
    const customers: Customer[] = await makeServerRequest(`/customers?${params}`);
    
    // Apply client-side filtering for status since API might not support this
    return customers.filter(customer => {
      const matchesStatus = status === 'all' || 
        (status === 'active' && customer.isActive) ||
        (status === 'inactive' && !customer.isActive);
      
      return matchesStatus;
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}

export async function getCustomerStats(customers: Customer[]) {
  return {
    total: customers.length,
    active: customers.filter(c => c.isActive).length,
    inactive: customers.filter(c => !c.isActive).length,
    totalAssets: customers.reduce((sum, c) => sum + (c._count?.assets || 0), 0),
    totalTickets: customers.reduce((sum, c) => sum + (c._count?.tickets || 0), 0)
  };
}

// Removed getUniqueIndustries function as industry filtering is no longer needed

export async function deleteCustomerById(id: number): Promise<void> {
  try {
    await makeServerRequest(`/customers/${id}`);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
}