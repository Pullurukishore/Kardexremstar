import api from '@/lib/api/axios';
import { Customer, CustomerFormData } from '@/types/customer';

// The API returns an array of customers directly
export type CustomerListResponse = Customer[];

export const fetchCustomers = async (params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<CustomerListResponse> => {
  const { page = 1, limit = 10, search = '' } = params;
  const response = await api.get<Customer[]>('/customers', {
    params: {
      page,
      limit,
      search,
    },
  });
  return response.data;
};

export const fetchCustomer = async (id: number): Promise<Customer> => {
  const response = await api.get(`/customers/${id}`, {
    params: {
      includeAssets: true,
      assetsLimit: 1000, // Request a high limit to get all assets
    }
  });
  return response.data;
};

export const createCustomer = async (data: CustomerFormData): Promise<Customer> => {
  const response = await api.post('/customers', data);
  return response.data;
};

export const updateCustomer = async (id: number, data: Partial<CustomerFormData>): Promise<Customer> => {
  const response = await api.put(`/customers/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id: number): Promise<void> => {
  await api.delete(`/customers/${id}`);
};

export const getCustomerStats = async (id: number) => {
  const response = await api.get(`/customers/${id}/stats`);
  return response.data;
};
