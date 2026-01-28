// frontend/admin-crm/src/apis/vip.api.ts

import api from '../utils/api';
import type {
  VIPSettings,
  UpdateVIPSettingsData,
  VIPTier,
  VIPTierListItem,
  CreateVIPTierData,
  UpdateVIPTierData,
  VIPBenefit,
  CreateVIPBenefitData,
  UpdateVIPBenefitData,
  BenefitTypeOption,
  ClientVIPStatus,
  ClientVIPStatusListItem,
  VIPPointTransaction,
  VIPTierHistory,
  AssignTierPayload,
  AwardPointsPayload,
  AdjustPointsPayload,
  AwardPointsResponse,
} from '../types/vip.types';

export const vipApi = {
  // ============================================
  // VIP Settings (Singleton)
  // ============================================

  getSettings: async (): Promise<VIPSettings> => {
    const response = await api.get<VIPSettings>('/vip/settings/');
    return response.data;
  },

  updateSettings: async (data: UpdateVIPSettingsData): Promise<VIPSettings> => {
    const response = await api.patch<VIPSettings>('/vip/settings/', data);
    return response.data;
  },

  // ============================================
  // VIP Tiers
  // ============================================

  getTiers: async (filters?: { is_active?: boolean }): Promise<VIPTier[]> => {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }
    const response = await api.get<VIPTier[] | { results: VIPTier[] }>(`/vip/tiers/?${params.toString()}`);
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },

  getActiveTiers: async (): Promise<VIPTierListItem[]> => {
    const response = await api.get<VIPTierListItem[] | { results: VIPTierListItem[] }>('/vip/tiers/active/');
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },

  getTier: async (id: number): Promise<VIPTier> => {
    const response = await api.get<VIPTier>(`/vip/tiers/${id}/`);
    return response.data;
  },

  createTier: async (data: CreateVIPTierData): Promise<VIPTier> => {
    const response = await api.post<VIPTier>('/vip/tiers/', data);
    return response.data;
  },

  updateTier: async (id: number, data: UpdateVIPTierData): Promise<VIPTier> => {
    const response = await api.patch<VIPTier>(`/vip/tiers/${id}/`, data);
    return response.data;
  },

  deleteTier: async (id: number): Promise<void> => {
    await api.delete(`/vip/tiers/${id}/`);
  },

  // ============================================
  // VIP Benefits
  // ============================================

  getBenefits: async (filters?: {
    tier?: number;
    benefit_type?: string;
    application_mode?: string;
    is_active?: boolean;
  }): Promise<VIPBenefit[]> => {
    const params = new URLSearchParams();
    if (filters?.tier) params.append('tier', filters.tier.toString());
    if (filters?.benefit_type) params.append('benefit_type', filters.benefit_type);
    if (filters?.application_mode) params.append('application_mode', filters.application_mode);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    const response = await api.get<VIPBenefit[] | { results: VIPBenefit[] }>(`/vip/benefits/?${params.toString()}`);
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },

  getBenefit: async (id: number): Promise<VIPBenefit> => {
    const response = await api.get<VIPBenefit>(`/vip/benefits/${id}/`);
    return response.data;
  },

  createBenefit: async (data: CreateVIPBenefitData): Promise<VIPBenefit> => {
    const response = await api.post<VIPBenefit>('/vip/benefits/', data);
    return response.data;
  },

  updateBenefit: async (id: number, data: UpdateVIPBenefitData): Promise<VIPBenefit> => {
    const response = await api.patch<VIPBenefit>(`/vip/benefits/${id}/`, data);
    return response.data;
  },

  deleteBenefit: async (id: number): Promise<void> => {
    await api.delete(`/vip/benefits/${id}/`);
  },

  getBenefitTypes: async (): Promise<BenefitTypeOption[]> => {
    const response = await api.get<BenefitTypeOption[] | { results: BenefitTypeOption[] }>('/vip/benefits/benefit_types/');
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },

  // ============================================
  // Client VIP Status
  // ============================================

  getClientStatuses: async (filters?: {
    tier?: number;
    status?: string;
    search?: string;
    client?: number;
  }): Promise<ClientVIPStatusListItem[]> => {
    const params = new URLSearchParams();
    if (filters?.tier) params.append('tier', filters.tier.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.client) params.append('client', filters.client.toString());
    const response = await api.get<ClientVIPStatusListItem[] | { results: ClientVIPStatusListItem[] }>(`/vip/client-status/?${params.toString()}`);
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },

  getClientStatus: async (id: number): Promise<ClientVIPStatus> => {
    const response = await api.get<ClientVIPStatus>(`/vip/client-status/${id}/`);
    return response.data;
  },

  assignTier: async (clientStatusId: number, data: AssignTierPayload): Promise<ClientVIPStatus> => {
    const response = await api.post<ClientVIPStatus>(
      `/vip/client-status/${clientStatusId}/assign_tier/`,
      data
    );
    return response.data;
  },

  awardPoints: async (clientStatusId: number, data: AwardPointsPayload): Promise<AwardPointsResponse> => {
    const response = await api.post<AwardPointsResponse>(
      `/vip/client-status/${clientStatusId}/award_points/`,
      data
    );
    return response.data;
  },

  adjustPoints: async (clientStatusId: number, data: AdjustPointsPayload): Promise<AwardPointsResponse> => {
    const response = await api.post<AwardPointsResponse>(
      `/vip/client-status/${clientStatusId}/adjust_points/`,
      data
    );
    return response.data;
  },

  getClientTierHistory: async (clientStatusId: number): Promise<VIPTierHistory[]> => {
    const response = await api.get<VIPTierHistory[] | { results: VIPTierHistory[] }>(
      `/vip/client-status/${clientStatusId}/tier_history/`
    );
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },

  getClientPointTransactions: async (clientStatusId: number): Promise<VIPPointTransaction[]> => {
    const response = await api.get<VIPPointTransaction[] | { results: VIPPointTransaction[] }>(
      `/vip/client-status/${clientStatusId}/point_transactions/`
    );
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },

  // ============================================
  // Point Transactions (Admin view)
  // ============================================

  getPointTransactions: async (filters?: {
    client?: number;
    transaction_type?: string;
  }): Promise<VIPPointTransaction[]> => {
    const params = new URLSearchParams();
    if (filters?.client) params.append('client', filters.client.toString());
    if (filters?.transaction_type) params.append('transaction_type', filters.transaction_type);
    const response = await api.get<VIPPointTransaction[] | { results: VIPPointTransaction[] }>(`/vip/point-transactions/?${params.toString()}`);
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },
};
