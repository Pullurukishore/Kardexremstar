import api from '@/lib/api/axios';

export interface User {
  id: number;
  email: string;
  name: string | null;
  phone?: string; // Optional phone field
  role: 'ADMIN' | 'SERVICE_PERSON' | 'CUSTOMER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  data: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getServicePersons = async (): Promise<UsersResponse> => {
  try {
    // Try the service-person-reports endpoint first (works for zone users)
    const response = await api.get<UsersResponse>('/service-person-reports/service-persons');
    return response.data;
  } catch (error: any) {
    // If that fails (e.g., for admin users), fall back to the regular users endpoint
    if (error.response?.status === 403 || error.response?.status === 401) {
      const response = await api.get<UsersResponse>('/users', {
        params: {
          role: 'SERVICE_PERSON',
          isActive: true,
          limit: 100, // Get all service persons
        },
      });
      return response.data;
    }
    throw error;
  }
};
