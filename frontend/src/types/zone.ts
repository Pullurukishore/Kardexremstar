export interface ServicePerson {
  id: number;
  userId: number;
  serviceZoneId: number;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
}

export interface ServiceZone {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  servicePersons: ServicePerson[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    servicePersons?: number;
    zoneUsers?: number;
    customers?: number;
    tickets?: number;
  };
}

export interface ZoneUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  serviceZones: Array<{
    serviceZone: {
      id: number;
      name: string;
      description: string | null;
      isActive: boolean;
    };
  }>;
}

export interface CreateServiceZoneInput {
  name: string;
  description?: string;
  isActive?: boolean;
  servicePersonIds?: number[];
}
