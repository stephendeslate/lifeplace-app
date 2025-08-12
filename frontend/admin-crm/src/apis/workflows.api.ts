// frontend/admin-crm/src/apis/workflows.api.ts

import api from '../utils/api';
import type {
  WorkflowTemplate,
  WorkflowStage,
  CreateWorkflowTemplateData,
  UpdateWorkflowTemplateData,
  CreateWorkflowStageData,
  UpdateWorkflowStageData,
  WorkflowTemplateFilters,
  WorkflowStageFilters,
  ReorderStagesData,
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
};