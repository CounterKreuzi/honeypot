import { apiClient } from './client';
import { AuthResponse } from '@/types/api';

export const authApi = {
  register: async (email: string, password: string, name: string) => {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/api/auth/profile');
    return response.data;
  },
};
