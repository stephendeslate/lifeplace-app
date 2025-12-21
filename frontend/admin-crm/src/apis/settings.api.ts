// frontend/admin-crm/src/apis/settings.api.ts

import api from '../utils/api';
import type { User } from '../types/auth.types';
import type {
  AccountSettingsFormData,
  PasswordChangeFormData,
  AdminUser,
  AdminInvitation,
  InviteAdminFormData,
  AcceptInvitationFormData,
  AcceptInvitationResponse,
  CreateAdminUserData,
  UpdateAdminUserData,
  LegalDocument,
  LegalDocumentUpdateData
} from '../types/settings.types';

// Define paginated response types
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

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
    try {
      const response = await api.get<PaginatedResponse<AdminUser>>('/users/');
      console.log('getAdminUsers response.data:', response.data);
      const users = Array.isArray(response.data.results) ? response.data.results : [];
      return users.filter((user: AdminUser) => user.role === 'ADMIN');
    } catch (error) {
      console.error('getAdminUsers error:', error);
      return [];
    }
  },

  createAdminUser: async (data: CreateAdminUserData): Promise<AdminUser> => {
    const response = await api.post<AdminUser>('/users/', data);
    return response.data;
  },

  updateAdminUser: async (id: number, data: UpdateAdminUserData): Promise<AdminUser> => {
    const response = await api.put<AdminUser>(`/users/${id}/`, data);
    return response.data;
  },

  deleteAdminUser: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}/`);
  },

  /**
   * Admin Invitations
   */
  getInvitations: async (): Promise<AdminInvitation[]> => {
    try {
      const response = await api.get<PaginatedResponse<AdminInvitation>>('/users/invitations/');
      console.log('getInvitations response.data:', response.data);
      return Array.isArray(response.data.results) ? response.data.results : [];
    } catch (error) {
      console.error('getInvitations error:', error);
      return [];
    }
  },

  getInvitation: async (id: string): Promise<AdminInvitation> => {
    const response = await api.get<AdminInvitation>(`/users/invitations/${id}/`);
    return response.data;
  },

  createInvitation: async (data: InviteAdminFormData): Promise<AdminInvitation> => {
    const response = await api.post<AdminInvitation>('/users/invitations/', data);
    return response.data;
  },

  deleteInvitation: async (id: string): Promise<void> => {
    await api.delete(`/users/invitations/${id}/`);
  },

  acceptInvitation: async (
    invitationId: string,
    data: AcceptInvitationFormData
  ): Promise<AcceptInvitationResponse> => {
    const response = await api.post<AcceptInvitationResponse>(
      `/users/invitations/${invitationId}/accept/`,
      data
    );
    return response.data;
  },

  /**
   * Legal Documents Management
   */
  getLegalDocuments: async (): Promise<LegalDocument[]> => {
    const response = await api.get<{ success: boolean; data: LegalDocument[] }>('/settings/legal/');
    return response.data.data;
  },

  getLegalDocument: async (documentType: string): Promise<LegalDocument> => {
    const response = await api.get<{ success: boolean; data: LegalDocument }>(`/settings/legal/${documentType}/`);
    return response.data.data;
  },

  updateLegalDocument: async (
    documentType: string,
    data: LegalDocumentUpdateData
  ): Promise<LegalDocument> => {
    const response = await api.put<{ success: boolean; data: LegalDocument }>(
      `/settings/legal/${documentType}/`,
      data
    );
    return response.data.data;
  },
};