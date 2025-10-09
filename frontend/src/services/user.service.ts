import api from '@/lib/api/axios';

export interface User {
  id: number;
  email: string;
  name: string | null;
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
    const response = await api.get<UsersResponse>('/users', {
      params: {
        role: 'SERVICE_PERSON',
        isActive: true,
        limit: 100, // Get all service persons
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching service persons:', error);
    throw error;
  }
};
