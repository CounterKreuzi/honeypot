import { apiClient } from './client';
import { AuthResponse } from '@/types/api';

export const authApi = {
  register: async (
    email: string,
    password: string,
    name: string,
    opts?: { address?: string; city?: string; postalCode?: string }
  ) => {
    const response = await apiClient.post<AuthResponse>('/api/auth/register', {
      email,
      password,
      name,
      ...(opts || {}),
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
