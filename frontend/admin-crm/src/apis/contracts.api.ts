// frontend/admin-crm/src/apis/contracts.api.ts

import api from '../utils/api';
import type {
  ContractTemplate,
  EventContract,
  ContractSignature,
  ContractAmendment,
  ContractDocument,
  ContractNote,
  CreateContractTemplateData,
  UpdateContractTemplateData,
  CreateEventContractData,
  UpdateEventContractData,
  CreateContractSignatureData,
  CreateContractAmendmentData,
  CreateContractDocumentData,
  CreateContractNoteData,
  EventContractFilters,
  ContractSignatureFilters,
  ContractAmendmentFilters,
} from '../types/contracts.types';
import type { VariableSchemas } from '../types/templates.types';
import type { PaginatedResponse, PaginationParams } from '../types/common.types';

export interface ContractTemplateQueryParams extends PaginationParams {
  search?: string;
  event_type?: number;
  is_active?: boolean;
  ordering?: string;
}

export const contractsApi = {
  // Contract Templates
  getContractTemplates: async (
    params?: ContractTemplateQueryParams,
  ): Promise<PaginatedResponse<ContractTemplate>> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.event_type !== undefined)
      searchParams.append('event_type', params.event_type.toString());
    if (params?.is_active !== undefined)
      searchParams.append('is_active', params.is_active.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params?.ordering) searchParams.append('ordering', params.ordering);

    const response = await api.get<PaginatedResponse<ContractTemplate>>(
      `/contracts/templates/?${searchParams.toString()}`,
    );
    return response.data;
  },

  getContractTemplate: async (id: number): Promise<ContractTemplate> => {
    const response = await api.get<ContractTemplate>(`/contracts/templates/${id}/`);
    return response.data;
  },

  createContractTemplate: async (data: CreateContractTemplateData): Promise<ContractTemplate> => {
    const response = await api.post<ContractTemplate>('/contracts/templates/', data);
    return response.data;
  },

  updateContractTemplate: async (
    id: number,
    data: UpdateContractTemplateData,
  ): Promise<ContractTemplate> => {
    const response = await api.patch<ContractTemplate>(`/contracts/templates/${id}/`, data);
    return response.data;
  },

  deleteContractTemplate: async (id: number): Promise<void> => {
    await api.delete(`/contracts/templates/${id}/`);
  },

  getTemplatesForEventType: async (eventTypeId: number): Promise<ContractTemplate[]> => {
    const response = await api.get(
      `/contracts/templates/for_event_type/?event_type=${eventTypeId}`,
    );
    const data = response.data as PaginatedResponse<ContractTemplate> | ContractTemplate[];
    return Array.isArray(data) ? data : data.results || [];
  },

  previewTemplate: async (
    id: number,
    contextData: Record<string, unknown> = {},
    eventId?: number,
  ): Promise<{
    template_id: number;
    template_name: string;
    rendered_content: string;
    variables: string[];
    sections: string[];
    event_type: string | null;
    context_used: Record<string, unknown>;
    available_variables?: Record<string, string>;
  }> => {
    const requestData: {
      context_data: Record<string, unknown>;
      event_id?: number;
    } = {
      context_data: contextData,
    };

    if (eventId) {
      requestData.event_id = eventId;
    }

    const response = await api.post<{
      template_id: number;
      template_name: string;
      rendered_content: string;
      variables: string[];
      sections: string[];
      event_type: string | null;
      context_used: Record<string, unknown>;
      available_variables?: Record<string, string>;
    }>(`/contracts/templates/${id}/preview/`, requestData);
    return response.data;
  },

  getVariableSchemas: async (): Promise<VariableSchemas> => {
    const response = await api.get<VariableSchemas>('/contracts/templates/variable_schemas/');
    return response.data;
  },

  // Event Contracts
  getEventContracts: async (filters?: EventContractFilters): Promise<EventContract[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_id) params.append('event_id', filters.event_id.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.template) params.append('template', filters.template.toString());

    const response = await api.get(`/contracts/contracts/?${params.toString()}`);
    const data = response.data as PaginatedResponse<EventContract> | EventContract[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getEventContract: async (id: number): Promise<EventContract> => {
    const response = await api.get<EventContract>(`/contracts/contracts/${id}/`);
    return response.data;
  },

  createEventContract: async (data: CreateEventContractData): Promise<EventContract> => {
    const response = await api.post<EventContract>('/contracts/contracts/', data);
    return response.data;
  },

  updateEventContract: async (
    id: number,
    data: UpdateEventContractData,
  ): Promise<EventContract> => {
    const response = await api.patch<EventContract>(`/contracts/contracts/${id}/`, data);
    return response.data;
  },

  deleteEventContract: async (id: number): Promise<void> => {
    await api.delete(`/contracts/contracts/${id}/`);
  },

  getContractsForEvent: async (eventId: number): Promise<EventContract[]> => {
    const response = await api.get(`/contracts/contracts/for_event/?event_id=${eventId}`);
    const data = response.data as PaginatedResponse<EventContract> | EventContract[];
    return Array.isArray(data) ? data : data.results || [];
  },

  addSignature: async (
    id: number,
    data: CreateContractSignatureData,
  ): Promise<ContractSignature> => {
    const response = await api.post<ContractSignature>(
      `/contracts/contracts/${id}/add_signature/`,
      data,
    );
    return response.data;
  },

  voidContract: async (id: number, reason?: string): Promise<EventContract> => {
    const response = await api.post<EventContract>(`/contracts/contracts/${id}/void/`, { reason });
    return response.data;
  },

  requestAmendment: async (
    id: number,
    data: CreateContractAmendmentData,
  ): Promise<ContractAmendment> => {
    const response = await api.post<ContractAmendment>(
      `/contracts/contracts/${id}/request_amendment/`,
      data,
    );
    return response.data;
  },

  getContractAmendments: async (contractId: number): Promise<ContractAmendment[]> => {
    const response = await api.get<ContractAmendment[]>(
      `/contracts/contracts/${contractId}/amendments/`,
    );
    return response.data;
  },

  addContractDocument: async (
    id: number,
    data: CreateContractDocumentData,
  ): Promise<ContractDocument> => {
    const formData = new FormData();
    formData.append('contract', id.toString());
    formData.append('name', data.name);
    formData.append('document_type', data.document_type);
    formData.append('file', data.file);
    if (data.description) formData.append('description', data.description);

    const response = await api.post<ContractDocument>(
      `/contracts/contracts/${id}/add_document/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  getContractDocuments: async (contractId: number): Promise<ContractDocument[]> => {
    const response = await api.get<ContractDocument[]>(
      `/contracts/contracts/${contractId}/documents/`,
    );
    return response.data;
  },

  addContractNote: async (id: number, data: CreateContractNoteData): Promise<ContractNote> => {
    const response = await api.post<ContractNote>(`/contracts/contracts/${id}/add_note/`, data);
    return response.data;
  },

  getContractNotes: async (contractId: number): Promise<ContractNote[]> => {
    const response = await api.get<ContractNote[]>(`/contracts/contracts/${contractId}/notes/`);
    return response.data;
  },

  // Contract Signatures (Global)
  getContractSignatures: async (
    filters?: ContractSignatureFilters,
  ): Promise<ContractSignature[]> => {
    const params = new URLSearchParams();
    if (filters?.contract) params.append('contract', filters.contract.toString());
    if (filters?.role) params.append('role', filters.role);

    const response = await api.get(`/contracts/signatures/?${params.toString()}`);
    const data = response.data as PaginatedResponse<ContractSignature> | ContractSignature[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getContractSignature: async (id: number): Promise<ContractSignature> => {
    const response = await api.get<ContractSignature>(`/contracts/signatures/${id}/`);
    return response.data;
  },

  createContractSignature: async (
    data: CreateContractSignatureData,
  ): Promise<ContractSignature> => {
    const response = await api.post<ContractSignature>('/contracts/signatures/', data);
    return response.data;
  },

  verifySignature: async (id: number, verificationMethod?: string): Promise<ContractSignature> => {
    const response = await api.post<ContractSignature>(`/contracts/signatures/${id}/verify/`, {
      verification_method: verificationMethod,
    });
    return response.data;
  },

  // Contract Amendments (Global)
  getAllContractAmendments: async (
    filters?: ContractAmendmentFilters,
  ): Promise<ContractAmendment[]> => {
    const params = new URLSearchParams();
    if (filters?.contract) params.append('contract', filters.contract.toString());
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get(`/contracts/amendments/?${params.toString()}`);
    const data = response.data as PaginatedResponse<ContractAmendment> | ContractAmendment[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getContractAmendment: async (id: number): Promise<ContractAmendment> => {
    const response = await api.get<ContractAmendment>(`/contracts/amendments/${id}/`);
    return response.data;
  },

  createContractAmendment: async (
    data: CreateContractAmendmentData,
  ): Promise<ContractAmendment> => {
    const response = await api.post<ContractAmendment>('/contracts/amendments/', data);
    return response.data;
  },

  approveAmendment: async (id: number, reviewNotes?: string): Promise<ContractAmendment> => {
    const response = await api.post<ContractAmendment>(`/contracts/amendments/${id}/approve/`, {
      review_notes: reviewNotes,
    });
    return response.data;
  },

  rejectAmendment: async (id: number, reviewNotes?: string): Promise<ContractAmendment> => {
    const response = await api.post<ContractAmendment>(`/contracts/amendments/${id}/reject/`, {
      review_notes: reviewNotes,
    });
    return response.data;
  },

  createAmendmentContract: async (
    id: number,
    contextData?: Record<string, unknown>,
  ): Promise<EventContract> => {
    const response = await api.post<EventContract>(`/contracts/amendments/${id}/create_contract/`, {
      context_data: contextData,
    });
    return response.data;
  },

  // Contract Documents (Global)
  getAllContractDocuments: async (): Promise<ContractDocument[]> => {
    const response = await api.get('/contracts/documents/');
    const data = response.data as PaginatedResponse<ContractDocument> | ContractDocument[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getContractDocument: async (id: number): Promise<ContractDocument> => {
    const response = await api.get<ContractDocument>(`/contracts/documents/${id}/`);
    return response.data;
  },

  createContractDocument: async (data: CreateContractDocumentData): Promise<ContractDocument> => {
    const formData = new FormData();
    formData.append('contract', data.contract.toString());
    formData.append('name', data.name);
    formData.append('document_type', data.document_type);
    formData.append('file', data.file);
    if (data.description) formData.append('description', data.description);

    const response = await api.post<ContractDocument>('/contracts/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Contract Notes (Global)
  getAllContractNotes: async (): Promise<ContractNote[]> => {
    const response = await api.get('/contracts/notes/');
    const data = response.data as PaginatedResponse<ContractNote> | ContractNote[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getContractNote: async (id: number): Promise<ContractNote> => {
    const response = await api.get<ContractNote>(`/contracts/notes/${id}/`);
    return response.data;
  },

  createContractNote: async (data: CreateContractNoteData): Promise<ContractNote> => {
    const response = await api.post<ContractNote>('/contracts/notes/', data);
    return response.data;
  },

  getContractsForClient: async (clientId: number): Promise<EventContract[]> => {
    const response = await api.get<EventContract[]>(`/contracts/contracts/?client_id=${clientId}`);
    return response.data;
  },

  // Download contract PDF
  downloadContractPdf: async (contractId: number): Promise<Blob> => {
    const response = await api.get(`/contracts/contracts/${contractId}/download_pdf/`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  // Send contract to client (change status to SENT)
  sendContract: async (contractId: number): Promise<EventContract> => {
    const response = await api.post<EventContract>(
      `/contracts/contracts/${contractId}/send_contract/`,
    );
    return response.data;
  },
};
