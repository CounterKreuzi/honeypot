import { apiClient } from './client';
import { AuthResponse } from '@/types/api';

export const authApi = {
  registerIntent: async (email: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/register-intent',
      { email }
    );
    return response.data;
  },
  registerComplete: async (
    token: string,
    password: string,
    name: string,
    opts?: {
      address?: string;
      city?: string;
      postalCode?: string;
      salutation?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      shortDescription?: string;
      website?: string;
      phoneCustomer?: string;
      phoneAdmin?: string;
    }
  ) => {
    const response = await apiClient.post<{ success: boolean; message: string; data?: any }>(
      '/api/auth/register-complete',
      { token, password, name, ...(opts || {}) }
    );
    return response.data;
  },
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

  requestPasswordReset: async (email: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/forgot-password',
      { email }
    );
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/reset-password',
      { token, password }
    );
    return response.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/change-password',
      { currentPassword, newPassword }
    );
    return response.data;
  },
  requestChangeEmail: async (newEmail: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/change-email/request',
      { newEmail }
    );
    return response.data;
  },
  confirmChangeEmail: async (code: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/change-email/confirm',
      { code }
    );
    return response.data;
  },
  verifyEmail: async (token: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/verify-email',
      { token }
    );
    return response.data;
  },
};
