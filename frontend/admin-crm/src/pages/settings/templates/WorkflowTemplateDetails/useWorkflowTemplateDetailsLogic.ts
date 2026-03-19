import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '@/contexts/LayoutContext';
import { useWorkflowTemplates, useWorkflowStages, useWorkflowTriggers } from '@/hooks/useWorkflows';
import { useEventTypes } from '@/hooks/useEvents';
import type {
  WorkflowTemplate,
  WorkflowStage,
  CreateWorkflowStageData,
  UpdateWorkflowStageData,
  UpdateWorkflowTemplateData,
  StageType,
} from '@/types/workflows';
import type { ModernFormSection } from '@/components/common/ModernForm';

// Stage type order for organization
export const STAGE_TYPE_ORDER: StageType[] = ['LEAD', 'PRODUCTION', 'POST_PRODUCTION'];

export function useWorkflowTemplateDetailsLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [activeTab, setActiveTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [deleteStageId, setDeleteStageId] = useState<number | null>(null);

  const templateId = parseInt(id || '0');

  // Hooks for workflow template
  const { useWorkflowTemplate, updateTemplate, isUpdatingTemplate } = useWorkflowTemplates();

  const {
    data: template,
    isLoading: isLoadingTemplate,
    refetch: refetchTemplate,
  } = useWorkflowTemplate(templateId);

  // Hooks for workflow stages
  const {
    useStagesForTemplate,
    createStage,
    updateStage,
    deleteStage,
    isCreatingStage,
    isUpdatingStage,
    isDeletingStage,
    refetchStages,
  } = useWorkflowStages();

  const { data: stages = [], isLoading: isLoadingStages } = useStagesForTemplate(templateId);

  // Hooks for workflow triggers (execution history)
  const { triggers, isLoadingTriggers, manualTrigger, isTriggering, refetchTriggers } =
    useWorkflowTriggers({ template_id: templateId });

  // Get event types for the form
  const { eventTypes = [] } = useEventTypes();

  // Organize stages by type
  const organizedStages = STAGE_TYPE_ORDER.reduce(
    (acc, stageType) => {
      acc[stageType] = stages
        .filter((stage) => stage.stage === stageType)
        .sort((a, b) => a.order - b.order);
      return acc;
    },
    {} as Record<StageType, WorkflowStage[]>,
  );

  useEffect(() => {
    if (template) {
      setBreadcrumbs([
        { label: 'Settings', path: '/settings' },
        { label: 'Templates' },
        { label: 'Workflow Templates', path: '/settings/templates/workflow-templates' },
        { label: template.name },
      ]);
    }
  }, [template, setBreadcrumbs]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEditTemplate = () => {
    setEditDialogOpen(true);
  };

  const handleUpdateTemplate = (data: WorkflowTemplate) => {
    if (template) {
      const updateData: UpdateWorkflowTemplateData = {
        name: data.name,
        description: data.description,
        event_type: data.event_type,
        is_active: data.is_active,
      };

      updateTemplate(
        { id: template.id, data: updateData },
        {
          onSuccess: () => {
            setEditDialogOpen(false);
            refetchTemplate();
          },
        },
      );
    }
  };

  const handleAddStage = () => {
    setEditingStage(null);
    setStageDialogOpen(true);
  };

  const handleEditStage = (stage: WorkflowStage) => {
    setEditingStage(stage);
    setStageDialogOpen(true);
  };

  const handleDeleteStage = (stageId: number) => {
    setDeleteStageId(stageId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteStageConfirm = () => {
    if (deleteStageId) {
      deleteStage(deleteStageId, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setDeleteStageId(null);
          refetchStages();
          refetchTemplate();
        },
      });
    }
  };

  const handleStageSubmit = (data: WorkflowStage) => {
    if (editingStage) {
      const updateData: UpdateWorkflowStageData = {
        name: data.name,
        stage: data.stage,
        order: data.order,
        is_automated: data.is_automated,
        automation_type: data.automation_type,
        trigger_time: data.trigger_time,
        email_template: data.email_template,
        contract_template: data.contract_template,
        task_description: data.task_description,
        progression_condition: data.progression_condition,
        required_tasks_completed: data.required_tasks_completed,
        // Trigger-on flags
        trigger_on_payment_received: data.trigger_on_payment_received,
        trigger_on_quote_accepted: data.trigger_on_quote_accepted,
        trigger_on_contract_signed: data.trigger_on_contract_signed,
        trigger_on_event_created: data.trigger_on_event_created,
        trigger_on_quote_sent: data.trigger_on_quote_sent,
        metadata: data.metadata,
      };

      updateStage(
        { id: editingStage.id, data: updateData },
        {
          onSuccess: () => {
            setStageDialogOpen(false);
            setEditingStage(null);
            refetchStages();
            refetchTemplate();
          },
        },
      );
    } else {
      const createData: CreateWorkflowStageData = {
        template: templateId,
        name: data.name,
        stage: data.stage,
        order: data.order,
        is_automated: data.is_automated,
        automation_type: data.automation_type,
        trigger_time: data.trigger_time,
        email_template: data.email_template,
        contract_template: data.contract_template,
        task_description: data.task_description,
        progression_condition: data.progression_condition,
        required_tasks_completed: data.required_tasks_completed,
        // Trigger-on flags
        trigger_on_payment_received: data.trigger_on_payment_received,
        trigger_on_quote_accepted: data.trigger_on_quote_accepted,
        trigger_on_contract_signed: data.trigger_on_contract_signed,
        trigger_on_event_created: data.trigger_on_event_created,
        trigger_on_quote_sent: data.trigger_on_quote_sent,
        metadata: data.metadata,
      };

      createStage(createData, {
        onSuccess: () => {
          setStageDialogOpen(false);
          refetchStages();
          refetchTemplate();
        },
      });
    }
  };

  // Form sections for editing template
  const templateFormSections: ModernFormSection[] = [
    {
      title: 'Basic Information',
      fields: [
        {
          name: 'name',
          label: 'Workflow Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., Wedding Photography Workflow',
          helperText: 'A descriptive name for this workflow template',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          multiline: true,
          rows: 3,
          placeholder: 'Describe the purpose and scope of this workflow...',
          helperText: 'Optional description for internal reference',
        },
        {
          name: 'event_type',
          label: 'Event Type',
          type: 'select',
          helperText: 'Leave empty to use for any event type',
          options: [
            { value: '', label: 'Any Event Type' },
            ...eventTypes.map((et) => ({ value: et.id, label: et.name })),
          ],
        },
      ],
    },
    {
      title: 'Settings',
      fields: [
        {
          name: 'is_active',
          label: 'Active',
          type: 'switch',
          helperText: 'Active workflows are available for selection when creating events',
        },
      ],
    },
  ];

  return {
    id,
    templateId,
    navigate,
    activeTab,
    editDialogOpen,
    stageDialogOpen,
    deleteDialogOpen,
    reorderDialogOpen,
    editingStage,
    template,
    isLoadingTemplate,
    stages,
    isLoadingStages,
    triggers,
    isLoadingTriggers,
    isTriggering,
    isUpdatingTemplate,
    isCreatingStage,
    isUpdatingStage,
    isDeletingStage,
    organizedStages,
    templateFormSections,
    handleTabChange,
    handleEditTemplate,
    handleUpdateTemplate,
    handleAddStage,
    handleEditStage,
    handleDeleteStage,
    handleDeleteStageConfirm,
    handleStageSubmit,
    manualTrigger,
    refetchTemplate,
    refetchStages,
    refetchTriggers,
    setEditDialogOpen,
    setStageDialogOpen,
    setDeleteDialogOpen,
    setReorderDialogOpen,
    setEditingStage,
    setDeleteStageId,
  };
}
