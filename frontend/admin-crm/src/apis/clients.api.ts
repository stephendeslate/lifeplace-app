// frontend/admin-crm/src/apis/clients.api.ts

import api from '../utils/api';
import type {
  Client,
  CreateClientData,
  UpdateClientData,
  ClientFilters,
  ClientInvitation,
  AcceptInvitationData,
  AcceptInvitationResponse,
  Event
} from '../types/clients.types';
import type { PaginatedResponse, PaginationParams } from '../types/common.types';

export const clientsApi = {
  // Client CRUD operations with pagination
  getClients: async (filters?: ClientFilters & PaginationParams): Promise<PaginatedResponse<Client>> => {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.has_account !== undefined) params.append('has_account', filters.has_account.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());
    
    const response = await api.get<PaginatedResponse<Client>>(`/clients/?${params.toString()}`);
    return response.data;
  },

  getClient: async (id: number): Promise<Client> => {
    const response = await api.get<Client>(`/clients/${id}/`);
    return response.data;
  },

  createClient: async (data: CreateClientData): Promise<Client> => {
    const response = await api.post<Client>('/clients/', data);
    return response.data;
  },

  updateClient: async (id: number, data: UpdateClientData): Promise<Client> => {
    const response = await api.patch<Client>(`/clients/${id}/`, data);
    return response.data;
  },

  deleteClient: async (id: number): Promise<void> => {
    await api.delete(`/clients/${id}/`);
  },

  // Client-specific endpoints
  getActiveClients: async (): Promise<Client[]> => {
    const response = await api.get<Client[]>('/clients/active/');
    
    // Handle paginated response - extract results array
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results as Client[];
    }
    
    // Fallback for direct array response
    return response.data || [];
  },

  getClientEvents: async (id: number): Promise<Event[]> => {
    const response = await api.get<Event[]>(`/clients/${id}/events/`);
    return response.data;
  },

  // Client invitation operations
  sendInvitation: async (id: number): Promise<ClientInvitation> => {
    const response = await api.post<ClientInvitation>(`/clients/${id}/send_invitation/`);
    return response.data;
  },

  getInvitation: async (invitationId: string): Promise<ClientInvitation> => {
    const response = await api.get<ClientInvitation>(`/clients/invitations/${invitationId}/`);
    return response.data;
  },

  acceptInvitation: async (invitationId: string, data: AcceptInvitationData): Promise<AcceptInvitationResponse> => {
    const response = await api.post<AcceptInvitationResponse>(`/clients/invitations/${invitationId}/accept/`, data);
    return response.data;
  },

  // Import/Export operations (placeholder for future implementation)
  importClients: async (file: File): Promise<{ success: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<{ success: number; errors: string[] }>('/clients/import/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  exportClients: async (filters?: ClientFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.has_account !== undefined) params.append('has_account', filters.has_account.toString());
    
    const response = await api.get<Blob>(`/clients/export/?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};