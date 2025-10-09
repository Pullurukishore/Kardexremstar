export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';

export interface Asset {
  id: number;
  machineId: string;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  installationDate?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  status: AssetStatus;
  notes?: string;
  customerId: number;
  customer?: {
    id: number;
    companyName: string;
  };
  serviceZoneId?: number;
  serviceZone?: {
    id: number;
    name: string;
  };
  _count?: {
    tickets: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AssetFormData {
  machineId: string;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  installationDate?: string;
  warrantyExpiry?: string;
  lastServiceDate?: string;
  nextServiceDate?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
  notes?: string;
  customerId: number;
  serviceZoneId?: number;
}
