// frontend/client-portal/src/apis/contracts.api.ts
import api from '../utils/api';
import type {
  Contract,
  ContractApiResponse,
  ContractSignature,
  SignatureSubmission,
  PendingContractsResponse,
  ContractStatus,
  ContractAmendment,
  ContractDocument,
} from '../types/contracts.types';

// Interface for detailed contract status  
export interface DetailedContractStatus {
  contract_id: string;
  status: ContractStatus;
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

// Transform API response to frontend Contract format
const transformContractResponse = (apiResponse: ContractApiResponse): Contract => {
  // Handle event data - can be either an ID or a full object
  const eventData = typeof apiResponse.event === 'object' ? {
    id: apiResponse.event.id.toString(),
    title: apiResponse.event.name || `Event #${apiResponse.event.id}`,
    date: apiResponse.event.start_date || '',
    status: apiResponse.event.status || '',
  } : {
    id: apiResponse.event.toString(),
    title: `Event #${apiResponse.event}`, // Fallback when only ID is provided
    date: '', 
    status: '',
  };

  // Type for extended API response with all optional fields
  type ExtendedApiResponse = ContractApiResponse & {
    signatures?: ContractSignature[];
    content?: string;
    signature_progress?: { total_required: number; signed_count: number; percentage: number };
    can_client_sign?: boolean;
    is_expired?: boolean;
    is_expiring_soon?: boolean;
    days_until_expiry?: number | null;
    expiry_urgency?: 'CRITICAL' | 'HIGH' | 'NORMAL' | null;
    sign_disabled_reason?: string | null;
  };
  const extResponse = apiResponse as ExtendedApiResponse;

  return {
    id: apiResponse.id.toString(),
    event: eventData,
    template: {
      id: apiResponse.template.toString(),
      name: apiResponse.template_name,
      description: '',
      requires_signature: true, // Default assumption
      signature_requirements: Array.from(new Set(extResponse.signatures?.map(s => s.role) || ['CLIENT'])), // Extract actual roles from signatures
    },
    status: apiResponse.status,
    content: extResponse.content || '', // Content may be missing in list endpoints
    sent_at: apiResponse.sent_at,
    fully_signed_at: apiResponse.fully_signed_at,
    valid_until: apiResponse.valid_until,
    contract_value: apiResponse.contract_value,
    payment_schedule_reference: apiResponse.payment_schedule_reference || '',
    currency: apiResponse.currency,
    is_amendment: apiResponse.is_amendment,
    original_contract: apiResponse.original_contract?.toString() || null,
    amendment_number: apiResponse.amendment_number,
    signatures: extResponse.signatures || [], // May be missing in list endpoints
    is_fully_signed: apiResponse.is_fully_signed,
    signature_progress: extResponse.signature_progress ? {
      total_required: extResponse.signature_progress.total_required,
      signed_count: extResponse.signature_progress.signed_count,
      percentage: extResponse.signature_progress.percentage,
      required_roles: [],
      signed_roles: [],
      missing_roles: []
    } : undefined,
    can_client_sign: extResponse.can_client_sign ?? (apiResponse.status === 'SENT' && !apiResponse.is_fully_signed),
    // Expiry-related fields from backend
    is_expired: extResponse.is_expired,
    is_expiring_soon: extResponse.is_expiring_soon,
    days_until_expiry: extResponse.days_until_expiry,
    expiry_urgency: extResponse.expiry_urgency,
    sign_disabled_reason: extResponse.sign_disabled_reason,
    created_at: apiResponse.created_at,
    updated_at: apiResponse.updated_at,
  };
};

// Contract API functions
export const contractsApi = {
  // Get all contracts for the current client
  getContracts: async (): Promise<Contract[]> => {
    const response = await api.get('/contracts/client/contracts/');
    const data = response.data as { results?: ContractApiResponse[] } | ContractApiResponse[];
    const apiContracts = Array.isArray(data) ? data : (data.results || []);
    return apiContracts.map(transformContractResponse);
  },

  // Get a specific contract by ID
  getContract: async (contractId: string): Promise<Contract> => {
    const response = await api.get(`/contracts/client/contracts/${contractId}/`);
    return transformContractResponse(response.data as ContractApiResponse);
  },

  // Get contract status
  getContractStatus: async (contractId: string): Promise<DetailedContractStatus> => {
    const response = await api.get(`/contracts/client/contracts/${contractId}/status/`);
    return response.data as DetailedContractStatus;
  },

  // Get contracts that require client signature
  getPendingSignatures: async (): Promise<PendingContractsResponse> => {
    const response = await api.get('/contracts/client/contracts/pending_signatures/');
    const data = response.data as { count: number; contracts: ContractApiResponse[] };
    return {
      count: data.count,
      contracts: data.contracts.map(transformContractResponse),
    };
  },

  // Submit a signature for a contract
  signContract: async (contractId: string, signatureData: SignatureSubmission): Promise<Contract> => {
    const response = await api.post(`/contracts/client/contracts/${contractId}/sign/`, signatureData);
    return transformContractResponse(response.data as ContractApiResponse);
  },

  // Download signed contract PDF
  downloadContractPdf: async (contractId: string): Promise<Blob> => {
    try {
      const response = await api.get(`/contracts/client/contracts/${contractId}/download_pdf/`, {
        responseType: 'blob',
      });
      
      // Check if the response is actually an error (JSON) instead of a PDF
      const dataBlob = response.data as Blob;
      if (dataBlob.type === 'application/json') {
        // Parse the error from blob
        const text = await dataBlob.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.detail || errorData.error || 'Failed to download contract');
      }
      
      return response.data as Blob;
    } catch (error: unknown) {
      // If it's an axios error with a blob response, try to parse it
      if ((error as { response?: { data?: Blob } }).response?.data instanceof Blob) {
        try {
          const text = await ((error as { response: { data: Blob } }).response.data.text());
          const errorData = JSON.parse(text);
          throw new Error(errorData.detail || errorData.error || 'Failed to download contract');
        } catch (_parseError) {
          // If we can't parse it, throw the original error
          throw error;
        }
      }
      throw error;
    }
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

  // Get amendments for a contract
  getContractAmendments: async (contractId: string): Promise<ContractAmendment[]> => {
    const response = await api.get(`/contracts/client/contracts/${contractId}/amendments/`);
    return response.data as ContractAmendment[];
  },

  // Get documents for a contract
  getContractDocuments: async (contractId: string): Promise<ContractDocument[]> => {
    const response = await api.get(`/contracts/client/contracts/${contractId}/documents/`);
    return response.data as ContractDocument[];
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
    if (import.meta.env.DEV) {
      console.log('🔍 VALIDATE SIGNATURE called', {
        hasData: !!signatureData,
        dataType: typeof signatureData,
        dataLength: signatureData?.length || 0,
        timestamp: Date.now()
      });
    }

    // Basic validation - signature should be a non-empty string
    if (!signatureData || signatureData.trim().length === 0) {
      if (import.meta.env.DEV) console.log('🔍 VALIDATE SIGNATURE: FAILED - No data or empty string');
      return false;
    }

    // Check if it's a valid base64 data URL
    if (signatureData.startsWith('data:image/')) {
      if (import.meta.env.DEV) console.log('🔍 VALIDATE SIGNATURE: Checking base64 data URL');
      const base64Data = signatureData.split(',')[1];

      if (!base64Data) {
        if (import.meta.env.DEV) console.log('🔍 VALIDATE SIGNATURE: FAILED - No base64 data after comma');
        return false;
      }

      try {
        atob(base64Data);
        const isValid = base64Data.length > 100; // Minimum complexity check
        if (import.meta.env.DEV) {
          console.log('🔍 VALIDATE SIGNATURE: Base64 validation', {
            base64Length: base64Data.length,
            isValid,
            minLength: 100
          });
        }
        return isValid;
      } catch (error) {
        if (import.meta.env.DEV) console.log('🔍 VALIDATE SIGNATURE: FAILED - Invalid base64 data', error);
        return false;
      }
    }

    const isValid = signatureData.length > 50; // Minimum length for other formats
    if (import.meta.env.DEV) {
      console.log('🔍 VALIDATE SIGNATURE: Non-image data validation', {
        dataLength: signatureData.length,
        isValid,
        minLength: 50
      });
    }

    return isValid;
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