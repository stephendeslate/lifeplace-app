// frontend/admin-crm/src/apis/settings.api.ts

import api from '../utils/api';
import type { User } from '../types/auth.types';
import type { AccountSettingsFormData, PasswordChangeFormData, AdminUser } from '../types/settings.types';

export const settingsApi = {
  /**
   * Account Settings
   */
  updateProfile: async (data: AccountSettingsFormData): Promise<User> => {
    const response = await api.put<User>('/users/me/', data);
    return response.data;
  },

  changePassword: async (data: PasswordChangeFormData): Promise<{ detail: string }> => {
    const response = await api.post<{ detail: string }>('/users/me/change-password/', data);
    return response.data;
  },

  /**
   * Admin Users Management
   */
  getAdminUsers: async (): Promise<AdminUser[]> => {
    const response = await api.get<AdminUser[]>('/users/');
    // Filter admin users on the frontend since backend might not support role filtering
    return response.data.filter((user: AdminUser) => user.role === 'ADMIN');
  },

  createAdminUser: async (data: any): Promise<AdminUser> => {
    const response = await api.post<AdminUser>('/users/', data);
    return response.data;
  },

  updateAdminUser: async (id: number, data: any): Promise<AdminUser> => {
    const response = await api.put<AdminUser>(`/users/${id}/`, data);
    return response.data;
  },

  deleteAdminUser: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}/`);
  },

  /**
   * Admin Invitations
   */
  getInvitations: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/users/invitations/');
    return response.data;
  },

  createInvitation: async (data: {
    email: string;
    first_name: string;
    last_name: string;
  }): Promise<any> => {
    const response = await api.post('/users/invitations/', data);
    return response.data;
  },

  deleteInvitation: async (id: string): Promise<void> => {
    await api.delete(`/users/invitations/${id}/`);
  },
};