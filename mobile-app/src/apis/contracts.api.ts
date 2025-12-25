/**
 * Contracts API
 *
 * API calls for contract management and signing.
 */

import api from '@/utils/api';
import type { ContractStatus, SignatureProgress } from '@/types/events.types';

// =============================================================================
// TYPES
// =============================================================================

export interface Contract {
  id: number;
  event: {
    id: number;
    title: string;
  };
  template: {
    id: number;
    name: string;
  };
  status: ContractStatus;
  content: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  can_client_sign: boolean;
  signature_progress: SignatureProgress;
  signatures: ContractSignature[];
}

export interface ContractSignature {
  id: number;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  signed_at: string | null;
  is_signed: boolean;
  is_client_signature: boolean;
}

export interface ContractSignInput {
  signature_data: string; // Base64 encoded signature image
  signer_name: string;
  signer_email?: string;
  agreed_to_terms: boolean;
}

export interface ContractsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Contract[];
}

export interface ContractFilters {
  event?: number;
  status?: ContractStatus;
  page?: number;
  page_size?: number;
}

// =============================================================================
// API
// =============================================================================

export const contractsApi = {
  /**
   * Get contracts with optional filters
   */
  getContracts: async (filters?: ContractFilters): Promise<ContractsListResponse> => {
    const params = new URLSearchParams();
    if (filters?.event) params.append('event', filters.event.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const queryString = params.toString();
    const url = queryString ? `/contracts/?${queryString}` : '/contracts/';
    const response = await api.get<ContractsListResponse>(url);
    return response.data;
  },

  /**
   * Get contracts for a specific event
   */
  getEventContracts: async (eventId: number): Promise<Contract[]> => {
    const response = await contractsApi.getContracts({ event: eventId });
    return response.results;
  },

  /**
   * Get contracts needing client signature
   */
  getPendingSignatureContracts: async (): Promise<Contract[]> => {
    const response = await contractsApi.getContracts({ status: 'SENT' });
    return response.results.filter((contract) => contract.can_client_sign);
  },

  /**
   * Get a single contract by ID
   */
  getContract: async (id: number): Promise<Contract> => {
    const response = await api.get<Contract>(`/contracts/${id}/`);
    return response.data;
  },

  /**
   * Sign a contract
   */
  signContract: async (id: number, data: ContractSignInput): Promise<Contract> => {
    const response = await api.post<Contract>(`/contracts/${id}/sign/`, data);
    return response.data;
  },

  /**
   * Download contract as PDF
   */
  downloadContract: async (id: number): Promise<Blob> => {
    const response = await api.get<Blob>(`/contracts/${id}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get contract preview (HTML content)
   */
  getContractPreview: async (id: number): Promise<{ content: string }> => {
    const response = await api.get<{ content: string }>(`/contracts/${id}/preview/`);
    return response.data;
  },
};

export default contractsApi;
