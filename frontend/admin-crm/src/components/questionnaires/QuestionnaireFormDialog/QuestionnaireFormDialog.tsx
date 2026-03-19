import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import type { QuestionnaireFormDialogProps } from '@/types/questionnaires.types';
import { useQuestionnaireFormDialogLogic } from './useQuestionnaireFormDialogLogic';
import { BasicInfoTab } from './BasicInfoTab';
import { FieldsTab } from './FieldsTab';

export const QuestionnaireFormDialog: React.FC<QuestionnaireFormDialogProps> = (props) => {
  const { open, editingQuestionnaire, isLoading } = props;
  const logic = useQuestionnaireFormDialogLogic(props);

  return (
    <Dialog
      open={open}
      onClose={logic.handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          borderRadius: 1,
        },
      }}
    >
      {open && (
        <>
          <DialogTitle
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              fontSize: '1.5rem',
              textAlign: 'center',
              pb: 1,
            }}
          >
            {editingQuestionnaire ? 'Edit Questionnaire' : 'Create New Questionnaire'}
          </DialogTitle>

          <DialogContent>
            <Box sx={{ mt: 1 }}>
              {/* Tab Navigation */}
              <Box
                display="flex"
                gap={2}
                mb={4}
                sx={{
                  borderRadius: 1,
                  p: 1,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Button
                  variant={logic.activeTab === 'basic' ? 'contained' : 'text'}
                  onClick={() => logic.setActiveTab('basic')}
                  size="small"
                  sx={{ flex: 1, borderRadius: 1, fontWeight: 600 }}
                >
                  Basic Information
                </Button>
                <Button
                  variant={logic.activeTab === 'fields' ? 'contained' : 'text'}
                  onClick={() => logic.setActiveTab('fields')}
                  size="small"
                  sx={{ flex: 1, borderRadius: 1, fontWeight: 600 }}
                >
                  Fields ({logic.formData.fields.length})
                </Button>
              </Box>

              {logic.activeTab === 'basic' && (
                <BasicInfoTab
                  formData={logic.formData}
                  errors={logic.errors}
                  eventTypes={logic.eventTypes}
                  isLoadingEventTypes={logic.isLoadingEventTypes}
                  eventTypesError={logic.eventTypesError}
                  onInputChange={logic.handleInputChange}
                  onSwitchChange={logic.handleSwitchChange}
                />
              )}

              {logic.activeTab === 'fields' && (
                <FieldsTab
                  fields={logic.formData.fields}
                  errors={logic.errors}
                  onAddField={logic.handleAddField}
                  onFieldChange={logic.handleFieldChange}
                  onRemoveField={logic.handleRemoveField}
                  onOptionChange={logic.handleOptionChange}
                  onAddOption={logic.handleAddOption}
                  onRemoveOption={logic.handleRemoveOption}
                  onFieldReorder={logic.handleFieldReorder}
                  requiresOptions={logic.requiresOptions}
                />
              )}
            </Box>
          </DialogContent>

          <DialogActions
            sx={{
              p: 3,
              borderTop: 1,
              borderColor: 'divider',
              gap: 2,
            }}
          >
            <Button
              onClick={logic.handleClose}
              disabled={isLoading}
              variant="outlined"
              sx={{ borderRadius: 1, px: 3, py: 1, fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={logic.handleSubmit}
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
              sx={{ borderRadius: 1, px: 4, py: 1, fontWeight: 600 }}
            >
              {isLoading ? 'Saving...' : editingQuestionnaire ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
