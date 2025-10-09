import api from '@/lib/api/axios';
import { Asset, AssetFormData } from '@/types/asset';

export interface AssetListResponse {
  data: Asset[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AssetStats {
  total: number;
  active: number;
  inMaintenance: number;
  inactive: number;
  decommissioned: number;
}

export const fetchAssets = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: number;
  status?: string;
} = {}): Promise<AssetListResponse> => {
  const { page = 1, limit = 10, search = '', customerId, status } = params;
  const response = await api.get('/assets', {
    params: {
      page,
      limit,
      search,
      ...(customerId && { customerId }),
      ...(status && { status })
    },
  });
  return response.data;
};

export const fetchAsset = async (id: number): Promise<Asset> => {
  const response = await api.get(`/assets/${id}`);
  return response.data;
};

export const createAsset = async (data: AssetFormData): Promise<Asset> => {
  const response = await api.post('/assets', data);
  return response.data;
};

export const updateAsset = async (id: number, data: Partial<AssetFormData>): Promise<Asset> => {
  const response = await api.put(`/assets/${id}`, data);
  return response.data;
};

export const deleteAsset = async (id: number): Promise<void> => {
  await api.delete(`/assets/${id}`);
};

export const getAssetStatistics = async (): Promise<AssetStats> => {
  const response = await api.get('/assets/stats');
  return response.data;
};

export const getCustomerAssets = async (customerId: number): Promise<Asset[]> => {
  const response = await api.get(`/assets?customerId=${customerId}`);
  return response.data.data;
};
