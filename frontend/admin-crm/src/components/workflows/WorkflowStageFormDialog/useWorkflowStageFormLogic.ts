import { useState, useEffect } from 'react';
import { useCommunications } from '@/hooks/useCommunications';
import { useContractTemplates } from '@/hooks/useContracts';
import { useQuoteTemplates } from '@/hooks/useSales';
import { useQuestionnaires } from '@/hooks/useQuestionnaires';
import { useConfirmDialog } from '@/components/common/ConfirmDialog';
import type {
  WorkflowStage,
  CreateWorkflowStageData,
  UpdateWorkflowStageData,
  StageType,
} from '@/types/workflows';

const defaultFormData: CreateWorkflowStageData = {
  name: '',
  stage: 'LEAD',
  order: 1,
  is_automated: false,
  automation_type: 'TASK',
  trigger_time: 'ON_CREATION',
  trigger_after_stage: null,
  email_template: null,
  contract_template: null,
  questionnaire_template: null,
  task_description: '',
  progression_condition: '',
  required_tasks_completed: false,
  trigger_on_payment_received: false,
  trigger_on_quote_accepted: false,
  trigger_on_contract_signed: false,
  trigger_on_event_created: false,
  trigger_on_quote_sent: false,
  metadata: {},
};

interface UseWorkflowStageFormLogicParams {
  open: boolean;
  editingStage?: WorkflowStage | null;
  templateId?: number;
  onSubmit: (data: CreateWorkflowStageData | UpdateWorkflowStageData) => void;
}

export function useWorkflowStageFormLogic({
  open,
  editingStage,
  templateId,
  onSubmit,
}: UseWorkflowStageFormLogicParams) {
  const [formData, setFormData] = useState<CreateWorkflowStageData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [originalStageType, setOriginalStageType] = useState<StageType | null>(null);

  const { confirm } = useConfirmDialog();
  const { useTemplates } = useCommunications();
  const { data: emailTemplates = [] } = useTemplates({ channel: 'EMAIL' });
  const { data: contractTemplates = [] } = useContractTemplates();
  const { data: quoteTemplates = [] } = useQuoteTemplates();
  const { useActiveQuestionnaires } = useQuestionnaires();
  const { data: questionnaires = [] } = useActiveQuestionnaires();

  const isEditing = !!editingStage;

  useEffect(() => {
    if (open) {
      if (editingStage) {
        setFormData({
          name: editingStage.name,
          stage: editingStage.stage,
          order: editingStage.order,
          is_automated: editingStage.is_automated,
          automation_type: editingStage.automation_type,
          trigger_time: editingStage.trigger_time,
          trigger_after_stage: editingStage.trigger_after_stage || null,
          email_template: editingStage.email_template,
          contract_template: editingStage.contract_template,
          questionnaire_template: editingStage.questionnaire_template,
          task_description: editingStage.task_description || '',
          progression_condition: editingStage.progression_condition || '',
          required_tasks_completed: editingStage.required_tasks_completed,
          trigger_on_payment_received: editingStage.trigger_on_payment_received || false,
          trigger_on_quote_accepted: editingStage.trigger_on_quote_accepted || false,
          trigger_on_contract_signed: editingStage.trigger_on_contract_signed || false,
          trigger_on_event_created: editingStage.trigger_on_event_created || false,
          trigger_on_quote_sent: editingStage.trigger_on_quote_sent || false,
          metadata: editingStage.metadata || {},
        });
        setOriginalStageType(editingStage.stage);
      } else {
        setFormData({
          ...defaultFormData,
          template: templateId,
        });
        setOriginalStageType(null);
      }
      setErrors({});
    }
  }, [editingStage, templateId, open]);

  const handleMetadataChange = (key: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value,
      },
    }));
  };

  const handleInputChange = (
    field: keyof CreateWorkflowStageData,
    value: string | boolean | number | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Stage name is required';
    }

    if (formData.is_automated && formData.automation_type === 'EMAIL' && !formData.email_template) {
      newErrors.email_template = 'Email template is required for email automation';
    }

    if (
      formData.is_automated &&
      formData.automation_type === 'CONTRACT' &&
      !formData.contract_template
    ) {
      newErrors.contract_template = 'Contract template is required for contract automation';
    }

    if (
      formData.is_automated &&
      formData.automation_type === 'QUESTIONNAIRE' &&
      !formData.questionnaire_template
    ) {
      newErrors.questionnaire_template =
        'Questionnaire template is required for questionnaire automation';
    }

    if (formData.order && formData.order < 1) {
      newErrors.order = 'Order must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const submitData: CreateWorkflowStageData | UpdateWorkflowStageData = {
      ...formData,
      template: templateId,
    };

    if (!isEditing) {
      delete (submitData as CreateWorkflowStageData).order;
    }

    if (isEditing && originalStageType && formData.stage !== originalStageType) {
      const stageTypeLabels: Record<StageType, string> = {
        LEAD: 'Lead',
        PRODUCTION: 'Production',
        POST_PRODUCTION: 'Post-Production',
      };

      const confirmed = await confirm({
        title: 'Confirm Stage Type Change',
        message: `Changing the stage type from "${stageTypeLabels[originalStageType]}" to "${stageTypeLabels[formData.stage]}" will cause automatic reordering of stages within the workflow. This may affect the execution order for events using this template. Are you sure you want to proceed?`,
        type: 'warning',
        confirmText: 'Change Stage Type',
        cancelText: 'Keep Original',
        confirmColor: 'warning',
      });

      if (!confirmed) {
        return;
      }
    }

    onSubmit(submitData);
  };

  const requiresEmailTemplate = formData.is_automated && formData.automation_type === 'EMAIL';
  const requiresContractTemplate = formData.is_automated && formData.automation_type === 'CONTRACT';
  const requiresQuestionnaireTemplate =
    formData.is_automated && formData.automation_type === 'QUESTIONNAIRE';

  return {
    formData,
    errors,
    isEditing,
    emailTemplates,
    contractTemplates,
    quoteTemplates,
    questionnaires,
    requiresEmailTemplate,
    requiresContractTemplate,
    requiresQuestionnaireTemplate,
    handleInputChange,
    handleMetadataChange,
    handleSubmit,
  };
}
