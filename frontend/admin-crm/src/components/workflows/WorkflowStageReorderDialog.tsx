// frontend/admin-crm/src/components/workflows/WorkflowStageReorderDialog.tsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Task as TaskIcon,
  RequestQuote as QuoteIcon,
  Description as ContractIcon,
  Notifications as NotificationIcon,
  Handyman as ManualIcon,
} from '@mui/icons-material';
import { DraggableList } from '../common/DraggableList';
import { useWorkflowStages } from '../../hooks/useWorkflows';
import type { WorkflowStage, StageType } from '../../types/workflows.types';

interface WorkflowStageReorderDialogProps {
  open: boolean;
  onClose: () => void;
  templateId: number;
  stages: WorkflowStage[];
  onReorderComplete?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
  </div>
);

export const WorkflowStageReorderDialog: React.FC<WorkflowStageReorderDialogProps> = ({
  open,
  onClose,
  templateId,
  stages,
  onReorderComplete,
}) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const { reorderStages, isReorderingStages } = useWorkflowStages();

  const stageTypes: StageType[] = ['LEAD', 'PRODUCTION', 'POST_PRODUCTION'];
  const stageLabels = {
    LEAD: 'Lead',
    PRODUCTION: 'Production',
    POST_PRODUCTION: 'Post Production',
  };

  const getStagesByType = (type: StageType) => 
    stages.filter(stage => stage.stage === type).sort((a, b) => a.order - b.order);

  const handleReorder = async (reorderedStages: WorkflowStage[], stageType: StageType) => {
    const orderMapping: Record<string, number> = {};
    
    reorderedStages.forEach((stage, index) => {
      orderMapping[stage.id.toString()] = index + 1;
    });

    const reorderData = {
      template_id: templateId,
      stage_type: stageType,
      order_mapping: orderMapping,
    };

    return new Promise<void>((resolve, reject) => {
      reorderStages(reorderData, {
        onSuccess: () => {
          onReorderComplete?.();
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  const getAutomationIcon = (automationType: string) => {
    const icons = {
      EMAIL: <EmailIcon fontSize="small" />,
      TASK: <TaskIcon fontSize="small" />,
      QUOTE: <QuoteIcon fontSize="small" />,
      CONTRACT: <ContractIcon fontSize="small" />,
      REMINDER: <ScheduleIcon fontSize="small" />,
      NOTIFICATION: <NotificationIcon fontSize="small" />,
    };
    return icons[automationType as keyof typeof icons] || <ManualIcon fontSize="small" />;
  };

  const renderStageItem = (stage: WorkflowStage) => (
    <Box display="flex" alignItems="center" gap={2}>
      {/* Automation Icon */}
      {stage.is_automated && getAutomationIcon(stage.automation_type)}
      
      {/* Stage Info */}
      <Box sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Typography variant="subtitle2" fontWeight="medium">
            {stage.name}
          </Typography>
          {stage.is_automated ? (
            <Chip label="Automated" size="small" color="primary" />
          ) : (
            <Chip label="Manual" size="small" variant="outlined" />
          )}
        </Box>
        
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">
            {stage.stage_display}
          </Typography>
          
          {stage.trigger_time && (
            <Typography variant="caption" color="text.secondary">
              • Trigger: {stage.trigger_time}
            </Typography>
          )}
          
          {stage.email_template_name && (
            <Typography variant="caption" color="text.secondary">
              • Email: {stage.email_template_name}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );

  const hasStagesInType = (type: StageType) => getStagesByType(type).length > 0;
  const availableTabs = stageTypes.filter(hasStagesInType);

  // Reset to first available tab when dialog opens or stages change
  // Don't include activeTab in deps - we only want to reset on open/stage changes
  React.useEffect(() => {
    if (open && availableTabs.length > 0) {
      setActiveTab(0);
    }
  }, [open, stages.length]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isReorderingStages}
    >
      <DialogTitle>Reorder Workflow Stages</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Drag and drop stages within each category to change their execution order.
        </Typography>
        
        {availableTabs.length > 1 && (
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} sx={{ mb: 2 }}>
            {availableTabs.map((type) => (
              <Tab 
                key={type} 
                label={`${stageLabels[type]} (${getStagesByType(type).length})`}
              />
            ))}
          </Tabs>
        )}

        {availableTabs.map((type, index) => {
          const stagesForType = getStagesByType(type);
          
          return (
            <TabPanel key={type} value={activeTab} index={index}>
              {stagesForType.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    No {stageLabels[type].toLowerCase()} stages to reorder.
                  </Typography>
                </Box>
              ) : (
                <DraggableList<WorkflowStage>
                  items={stagesForType}
                  onReorder={(items) => handleReorder(items, type)}
                  renderItem={renderStageItem}
                  keyExtractor={(stage) => stage.id.toString()}
                  showSaveButton={true}
                  enableKeyboardReorder={true}
                  emptyMessage={`No ${stageLabels[type].toLowerCase()} stages to reorder.`}
                />
              )}
            </TabPanel>
          );
        })}

        {availableTabs.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No stages to reorder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add stages to this workflow template first.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={isReorderingStages}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};