// Enhanced Beekeepers API with Filter Support
// Add this to your frontend/lib/api/beekeepers.ts or create a new file

import { apiClient } from './client';
import { BeekeepersResponse, Beekeeper } from '@/types/api';

export interface SearchFilters {
  latitude?: number;
  longitude?: number;
  radius?: number;
  honeyTypes?: string[];
  minPrice?: number;
  maxPrice?: number;
  hasWebsite?: boolean;
  openNow?: boolean;
  city?: string;
  sortBy?: 'distance' | 'name' | 'price';
}

export const beekeepersApi = {
  // Get all beekeepers
  getAll: async (): Promise<Beekeeper[]> => {
    const response = await apiClient.get<BeekeepersResponse>('/api/beekeepers/all');
    return response.data.data;
  },

  // Search nearby with basic parameters
  searchNearby: async (
    latitude: number,
    longitude: number,
    radius: number = 10
  ): Promise<Beekeeper[]> => {
    const response = await apiClient.get<BeekeepersResponse>(
      `/api/beekeepers/search/nearby`,
      {
        params: { latitude, longitude, radius },
      }
    );
    return response.data.data;
  },

  // Advanced search with filters
  searchWithFilters: async (filters: SearchFilters): Promise<Beekeeper[]> => {
    const params: Record<string, unknown> = { ...filters };
    
    // Convert array to comma-separated string for query params
    if (filters.honeyTypes && Array.isArray(filters.honeyTypes)) {
      params.honeyTypes = filters.honeyTypes.join(',');
    }

    const response = await apiClient.get<BeekeepersResponse>(
      `/api/beekeepers/search/advanced`,
      { params }
    );
    return response.data.data;
  },

  // Get single beekeeper by ID
  getById: async (id: string): Promise<Beekeeper> => {
    const response = await apiClient.get(`/api/beekeepers/${id}`);
    return response.data.data;
  },

  // Get all available honey types for filters
  getHoneyTypes: async (): Promise<string[]> => {
    const response = await apiClient.get<{ success: boolean; data: string[] }>(
      '/api/beekeepers/honey-types'
    );
    return response.data.data;
  },

  // Get all cities for filters
  getCities: async (): Promise<string[]> => {
    const response = await apiClient.get<{ success: boolean; data: string[] }>(
      '/api/beekeepers/cities'
    );
    return response.data.data;
  },

  // Authenticated: own profile
  getMyProfile: async (): Promise<Beekeeper> => {
    const response = await apiClient.get<{ success: boolean; data: Beekeeper }>(
      '/api/beekeepers/profile'
    );
    return response.data.data;
  },

  updateProfile: async (
    payload: Partial<
      Pick<
        Beekeeper,
        'name' | 'description' | 'address' | 'city' | 'postalCode' | 'country' | 'phone' | 'website' | 'openingHours'
      >
    > & { photo?: string | null; logo?: string | null }
  ): Promise<Beekeeper> => {
    const response = await apiClient.put<{ success: boolean; data: Beekeeper }>(
      '/api/beekeepers/profile',
      payload
    );
    return response.data.data;
  },

  addHoneyType: async (
    honey: { name: string; description?: string; price?: number | null; unit?: string; available?: boolean; price250?: number | null; price500?: number | null; price1000?: number | null }
  ) => {
    const response = await apiClient.post<{ success: boolean }>(
      '/api/beekeepers/honey-types',
      honey
    );
    return response.data;
  },

  updateHoneyType: async (
    honeyTypeId: string,
    honey: { name?: string; description?: string; price?: number | null; unit?: string; available?: boolean; price250?: number | null; price500?: number | null; price1000?: number | null }
  ) => {
    const response = await apiClient.put<{ success: boolean }>(
      `/api/beekeepers/honey-types/${honeyTypeId}`,
      honey
    );
    return response.data;
  },

  deleteHoneyType: async (honeyTypeId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/api/beekeepers/honey-types/${honeyTypeId}`
    );
    return response.data;
  },
};
