// frontend/client-portal/src/apis/contracts.api.ts
import api from '../utils/api';
import type {
  Contract,
  ContractSignature,
  SignatureSubmission,
  PendingContractsResponse,
} from '../types/contracts.types';

// Interface for detailed contract status
export interface DetailedContractStatus {
  contract_id: string;
  status: string;
  is_fully_signed: boolean;
  signature_progress: {
    total_required: number;
    completed: number;
    percentage: number;
  };
  signatures: {
    [role: string]: {
      required: boolean;
      signed: boolean;
      signed_at: string | null;
      signer_name: string | null;
      is_current_user: boolean;
    };
  };
  can_client_sign: boolean;
  expires_at: string | null;
}

// Contract API functions
export const contractsApi = {
  // Get all contracts for the current client
  getContracts: async (): Promise<Contract[]> => {
    const response = await api.get('/contracts/client/contracts/');
    const data = response.data as { results?: Contract[] } | Contract[];
    return Array.isArray(data) ? data : (data.results || []);
  },

  // Get a specific contract by ID
  getContract: async (contractId: string): Promise<Contract> => {
    const response = await api.get(`/contracts/client/contracts/${contractId}/`);
    return response.data as Contract;
  },

  // Get contract status
  getContractStatus: async (contractId: string): Promise<DetailedContractStatus> => {
    const response = await api.get(`/contracts/client/contracts/${contractId}/status/`);
    return response.data as DetailedContractStatus;
  },

  // Get contracts that require client signature
  getPendingSignatures: async (): Promise<PendingContractsResponse> => {
    const response = await api.get('/contracts/client/contracts/pending_signatures/');
    return response.data as PendingContractsResponse;
  },

  // Submit a signature for a contract
  signContract: async (contractId: string, signatureData: SignatureSubmission): Promise<Contract> => {
    const response = await api.post(`/contracts/client/contracts/${contractId}/sign/`, signatureData);
    return response.data as Contract;
  },

  // Download signed contract PDF (placeholder)
  downloadContractPdf: async (contractId: string): Promise<Blob> => {
    const response = await api.get(`/contracts/client/contracts/${contractId}/download_pdf/`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  // Get signatures for a contract
  getContractSignatures: async (contractId: string): Promise<ContractSignature[]> => {
    const response = await api.get(`/contracts/client/signatures/?contract=${contractId}`);
    const data = response.data as { results?: ContractSignature[] } | ContractSignature[];
    return Array.isArray(data) ? data : (data.results || []);
  },

  // Get current user's signatures
  getMySignatures: async (): Promise<{ count: number; signatures: ContractSignature[] }> => {
    const response = await api.get('/contracts/client/signatures/my_signatures/');
    return response.data as { count: number; signatures: ContractSignature[] };
  },
};

// Utility functions
export const contractUtils = {
  // Check if contract is expired
  isContractExpired: (contract: Contract): boolean => {
    if (!contract.valid_until) return false;
    return new Date(contract.valid_until) < new Date();
  },

  // Get contract status color
  getStatusColor: (status: Contract['status']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'SENT':
        return 'info';
      case 'PARTIALLY_SIGNED':
        return 'warning';
      case 'SIGNED':
        return 'success';
      case 'EXPIRED':
        return 'error';
      case 'VOID':
        return 'error';
      case 'AMENDED':
        return 'secondary';
      default:
        return 'default';
    }
  },

  // Get contract status display text
  getStatusDisplay: (status: Contract['status']): string => {
    switch (status) {
      case 'DRAFT':
        return 'Draft';
      case 'SENT':
        return 'Sent for Signature';
      case 'PARTIALLY_SIGNED':
        return 'Partially Signed';
      case 'SIGNED':
        return 'Fully Signed';
      case 'EXPIRED':
        return 'Expired';
      case 'VOID':
        return 'Void';
      case 'AMENDED':
        return 'Amended';
      default:
        return status;
    }
  },

  // Format contract value for display
  formatContractValue: (value: string | null, currency: string = 'PHP'): string => {
    if (!value) return 'Not specified';
    const numValue = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(numValue);
  },

  // Calculate days until expiry
  getDaysUntilExpiry: (validUntil: string | null): number | null => {
    if (!validUntil) return null;
    const expiryDate = new Date(validUntil);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Generate device fingerprint for security
  generateDeviceFingerprint: (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      timestamp: Date.now(),
    };
    
    return btoa(JSON.stringify(fingerprint));
  },

  // Validate signature data
  validateSignature: (signatureData: string): boolean => {
    // Basic validation - signature should be a non-empty string
    if (!signatureData || signatureData.trim().length === 0) {
      return false;
    }
    
    // Check if it's a valid base64 data URL
    if (signatureData.startsWith('data:image/')) {
      const base64Data = signatureData.split(',')[1];
      try {
        atob(base64Data);
        return base64Data.length > 100; // Minimum complexity check
      } catch {
        return false;
      }
    }
    
    return signatureData.length > 50; // Minimum length for other formats
  },

  // Compress signature data for transmission
  compressSignatureData: (signatureData: string): string => {
    // For now, just return the data as-is
    // In a real implementation, you might use LZ-String or similar
    return signatureData;
  },

  // Create signature metadata
  createSignatureMetadata: (): Record<string, unknown> => {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
    };
  },
};