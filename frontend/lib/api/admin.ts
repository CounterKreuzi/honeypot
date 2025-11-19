import { apiClient } from './client';
import type { Beekeeper, OpeningHours } from '@/types/api';

export interface AdminBeekeeper extends Beekeeper {
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  customerPhone?: string | null;
  adminPhone?: string | null;
  openingHours?: OpeningHours | null;
  isVerified: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
    isVerified: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminBeekeeperListResponse {
  success: boolean;
  data: {
    items: AdminBeekeeper[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface AdminCreateBeekeeperPayload {
  email: string;
  password: string;
  name: string;
  address: string;
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  description?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number;
  longitude?: number;
  phone?: string | null;
  customerPhone?: string | null;
  adminPhone?: string | null;
  website?: string | null;
  openingHours?: OpeningHours | null;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface AdminUpdateBeekeeperPayload {
  name?: string;
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  description?: string | null;
  address?: string;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number;
  longitude?: number;
  phone?: string | null;
  customerPhone?: string | null;
  adminPhone?: string | null;
  website?: string | null;
  openingHours?: OpeningHours | null;
  isActive?: boolean;
  isVerified?: boolean;
}

export const adminApi = {
  listBeekeepers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    isVerified?: boolean;
  }): Promise<AdminBeekeeperListResponse> => {
    const response = await apiClient.get<AdminBeekeeperListResponse>('/api/admin/beekeepers', {
      params,
    });
    return response.data;
  },
  getBeekeeper: async (id: string) => {
    const response = await apiClient.get<{ success: boolean; data: AdminBeekeeper }>(
      `/api/admin/beekeepers/${id}`
    );
    return response.data;
  },
  createBeekeeper: async (payload: AdminCreateBeekeeperPayload) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: { user: { id: string; email: string; role: string }; beekeeper: AdminBeekeeper };
    }>('/api/admin/beekeepers', payload);
    return response.data;
  },
  updateBeekeeper: async (id: string, payload: AdminUpdateBeekeeperPayload) => {
    const response = await apiClient.put<{ success: boolean; message: string; data: AdminBeekeeper }>(
      `/api/admin/beekeepers/${id}`,
      payload
    );
    return response.data;
  },
};
