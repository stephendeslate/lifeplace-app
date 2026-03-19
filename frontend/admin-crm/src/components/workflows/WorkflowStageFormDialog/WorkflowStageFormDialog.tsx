import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import type { WorkflowStageFormDialogProps } from '@/types/workflows';
import { useWorkflowStageFormLogic } from './useWorkflowStageFormLogic';
import { StageInfoSection } from './StageInfoSection';
import { AutomationSection } from './AutomationSection';
import { BusinessEventTriggersSection } from './BusinessEventTriggersSection';
import { ProgressionSection } from './ProgressionSection';

export const WorkflowStageFormDialog: React.FC<WorkflowStageFormDialogProps> = ({
  open,
  onClose,
  editingStage,
  templateId,
  onSubmit,
  isLoading,
}) => {
  const {
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
  } = useWorkflowStageFormLogic({ open, editingStage, templateId, onSubmit });

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' },
      }}
    >
      {open && (
        <>
          <DialogTitle>
            {isEditing ? 'Edit Workflow Stage' : 'Create New Workflow Stage'}
          </DialogTitle>

          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Stack spacing={3}>
                <StageInfoSection
                  formData={formData}
                  errors={errors}
                  isEditing={isEditing}
                  onInputChange={handleInputChange}
                />

                <AutomationSection
                  formData={formData}
                  errors={errors}
                  requiresEmailTemplate={requiresEmailTemplate}
                  requiresContractTemplate={requiresContractTemplate}
                  requiresQuestionnaireTemplate={requiresQuestionnaireTemplate}
                  emailTemplates={emailTemplates}
                  contractTemplates={contractTemplates}
                  quoteTemplates={quoteTemplates}
                  questionnaires={questionnaires}
                  onInputChange={handleInputChange}
                  onMetadataChange={handleMetadataChange}
                />

                {formData.is_automated && (
                  <BusinessEventTriggersSection
                    formData={formData}
                    onInputChange={handleInputChange}
                  />
                )}

                <ProgressionSection formData={formData} onInputChange={handleInputChange} />
              </Stack>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
            >
              {isLoading ? 'Saving...' : isEditing ? 'Update Stage' : 'Create Stage'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
