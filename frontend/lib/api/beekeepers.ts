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
    const params: any = { ...filters };
    
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
};