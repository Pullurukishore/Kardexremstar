export interface ServiceZone {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePerson {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  serviceZones: ServiceZone[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceZonesResponse {
  data: ServiceZone[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServicePersonResponse {
  data: ServicePerson;
}

export interface ServicePersonsResponse {
  data: ServicePerson[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
