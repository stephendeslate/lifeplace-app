// frontend/admin-crm/src/hooks/useWorkflows.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workflowsApi } from '../apis/workflows.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  WorkflowTemplateFilters,
  WorkflowStageFilters,
  CreateWorkflowTemplateData,
  UpdateWorkflowTemplateData,
  CreateWorkflowStageData,
  UpdateWorkflowStageData,
  ReorderStagesData,
} from '../types/workflows.types';

export const useWorkflowTemplates = (filters?: WorkflowTemplateFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: templates = [],
    isLoading: isLoadingTemplates,
    error: templatesError,
    refetch: refetchTemplates
  } = useQuery({
    queryKey: ['workflow-templates', filters],
    queryFn: () => workflowsApi.getWorkflowTemplates(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const useWorkflowTemplate = (id: number) => {
    return useQuery({
      queryKey: ['workflow-template', id],
      queryFn: () => workflowsApi.getWorkflowTemplate(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  const useActiveWorkflowTemplates = () => {
    return useQuery({
      queryKey: ['workflow-templates', 'active'],
      queryFn: () => workflowsApi.getActiveWorkflowTemplates(),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: (data: CreateWorkflowTemplateData) => workflowsApi.createWorkflowTemplate(data),
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      showSuccess('Template Created', `${newTemplate.name} has been created successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create workflow template';
      showError('Create Failed', message);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWorkflowTemplateData }) =>
      workflowsApi.updateWorkflowTemplate(id, data),
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-template', updatedTemplate.id] });
      showSuccess('Template Updated', `${updatedTemplate.name} has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update workflow template';
      showError('Update Failed', message);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => workflowsApi.deleteWorkflowTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      showSuccess('Template Deleted', 'Workflow template has been deleted successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete workflow template';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    templates,
    
    // Loading states
    isLoadingTemplates,
    isCreatingTemplate: createTemplateMutation.isPending,
    isUpdatingTemplate: updateTemplateMutation.isPending,
    isDeletingTemplate: deleteTemplateMutation.isPending,
    
    // Error states
    templatesError,
    createError: createTemplateMutation.error,
    updateError: updateTemplateMutation.error,
    deleteError: deleteTemplateMutation.error,
    
    // Actions
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: updateTemplateMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    refetchTemplates,
    
    // Hooks for specific queries
    useWorkflowTemplate,
    useActiveWorkflowTemplates,
  };
};

export const useWorkflowStages = (filters?: WorkflowStageFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: stages = [],
    isLoading: isLoadingStages,
    error: stagesError,
    refetch: refetchStages
  } = useQuery({
    queryKey: ['workflow-stages', filters],
    queryFn: () => workflowsApi.getWorkflowStages(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useWorkflowStage = (id: number) => {
    return useQuery({
      queryKey: ['workflow-stage', id],
      queryFn: () => workflowsApi.getWorkflowStage(id),
      enabled: !!id,
    });
  };

  const useStagesForTemplate = (templateId: number) => {
    return useQuery({
      queryKey: ['workflow-stages', 'template', templateId],
      queryFn: () => workflowsApi.getStagesForTemplate(templateId),
      enabled: !!templateId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const createStageMutation = useMutation({
    mutationFn: (data: CreateWorkflowStageData) => workflowsApi.createWorkflowStage(data),
    onSuccess: (newStage) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-stages'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      showSuccess('Stage Created', `${newStage.name} has been created successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create workflow stage';
      showError('Create Failed', message);
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWorkflowStageData }) =>
      workflowsApi.updateWorkflowStage(id, data),
    onSuccess: (updatedStage) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-stages'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-stage', updatedStage.id] });
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      showSuccess('Stage Updated', `${updatedStage.name} has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update workflow stage';
      showError('Update Failed', message);
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: (id: number) => workflowsApi.deleteWorkflowStage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-stages'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      showSuccess('Stage Deleted', 'Workflow stage has been deleted successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete workflow stage';
      showError('Delete Failed', message);
    },
  });

  const reorderStagesMutation = useMutation({
    mutationFn: (data: ReorderStagesData) => workflowsApi.reorderWorkflowStages(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-stages'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      showSuccess('Order Updated', 'Workflow stages have been reordered successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to reorder workflow stages';
      showError('Reorder Failed', message);
    },
  });

  return {
    // Data
    stages,
    
    // Loading states
    isLoadingStages,
    isCreatingStage: createStageMutation.isPending,
    isUpdatingStage: updateStageMutation.isPending,
    isDeletingStage: deleteStageMutation.isPending,
    isReorderingStages: reorderStagesMutation.isPending,
    
    // Error states
    stagesError,
    createStageError: createStageMutation.error,
    updateStageError: updateStageMutation.error,
    deleteStageError: deleteStageMutation.error,
    reorderStagesError: reorderStagesMutation.error,
    
    // Actions
    createStage: createStageMutation.mutate,
    updateStage: updateStageMutation.mutate,
    deleteStage: deleteStageMutation.mutate,
    reorderStages: reorderStagesMutation.mutate,
    refetchStages,
    
    // Hooks for specific queries
    useWorkflowStage,
    useStagesForTemplate,
  };
};