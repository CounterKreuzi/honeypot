import { apiClient } from './client';
import { BeekeepersResponse, Beekeeper } from '@/types/api';

export const beekeepersApi = {
  getAll: async (): Promise<Beekeeper[]> => {
    const response = await apiClient.get<BeekeepersResponse>('/api/beekeepers/all');
    return response.data.data;
  },

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

  getById: async (id: string): Promise<Beekeeper> => {
    const response = await apiClient.get(`/api/beekeepers/${id}`);
    return response.data.data;
  },
};
