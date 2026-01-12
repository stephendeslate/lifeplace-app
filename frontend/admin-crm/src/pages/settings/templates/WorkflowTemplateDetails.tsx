// Workflow Template Details Page with inline Stages management
// Follows the same pattern as BookingFlowDetails

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Tabs,
  Tab,
  Alert,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  AccountTree as WorkflowIcon,
  Timeline as StagesIcon,
  Add as AddIcon,
  Edit as EditIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  History as HistoryIcon,
  SwapVert as ReorderIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '../../../contexts/LayoutContext';
import { useWorkflowTemplates, useWorkflowStages, useWorkflowTriggers } from '../../../hooks/useWorkflows';
import { useEventTypes } from '../../../hooks/useEvents';
import type {
  WorkflowTemplate,
  WorkflowStage,
  CreateWorkflowStageData,
  UpdateWorkflowStageData,
  UpdateWorkflowTemplateData,
  StageType,
} from '../../../types/workflows.types';
import {
  ModernSettingsLayout,
  ModernGlassCard,
  ModernMetricCard,
  ModernEmptyState,
  ModernPageHeader,
  ModernPageLoadingSkeleton,
  createRefreshAction,
} from '../../../components/common/ModernDesignSystem';
import { ModernDialog } from '../../../components/common';
import { SettingsFormDialog } from '../../../components/common/settings/SettingsFormDialog';
import type { ModernFormSection } from '../../../components/common/ModernForm';
import { WorkflowStageFormDialog } from '../../../components/workflows/WorkflowStageFormDialog';
import { WorkflowStagesTable } from '../../../components/workflows/WorkflowStagesTable';
import { WorkflowExecutionHistory } from '../../../components/workflows/WorkflowExecutionHistory';
import { WorkflowStageReorderDialog } from '../../../components/workflows/WorkflowStageReorderDialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`workflow-tabpanel-${index}`}
    aria-labelledby={`workflow-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

// Stage type order for organization
const STAGE_TYPE_ORDER: StageType[] = ['LEAD', 'PRODUCTION', 'POST_PRODUCTION'];

export const WorkflowTemplateDetails: React.FC = () => {
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
  const {
    useWorkflowTemplate,
    updateTemplate,
    isUpdatingTemplate,
  } = useWorkflowTemplates();

  const { data: template, isLoading: isLoadingTemplate, refetch: refetchTemplate } = useWorkflowTemplate(templateId);

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
  const {
    triggers,
    isLoadingTriggers,
    manualTrigger,
    isTriggering,
    refetchTriggers,
  } = useWorkflowTriggers({ template_id: templateId });

  // Get event types for the form
  const { eventTypes = [] } = useEventTypes();

  // Organize stages by type
  const organizedStages = STAGE_TYPE_ORDER.reduce((acc, stageType) => {
    acc[stageType] = stages
      .filter(stage => stage.stage === stageType)
      .sort((a, b) => a.order - b.order);
    return acc;
  }, {} as Record<StageType, WorkflowStage[]>);

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

      updateTemplate({ id: template.id, data: updateData }, {
        onSuccess: () => {
          setEditDialogOpen(false);
          refetchTemplate();
        },
      });
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

      updateStage({ id: editingStage.id, data: updateData }, {
        onSuccess: () => {
          setStageDialogOpen(false);
          setEditingStage(null);
          refetchStages();
          refetchTemplate();
        },
      });
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
            ...eventTypes.map(et => ({ value: et.id, label: et.name })),
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

  if (!id || isNaN(templateId)) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Invalid workflow template ID
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/settings/templates/workflow-templates')}
        >
          Back to Workflow Templates
        </Button>
      </Box>
    );
  }

  if (isLoadingTemplate) {
    return <ModernPageLoadingSkeleton />;
  }

  if (!template) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Workflow template not found. It may have been deleted or you may not have permission to view it.
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/settings/templates/workflow-templates')}
        >
          Back to Workflow Templates
        </Button>
      </Box>
    );
  }

  const getTabLabel = (label: string, count?: number) => (
    <Box display="flex" alignItems="center" gap={1}>
      {label}
      {count !== undefined && (
        <Chip label={count} size="small" color="primary" />
      )}
    </Box>
  );

  return (
    <ModernSettingsLayout maxWidth="xl">
      {/* Modern Header */}
      <ModernPageHeader
        title={template.name}
        subtitle={template.description}
        icon={<WorkflowIcon />}
        status={{
          label: template.is_active ? 'Active' : 'Inactive',
          color: template.is_active ? 'success' : 'secondary',
          variant: template.is_active ? 'filled' : 'outlined',
        }}
        stats={[
          {
            label: 'Total Stages',
            value: template.stages_count || 0,
          },
          {
            label: 'Event Type',
            value: template.event_type_name || 'Any Event Type',
          },
          {
            label: 'Last Updated',
            value: new Date(template.updated_at).toLocaleDateString(),
          },
        ]}
        primaryAction={{
          icon: <EditIcon />,
          label: 'Edit Template',
          onClick: handleEditTemplate,
          color: 'primary',
        }}
        secondaryActions={[
          createRefreshAction(() => {
            refetchTemplate();
            refetchStages();
          }),
          {
            icon: <BackIcon />,
            label: 'Back',
            variant: 'outlined',
            onClick: () => navigate('/settings/templates/workflow-templates'),
          },
        ]}
        glass
        gradient
      />

      {/* Tabs */}
      <ModernGlassCard size="medium" borderRadius="xxl" sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          <Tab icon={<WorkflowIcon />} label="Overview" iconPosition="start" />
          <Tab icon={<StagesIcon />} label={getTabLabel('Stages', stages.length)} iconPosition="start" />
          <Tab icon={<HistoryIcon />} label={getTabLabel('History', triggers.length)} iconPosition="start" />
        </Tabs>
      </ModernGlassCard>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <Stack spacing={4}>
          {/* Template Metrics */}
          <Box
            display="grid"
            gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, 1fr)' }}
            gap={3}
          >
            <ModernMetricCard
              title="Template Status"
              value={template.is_active ? 'Active' : 'Inactive'}
              description="Availability for new events"
              color={template.is_active ? 'success' : 'warning'}
              icon={template.is_active ? <ActiveIcon /> : <InactiveIcon />}
            />

            <ModernMetricCard
              title="Stages Configured"
              value={template.stages_count || 0}
              description="Total workflow stages"
              color="primary"
              icon={<StagesIcon />}
            />

            <ModernMetricCard
              title="Event Type"
              value={template.event_type_name || 'Universal'}
              description="Template applicability"
              color="primary"
              icon={<WorkflowIcon />}
            />
          </Box>

          {/* Template Information */}
          <ModernGlassCard title="Template Information" size="large" borderRadius="xxl">
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Name
                </Typography>
                <Typography variant="h6" fontWeight="600">
                  {template.name}
                </Typography>
              </Box>

              {template.description && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    {template.description}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Event Type
                </Typography>
                <Chip
                  label={template.event_type_name || 'Any Event Type'}
                  size="medium"
                  color="primary"
                  variant="outlined"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(template.created_at).toLocaleString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Last Modified
                </Typography>
                <Typography variant="body2">
                  {new Date(template.updated_at).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </ModernGlassCard>

          {/* Stage Distribution */}
          <ModernGlassCard title="Stage Distribution" size="large" borderRadius="xxl">
            <Stack spacing={2}>
              {STAGE_TYPE_ORDER.map(stageType => {
                const stageCount = organizedStages[stageType]?.length || 0;
                const stageLabel = stageType.replace('_', ' ');
                
                return (
                  <Box key={stageType} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight="500">
                      {stageLabel} Stages:
                    </Typography>
                    <Chip
                      label={stageCount}
                      size="small"
                      color={stageCount > 0 ? 'primary' : 'default'}
                      variant={stageCount > 0 ? 'filled' : 'outlined'}
                    />
                  </Box>
                );
              })}
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight="600">
                  Total Stages:
                </Typography>
                <Chip
                  label={stages.length}
                  size="small"
                  color="success"
                  variant="filled"
                />
              </Box>
            </Stack>
          </ModernGlassCard>
        </Stack>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {/* Stages Management */}
        <Box>
          {/* Header Actions */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Workflow Stages</Typography>
            <Stack direction="row" spacing={1}>
              {stages.length > 1 && (
                <Button
                  startIcon={<ReorderIcon />}
                  variant="outlined"
                  onClick={() => setReorderDialogOpen(true)}
                >
                  Reorder
                </Button>
              )}
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                color="primary"
                onClick={handleAddStage}
              >
                Add Stage
              </Button>
            </Stack>
          </Box>

          {/* Stages by Type */}
          {stages.length === 0 ? (
            <ModernEmptyState
              icon={StagesIcon}
              title="No stages configured"
              description="Add stages to define the workflow process for this template"
              primaryAction={{
                label: 'Add First Stage',
                onClick: handleAddStage,
                icon: <AddIcon />,
                color: 'primary',
              }}
              size="medium"
              color="secondary"
            />
          ) : (
            <Stack spacing={4}>
              {STAGE_TYPE_ORDER.map(stageType => {
                const stagesInType = organizedStages[stageType] || [];
                const stageLabel = stageType.replace('_', ' ');

                return (
                  <ModernGlassCard
                    key={stageType}
                    title={`${stageLabel} Stages`}
                    size="large"
                    borderRadius="xl"
                  >
                    {stagesInType.length === 0 ? (
                      <Box py={3} textAlign="center">
                        <Typography variant="body2" color="text.secondary">
                          No {stageLabel.toLowerCase()} stages configured
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={handleAddStage}
                          sx={{ mt: 2 }}
                        >
                          Add {stageLabel} Stage
                        </Button>
                      </Box>
                    ) : (
                      <WorkflowStagesTable
                        stages={stagesInType}
                        isLoading={isLoadingStages}
                        onEdit={handleEditStage}
                        onDelete={handleDeleteStage}
                        onReorder={() => setReorderDialogOpen(true)}
                        isDeleting={isDeletingStage}
                      />
                    )}
                  </ModernGlassCard>
                );
              })}
            </Stack>
          )}
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {/* Execution History */}
        <WorkflowExecutionHistory
          triggers={triggers}
          isLoading={isLoadingTriggers}
          onRefresh={refetchTriggers}
          onManualTrigger={(stageId, eventId) => {
            manualTrigger({ stageId, eventId });
          }}
          isTriggering={isTriggering}
          stages={stages}
          templateId={templateId}
        />
      </TabPanel>

      {/* Dialogs */}
      <SettingsFormDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="Edit Workflow Template"
        sections={templateFormSections}
        item={template as unknown as Record<string, unknown>}
        defaultValues={{
          id: 0,
          name: '',
          description: '',
          event_type: null,
          event_type_name: '',
          is_active: true,
          stages_count: 0,
          stages: [],
          created_at: '',
          updated_at: '',
        }}
        onSubmit={async (data: Record<string, unknown>) => {
          handleUpdateTemplate(data as unknown as WorkflowTemplate);
        }}
        maxWidth="md"
        isSubmitting={isUpdatingTemplate}
      />

      <WorkflowStageFormDialog
        open={stageDialogOpen}
        onClose={() => {
          setStageDialogOpen(false);
          setEditingStage(null);
        }}
        editingStage={editingStage}
        templateId={templateId}
        onSubmit={(data) => handleStageSubmit(data as WorkflowStage)}
        isLoading={isCreatingStage || isUpdatingStage}
      />

      <ModernDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteStageId(null);
        }}
        title="Delete Stage"
        maxWidth="sm"
        fullWidth
        actions={[
          {
            label: 'Cancel',
            onClick: () => {
              setDeleteDialogOpen(false);
              setDeleteStageId(null);
            },
            variant: 'outlined',
          },
          {
            label: isDeletingStage ? 'Deleting...' : 'Delete',
            onClick: handleDeleteStageConfirm,
            variant: 'contained',
            color: 'error',
            loading: isDeletingStage,
          },
        ]}
      >
        <Typography>
          Are you sure you want to delete this stage? This action cannot be undone.
        </Typography>
      </ModernDialog>

      <WorkflowStageReorderDialog
        open={reorderDialogOpen}
        onClose={() => setReorderDialogOpen(false)}
        templateId={templateId}
        stages={stages}
        onReorderComplete={() => {
          refetchStages();
          refetchTemplate();
        }}
      />
    </ModernSettingsLayout>
  );
};

export default WorkflowTemplateDetails;