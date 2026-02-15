// frontend/admin-crm/src/apis/communications.api.ts

import api from "../utils/api";
import type {
  CommunicationTemplate,
  CommunicationRecord,
  CreateTemplateData,
  UpdateTemplateData,
  BulkSendData,
  PreviewData,
  PreviewResult,
  AnalyticsData,
  VariableSchemas,
  CommunicationFilters,
} from "../types/communications.types";

// Enhanced interface for manual message sending
export interface ManualSendData {
  template_id: number;
  recipient: string;
  client_id?: number;
  event_id?: number;
  context_data?: Record<string, unknown>;
  custom_subject?: string;
  custom_body?: string;
}

// Enhanced interface for manual message preview
export interface ManualPreviewData extends PreviewData {
  custom_subject?: string;
  custom_body?: string;
}

export const communicationsApi = {
  // Templates
  getTemplates: async (
    filters?: CommunicationFilters,
  ): Promise<CommunicationTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.channel) params.append("channel", filters.channel);
    if (filters?.search) params.append("search", filters.search);

    const response = await api.get(
      `/communications/templates/?${params.toString()}`,
    );
    const data = response.data as
      | { results?: CommunicationTemplate[] }
      | CommunicationTemplate[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getTemplate: async (id: number): Promise<CommunicationTemplate> => {
    const response = await api.get<CommunicationTemplate>(
      `/communications/templates/${id}/`,
    );
    return response.data;
  },

  createTemplate: async (
    data: CreateTemplateData,
  ): Promise<CommunicationTemplate> => {
    const response = await api.post<CommunicationTemplate>(
      "/communications/templates/",
      data,
    );
    return response.data;
  },

  updateTemplate: async (
    id: number,
    data: UpdateTemplateData,
  ): Promise<CommunicationTemplate> => {
    const response = await api.patch<CommunicationTemplate>(
      `/communications/templates/${id}/`,
      data,
    );
    return response.data;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(`/communications/templates/${id}/`);
  },

  previewTemplate: async (
    id: number,
    data: PreviewData | ManualPreviewData,
  ): Promise<PreviewResult> => {
    const response = await api.post<PreviewResult>(
      `/communications/templates/${id}/preview/`,
      data,
    );
    return response.data;
  },

  getVariableSchemas: async (): Promise<VariableSchemas> => {
    const response = await api.get<VariableSchemas>(
      "/communications/templates/variable_schemas/",
    );
    return response.data;
  },

  sendTest: async (
    templateId: number,
    data: { recipient: string; client_id?: number; event_id?: number },
  ): Promise<CommunicationRecord> => {
    const response = await api.post<CommunicationRecord>(
      `/communications/templates/${templateId}/send_test/`,
      data,
    );
    return response.data;
  },

  // Records
  getRecords: async (
    filters?: CommunicationFilters,
  ): Promise<CommunicationRecord[]> => {
    const params = new URLSearchParams();
    if (filters?.client_id)
      params.append("client_id", filters.client_id.toString());
    if (filters?.event_id)
      params.append("event_id", filters.event_id.toString());
    if (filters?.template_name)
      params.append("template_name", filters.template_name);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.channel) params.append("channel", filters.channel);

    const response = await api.get(
      `/communications/records/?${params.toString()}`,
    );
    const data = response.data as
      | { results?: CommunicationRecord[] }
      | CommunicationRecord[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getRecord: async (id: string): Promise<CommunicationRecord> => {
    const response = await api.get<CommunicationRecord>(
      `/communications/records/${id}/`,
    );
    return response.data;
  },

  sendManual: async (data: ManualSendData): Promise<CommunicationRecord> => {
    const response = await api.post<CommunicationRecord>(
      "/communications/records/send_manual/",
      data,
    );
    return response.data;
  },

  sendBulk: async (
    data: BulkSendData,
  ): Promise<{ sent_count: number; records: CommunicationRecord[] }> => {
    const response = await api.post<{
      sent_count: number;
      records: CommunicationRecord[];
    }>("/communications/records/send_bulk/", data);
    return response.data;
  },

  getAnalytics: async (
    templateName?: string,
    days: number = 30,
  ): Promise<AnalyticsData> => {
    const params = new URLSearchParams();
    if (templateName) params.append("template_name", templateName);
    params.append("days", days.toString());

    const response = await api.get<AnalyticsData>(
      `/communications/records/analytics/?${params.toString()}`,
    );
    return response.data;
  },

  // Mark all records as read
  markAllAsRead: async (filters?: {
    client_id?: number;
    channel?: string;
    category?: string;
  }): Promise<{ updated_count: number }> => {
    const response = await api.post<{ updated_count: number }>(
      "/communications/records/mark_all_as_read/",
      filters || {},
    );
    return response.data;
  },

  // Template history
  getTemplateHistory: async (
    templateId: number,
  ): Promise<TemplateHistoryEntry[]> => {
    const response = await api.get<TemplateHistoryEntry[]>(
      `/communications/templates/${templateId}/history/`,
    );
    return response.data;
  },

  rollbackTemplate: async (
    templateId: number,
    version: number,
  ): Promise<CommunicationTemplate> => {
    const response = await api.post<CommunicationTemplate>(
      `/communications/templates/${templateId}/rollback/`,
      { version },
    );
    return response.data;
  },

  // Duplicate template
  duplicateTemplate: async (
    templateId: number,
    newName?: string,
  ): Promise<CommunicationTemplate> => {
    const response = await api.post<CommunicationTemplate>(
      `/communications/templates/${templateId}/duplicate/`,
      { new_name: newName },
    );
    return response.data;
  },

  // Template usage statistics
  getTemplateStats: async (
    templateId: number,
    days: number = 30,
  ): Promise<TemplateStats> => {
    const params = new URLSearchParams();
    params.append("days", days.toString());
    const response = await api.get<TemplateStats>(
      `/communications/templates/${templateId}/stats/?${params.toString()}`,
    );
    return response.data;
  },
};

// Template statistics type
export interface TemplateStats {
  template_id: number;
  template_name: string;
  days: number;
  total_sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  pending: number;
  opened: number;
  delivery_rate: number;
  open_rate: number;
  failure_rate: number;
  bounce_rate: number;
  by_channel: Record<string, number>;
  by_day: Array<{ date: string; count: number }>;
}

// Template history entry type
export interface TemplateHistoryEntry {
  id: number;
  version: number;
  name: string;
  channel: string;
  category: string;
  context_type: string;
  include_client_context: boolean;
  include_event_context: boolean;
  subject_template: string | null;
  body_template: string;
  reason: "CREATE" | "UPDATE" | "ROLLBACK" | "SYSTEM";
  notes: string;
  changed_by: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  created_at: string;
}
