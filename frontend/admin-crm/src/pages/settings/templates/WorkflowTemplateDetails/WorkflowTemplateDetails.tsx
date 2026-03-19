import React from 'react';
import { Box, Button, Tabs, Tab, Alert, Chip } from '@mui/material';
import {
  ArrowBack as BackIcon,
  AccountTree as WorkflowIcon,
  Timeline as StagesIcon,
  Edit as EditIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import type { WorkflowStage } from '@/types/workflows';
import {
  ModernSettingsLayout,
  ModernGlassCard,
  ModernPageHeader,
  ModernPageLoadingSkeleton,
  createRefreshAction,
} from '@/components/common/ModernDesignSystem';
import { WorkflowExecutionHistory } from '@/components/workflows/WorkflowExecutionHistory';
import { useWorkflowTemplateDetailsLogic } from './useWorkflowTemplateDetailsLogic';
import { OverviewTab } from './OverviewTab';
import { StagesTab } from './StagesTab';
import { WorkflowTemplateDialogs } from './WorkflowTemplateDialogs';

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

export const WorkflowTemplateDetails: React.FC = () => {
  const logic = useWorkflowTemplateDetailsLogic();

  const {
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
  } = logic;

  const getTabLabel = (label: string, count?: number) => (
    <Box display="flex" alignItems="center" gap={1}>
      {label}
      {count !== undefined && <Chip label={count} size="small" color="primary" />}
    </Box>
  );

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
          Workflow template not found. It may have been deleted or you may not have permission to
          view it.
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
          <Tab
            icon={<StagesIcon />}
            label={getTabLabel('Stages', stages.length)}
            iconPosition="start"
          />
          <Tab
            icon={<HistoryIcon />}
            label={getTabLabel('History', triggers.length)}
            iconPosition="start"
          />
        </Tabs>
      </ModernGlassCard>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <OverviewTab template={template} stages={stages} organizedStages={organizedStages} />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <StagesTab
          stages={stages}
          isLoadingStages={isLoadingStages}
          isDeletingStage={isDeletingStage}
          organizedStages={organizedStages}
          onAddStage={handleAddStage}
          onEditStage={handleEditStage}
          onDeleteStage={handleDeleteStage}
          onReorderOpen={() => setReorderDialogOpen(true)}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <WorkflowExecutionHistory
          triggers={triggers}
          isLoading={isLoadingTriggers}
          onRefresh={refetchTriggers}
          onManualTrigger={(stageId: number, eventId: number) => {
            manualTrigger({ stageId, eventId });
          }}
          isTriggering={isTriggering}
          stages={stages}
          templateId={templateId}
        />
      </TabPanel>

      {/* Dialogs */}
      <WorkflowTemplateDialogs
        template={template}
        templateId={templateId}
        stages={stages}
        editDialogOpen={editDialogOpen}
        stageDialogOpen={stageDialogOpen}
        deleteDialogOpen={deleteDialogOpen}
        reorderDialogOpen={reorderDialogOpen}
        editingStage={editingStage}
        isUpdatingTemplate={isUpdatingTemplate}
        isCreatingStage={isCreatingStage}
        isUpdatingStage={isUpdatingStage}
        isDeletingStage={isDeletingStage}
        templateFormSections={templateFormSections}
        onEditDialogClose={() => setEditDialogOpen(false)}
        onStageDialogClose={() => {
          setStageDialogOpen(false);
          setEditingStage(null);
        }}
        onDeleteDialogClose={() => {
          setDeleteDialogOpen(false);
          setDeleteStageId(null);
        }}
        onReorderDialogClose={() => setReorderDialogOpen(false)}
        onUpdateTemplate={handleUpdateTemplate}
        onStageSubmit={(data: WorkflowStage) => handleStageSubmit(data)}
        onDeleteStageConfirm={handleDeleteStageConfirm}
        onReorderComplete={() => {
          refetchStages();
          refetchTemplate();
        }}
      />
    </ModernSettingsLayout>
  );
};

export default WorkflowTemplateDetails;
