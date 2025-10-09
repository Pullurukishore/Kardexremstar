import { apiClient } from '@/lib/api';

export interface ServiceZone {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface ServicePerson {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  serviceZones: Array<{
    userId: number;
    serviceZoneId: number;
    serviceZone: ServiceZone;
  }>;
  serviceZone?: ServiceZone; // For backward compatibility
}

export interface CreateServicePersonPayload {
  email: string;
  name?: string;
  phone?: string;
  password: string;
  serviceZoneIds?: number[];
}

export interface UpdateServicePersonPayload {
  email?: string;
  name?: string;
  phone?: string;
  password?: string;
  serviceZoneIds?: number[];
}

export interface ServicePersonsResponse {
  data: ServicePerson[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getServicePersons = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ServicePersonsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    console.log('Fetching service persons from:', `/service-persons?${queryParams}`);
    const response = await apiClient.get(`/service-persons?${queryParams}`);
    
    // If the response is an array, wrap it in the expected format
    if (Array.isArray(response)) {
      return {
        data: response,
        pagination: {
          page: 1,
          limit: response.length,
          total: response.length,
          totalPages: 1
        }
      };
    }
    
    // If response.data is an array, use it directly
    if (Array.isArray(response.data)) {
      return {
        data: response.data,
        pagination: {
          page: 1,
          limit: response.data.length,
          total: response.data.length,
          totalPages: 1
        }
      };
    }
    
    // If it's an object with data and pagination
    if (response.data && (response.data.data || response.data.pagination)) {
      return {
        data: response.data.data || [],
        pagination: response.data.pagination
      };
    }
    
    // If we get here, the response format is unexpected
    console.error('Unexpected API response format:', response);
    return { data: [], pagination: undefined };
  } catch (error) {
    console.error('Error fetching service persons:', error);
    throw error;
  }
};

export const getServicePerson = async (id: number): Promise<ServicePerson> => {
  try {
    console.log(`Fetching service person with ID: ${id}`);
    const response = await apiClient.get<ServicePerson>(`/service-persons/${id}`);
    console.log('Service person API response:', response);
    
    // Check if response has data and it's not empty
    if (!response) {
      console.error('No response received from API');
      throw new Error('No response received from API');
    }
    
    // Handle different response structures
    let servicePersonData: ServicePerson;
    
    if (response.data) {
      servicePersonData = response.data as ServicePerson;
    } else if (response && typeof response === 'object' && 'id' in response && 'email' in response) {
      // Response might be the service person object directly
      // Check for essential ServicePerson fields
      servicePersonData = response as unknown as ServicePerson;
    } else {
      console.error('Unexpected response structure:', response);
      throw new Error('Service person not found - invalid response structure');
    }
    
    // Validate that we have a service person with the expected ID
    if (!servicePersonData || servicePersonData.id !== id) {
      console.error('Service person data invalid or ID mismatch:', servicePersonData);
      throw new Error('Service person not found');
    }
    
    console.log('Successfully retrieved service person:', servicePersonData);
    return servicePersonData;
  } catch (error) {
    console.error('Error fetching service person:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      status: error && typeof error === 'object' && 'status' in error ? error.status : 'No status',
      response: error && typeof error === 'object' && 'response' in error ? error.response : 'No response data'
    });
    throw error;
  }
};

export const createServicePerson = async (data: CreateServicePersonPayload): Promise<ServicePerson> => {
  try {
    const response = await apiClient.post<ServicePerson>('/service-persons', data);
    if (!response.data) throw new Error('Failed to create service person');
    return response.data as ServicePerson;
  } catch (error) {
    console.error('Error creating service person:', error);
    throw error;
  }
};

export const updateServicePerson = async (id: number, data: UpdateServicePersonPayload): Promise<ServicePerson> => {
  try {
    console.log(`Updating service person with ID: ${id}`, data);
    const response = await apiClient.put<ServicePerson>(`/service-persons/${id}`, data);
    console.log('Update service person API response:', response);
    
    // Handle different response structures
    let servicePersonData: ServicePerson;
    
    if (response.data) {
      servicePersonData = response.data as ServicePerson;
    } else if (response && typeof response === 'object' && 'id' in response && 'email' in response) {
      // Response might be the service person object directly
      servicePersonData = response as unknown as ServicePerson;
    } else {
      console.error('Unexpected response structure:', response);
      throw new Error('Failed to update service person - invalid response structure');
    }
    
    console.log('Successfully updated service person:', servicePersonData);
    return servicePersonData;
  } catch (error) {
    console.error('Error updating service person:', error);
    throw error;
  }
};

export const deleteServicePerson = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/service-persons/${id}`);
  } catch (error) {
    console.error('Error deleting service person:', error);
    throw error;
  }
};
