// frontend/client-portal/src/apis/clients.api.ts
import type { ClientInvitation, AcceptInvitationData, AcceptInvitationResponse } from '../types/clients.types';
import api from '../utils/api';

export const clientsApi = {

  getInvitation: async (invitationId: string): Promise<ClientInvitation> => {
    const response = await api.get<ClientInvitation>(`/clients/invitations/${invitationId}/`);
    return response.data;
  },

  acceptInvitation: async (invitationId: string, data: AcceptInvitationData): Promise<AcceptInvitationResponse> => {
    const response = await api.post<AcceptInvitationResponse>(`/clients/invitations/${invitationId}/accept/`, data);
    return response.data;
  },
};