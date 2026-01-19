// frontend/admin-crm/src/apis/workflows.api.ts

import api from '../utils/api';
import type {
  WorkflowTemplate,
  WorkflowStage,
  WorkflowTrigger,
  EventWorkflowOverride,
  CreateWorkflowTemplateData,
  UpdateWorkflowTemplateData,
  CreateWorkflowStageData,
  UpdateWorkflowStageData,
  CreateEventWorkflowOverrideData,
  UpdateEventWorkflowOverrideData,
  WorkflowTemplateFilters,
  WorkflowStageFilters,
  WorkflowTriggerFilters,
  EventWorkflowOverrideFilters,
  ReorderStagesData,
  ManualTriggerResponse,
  WorkflowWebhook,
  WorkflowWebhookDelivery,
  CreateWorkflowWebhookData,
  UpdateWorkflowWebhookData,
  WorkflowWebhookFilters,
  WebhookDeliveryFilters,
  WebhookEventType,
} from '../types/workflows.types';
import type { PaginatedResponse } from '../types/common.types';

export const workflowsApi = {
  // Workflow Templates
  getWorkflowTemplates: async (filters?: WorkflowTemplateFilters): Promise<WorkflowTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.event_type !== undefined) params.append('event_type', filters.event_type.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const response = await api.get(`/workflows/templates/?${params.toString()}`);
    const data = response.data as PaginatedResponse<WorkflowTemplate> | WorkflowTemplate[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getWorkflowTemplate: async (id: number): Promise<WorkflowTemplate> => {
    const response = await api.get<WorkflowTemplate>(`/workflows/templates/${id}/`);
    return response.data;
  },

  createWorkflowTemplate: async (data: CreateWorkflowTemplateData): Promise<WorkflowTemplate> => {
    const response = await api.post<WorkflowTemplate>('/workflows/templates/', data);
    return response.data;
  },

  updateWorkflowTemplate: async (id: number, data: UpdateWorkflowTemplateData): Promise<WorkflowTemplate> => {
    const response = await api.patch<WorkflowTemplate>(`/workflows/templates/${id}/`, data);
    return response.data;
  },

  deleteWorkflowTemplate: async (id: number): Promise<void> => {
    await api.delete(`/workflows/templates/${id}/`);
  },

  duplicateWorkflowTemplate: async (id: number, newName?: string): Promise<WorkflowTemplate> => {
    const response = await api.post<WorkflowTemplate>(
      `/workflows/templates/${id}/duplicate/`,
      newName ? { name: newName } : {}
    );
    return response.data;
  },

  getActiveWorkflowTemplates: async (): Promise<WorkflowTemplate[]> => {
    const response = await api.get('/workflows/templates/active/');
    const data = response.data as PaginatedResponse<WorkflowTemplate> | WorkflowTemplate[];
    return Array.isArray(data) ? data : data.results || [];
  },

  // Workflow Stages
  getWorkflowStages: async (filters?: WorkflowStageFilters): Promise<WorkflowStage[]> => {
    const params = new URLSearchParams();
    if (filters?.template_id) params.append('template_id', filters.template_id.toString());
    if (filters?.stage_type) params.append('stage', filters.stage_type);
    
    const response = await api.get(`/workflows/stages/?${params.toString()}`);
    const data = response.data as PaginatedResponse<WorkflowStage> | WorkflowStage[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getWorkflowStage: async (id: number): Promise<WorkflowStage> => {
    const response = await api.get<WorkflowStage>(`/workflows/stages/${id}/`);
    return response.data;
  },

  createWorkflowStage: async (data: CreateWorkflowStageData): Promise<WorkflowStage> => {
    const response = await api.post<WorkflowStage>('/workflows/stages/', data);
    return response.data;
  },

  updateWorkflowStage: async (id: number, data: UpdateWorkflowStageData): Promise<WorkflowStage> => {
    const response = await api.patch<WorkflowStage>(`/workflows/stages/${id}/`, data);
    return response.data;
  },

  deleteWorkflowStage: async (id: number): Promise<void> => {
    await api.delete(`/workflows/stages/${id}/`);
  },

  reorderWorkflowStages: async (data: ReorderStagesData): Promise<WorkflowStage[]> => {
    const response = await api.post<WorkflowStage[]>('/workflows/stages/reorder/', data);
    return response.data;
  },

  // Template-specific stages
  getStagesForTemplate: async (templateId: number): Promise<WorkflowStage[]> => {
    const response = await api.get<WorkflowStage[]>(`/workflows/templates/${templateId}/stages/`);
    return response.data;
  },

  // Workflow Triggers
  getWorkflowTriggers: async (filters?: WorkflowTriggerFilters): Promise<WorkflowTrigger[]> => {
    const params = new URLSearchParams();
    if (filters?.event_id) params.append('event_id', filters.event_id.toString());
    if (filters?.template_id) params.append('template_id', filters.template_id.toString());
    if (filters?.trigger_type) params.append('trigger_type', filters.trigger_type);
    if (filters?.processed !== undefined) params.append('processed', filters.processed.toString());

    const response = await api.get(`/workflows/triggers/?${params.toString()}`);
    const data = response.data as PaginatedResponse<WorkflowTrigger> | WorkflowTrigger[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getWorkflowTrigger: async (id: number): Promise<WorkflowTrigger> => {
    const response = await api.get<WorkflowTrigger>(`/workflows/triggers/${id}/`);
    return response.data;
  },

  manuallyTriggerStage: async (stageId: number, eventId: number): Promise<ManualTriggerResponse> => {
    const response = await api.post<ManualTriggerResponse>(
      `/workflows/stages/${stageId}/trigger/`,
      { event_id: eventId }
    );
    return response.data;
  },

  // Event Workflow Overrides (per-event workflow customization)
  getWorkflowOverrides: async (filters?: EventWorkflowOverrideFilters): Promise<EventWorkflowOverride[]> => {
    const params = new URLSearchParams();
    if (filters?.event_id) params.append('event_id', filters.event_id.toString());
    if (filters?.stage_id) params.append('stage_id', filters.stage_id.toString());
    if (filters?.override_type) params.append('override_type', filters.override_type);
    if (filters?.executed !== undefined) params.append('executed', filters.executed.toString());

    const response = await api.get(`/workflows/overrides/?${params.toString()}`);
    const data = response.data as PaginatedResponse<EventWorkflowOverride> | EventWorkflowOverride[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getWorkflowOverride: async (id: number): Promise<EventWorkflowOverride> => {
    const response = await api.get<EventWorkflowOverride>(`/workflows/overrides/${id}/`);
    return response.data;
  },

  getOverridesForEvent: async (eventId: number): Promise<EventWorkflowOverride[]> => {
    const response = await api.get<EventWorkflowOverride[]>(
      `/workflows/overrides/for_event/?event_id=${eventId}`
    );
    return response.data;
  },

  createWorkflowOverride: async (data: CreateEventWorkflowOverrideData): Promise<EventWorkflowOverride> => {
    const response = await api.post<EventWorkflowOverride>('/workflows/overrides/', data);
    return response.data;
  },

  updateWorkflowOverride: async (id: number, data: UpdateEventWorkflowOverrideData): Promise<EventWorkflowOverride> => {
    const response = await api.patch<EventWorkflowOverride>(`/workflows/overrides/${id}/`, data);
    return response.data;
  },

  deleteWorkflowOverride: async (id: number): Promise<void> => {
    await api.delete(`/workflows/overrides/${id}/`);
  },

  // Quick actions for common override operations
  skipStageForEvent: async (eventId: number, stageId: number, reason?: string): Promise<EventWorkflowOverride> => {
    const response = await api.post<EventWorkflowOverride>(
      '/workflows/overrides/skip_stage/',
      { event_id: eventId, stage_id: stageId, reason: reason || '' }
    );
    return response.data;
  },

  disableAutomationForEvent: async (eventId: number, stageId: number, reason?: string): Promise<EventWorkflowOverride> => {
    const response = await api.post<EventWorkflowOverride>(
      '/workflows/overrides/disable_automation/',
      { event_id: eventId, stage_id: stageId, reason: reason || '' }
    );
    return response.data;
  },

  // Workflow Webhooks
  getWorkflowWebhooks: async (filters?: WorkflowWebhookFilters): Promise<WorkflowWebhook[]> => {
    const params = new URLSearchParams();
    if (filters?.workflow_template_id) {
      params.append('workflow_template_id', filters.workflow_template_id.toString());
    }
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }

    const response = await api.get(`/workflows/webhooks/?${params.toString()}`);
    const data = response.data as PaginatedResponse<WorkflowWebhook> | WorkflowWebhook[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getWorkflowWebhook: async (id: number): Promise<WorkflowWebhook> => {
    const response = await api.get<WorkflowWebhook>(`/workflows/webhooks/${id}/`);
    return response.data;
  },

  createWorkflowWebhook: async (data: CreateWorkflowWebhookData): Promise<WorkflowWebhook> => {
    const response = await api.post<WorkflowWebhook>('/workflows/webhooks/', data);
    return response.data;
  },

  updateWorkflowWebhook: async (id: number, data: UpdateWorkflowWebhookData): Promise<WorkflowWebhook> => {
    const response = await api.patch<WorkflowWebhook>(`/workflows/webhooks/${id}/`, data);
    return response.data;
  },

  deleteWorkflowWebhook: async (id: number): Promise<void> => {
    await api.delete(`/workflows/webhooks/${id}/`);
  },

  testWorkflowWebhook: async (id: number): Promise<WorkflowWebhookDelivery> => {
    const response = await api.post<{ message: string; delivery: WorkflowWebhookDelivery }>(
      `/workflows/webhooks/${id}/test/`
    );
    return response.data.delivery;
  },

  getWebhookDeliveries: async (webhookId: number, filters?: WebhookDeliveryFilters): Promise<WorkflowWebhookDelivery[]> => {
    const params = new URLSearchParams();
    if (filters?.status) {
      params.append('status', filters.status);
    }
    if (filters?.event_type) {
      params.append('event_type', filters.event_type);
    }

    const response = await api.get<WorkflowWebhookDelivery[]>(
      `/workflows/webhooks/${webhookId}/deliveries/?${params.toString()}`
    );
    return response.data;
  },

  getWebhookEventTypes: async (): Promise<{ value: WebhookEventType; label: string }[]> => {
    const response = await api.get<{ value: WebhookEventType; label: string }[]>(
      '/workflows/webhooks/event_types/'
    );
    return response.data;
  },
};