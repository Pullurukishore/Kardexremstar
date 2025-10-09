import type { ServiceZone, CreateServiceZoneInput, ZoneUser } from '@/types/zone';
import api from '@/lib/api/axios';

export interface ServiceZonesResponse {
  data: ServiceZone[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const getServiceZones = async (page: number = 1, limit: number = 10): Promise<ServiceZonesResponse> => {
  try {
    const response = await api.get<ServiceZonesResponse>(`/service-zones?page=${page}&limit=${limit}`);
    
    // Return the response data directly as it should match ServiceZonesResponse
    return response.data;
  } catch (error) {
    console.error('Error fetching service zones:', error);
    // Return empty response in case of error
    return {
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      }
    };
  }
};

export interface CreateServiceZonePayload {
  name: string;
  description?: string;
  isActive?: boolean;
}

export const createServiceZone = async (data: CreateServiceZonePayload): Promise<ServiceZone> => {
  try {
    const response = await api.post<ServiceZone>('/service-zones', data);
    return response.data;
  } catch (error) {
    console.error('Error creating service zone:', error);
    throw error;
  }
};

export const getServiceZone = async (id: number): Promise<ServiceZone> => {
  try {
    const response = await api.get<ServiceZone>(`/service-zones/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching service zone:', error);
    throw error;
  }
};

export const updateServiceZone = async (id: number, data: Partial<CreateServiceZonePayload>): Promise<ServiceZone> => {
  try {
    const response = await api.put<ServiceZone>(`/service-zones/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating service zone:', error);
    throw error;
  }
};

export const deleteServiceZone = async (id: number): Promise<void> => {
  try {
    await api.delete(`/service-zones/${id}`);
  } catch (error) {
    console.error('Error deleting service zone:', error);
    throw error;
  }
};

export const getServiceZoneStats = async (id: number): Promise<any> => {
  try {
    const response = await api.get(`/service-zones/${id}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching service zone stats:', error);
    throw error;
  }
};

// Zone User Services
export const getZoneUser = async (id: number): Promise<ZoneUser> => {
  try {
    const response = await api.get<ZoneUser>(`/zone-users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching zone user:', error);
    throw error;
  }
};

export const updateZoneUserAssignments = async (id: number, serviceZoneIds: number[]): Promise<ZoneUser> => {
  try {
    const response = await api.put<ZoneUser>(`/zone-users/${id}`, { serviceZoneIds });
    return response.data;
  } catch (error) {
    console.error('Error updating zone user assignments:', error);
    throw error;
  }
};

export const getAllServiceZones = async (): Promise<ServiceZone[]> => {
  try {
    const response = await api.get<ServiceZone[]>('/service-zones/all');
    return response.data;
  } catch (error) {
    console.error('Error fetching all service zones:', error);
    throw error;
  }
};
