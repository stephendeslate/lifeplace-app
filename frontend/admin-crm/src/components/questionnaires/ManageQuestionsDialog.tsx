// frontend/admin-crm/src/components/questionnaires/ManageQuestionsDialog.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon, Quiz as QuestionnaireIcon } from '@mui/icons-material';
import { QuestionnaireFieldsTable } from './QuestionnaireFieldsTable';
import { FieldFormDialog } from './FieldFormDialog';
import { useQuestionnaireFields } from '../../hooks/useQuestionnaires';
import type {
  QuestionnaireField,
  CreateQuestionnaireFieldData,
  UpdateQuestionnaireFieldData,
} from '../../types/questionnaires.types';

export interface ManageQuestionsDialogProps {
  open: boolean;
  onClose: () => void;
  questionnaire: {
    id: number;
    name: string;
  } | null;
}

export const ManageQuestionsDialog: React.FC<ManageQuestionsDialogProps> = ({
  open,
  onClose,
  questionnaire,
}) => {
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<QuestionnaireField | null>(null);

  const {
    useQuestionnaireFields: useFields,
    createField,
    updateField,
    deleteField,
    isCreatingField,
    isUpdatingField,
    isDeletingField,
  } = useQuestionnaireFields();

  const { data: fields = [], isLoading: isLoadingFields } = useFields(questionnaire?.id || 0);

  const handleAddField = () => {
    setEditingField(null);
    setFieldDialogOpen(true);
  };

  const handleEditField = (field: QuestionnaireField) => {
    setEditingField(field);
    setFieldDialogOpen(true);
  };

  const handleDeleteField = (id: number) => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      deleteField(id);
    }
  };

  const handleFieldSubmit = (data: CreateQuestionnaireFieldData | UpdateQuestionnaireFieldData) => {
    if (editingField) {
      updateField(
        { id: editingField.id, data: data as UpdateQuestionnaireFieldData },
        {
          onSuccess: () => {
            setFieldDialogOpen(false);
            setEditingField(null);
          },
        },
      );
    } else {
      createField(data as CreateQuestionnaireFieldData, {
        onSuccess: () => {
          setFieldDialogOpen(false);
        },
      });
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            minHeight: '70vh',
          },
        }}
      >
        {open && questionnaire && (
          <>
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: 1,
                borderColor: 'divider',
                pb: 2,
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <QuestionnaireIcon color="primary" sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h5" fontWeight={700} color="primary">
                    Manage Questions
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {questionnaire.name} - {fields.length} question{fields.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title="Close">
                <IconButton onClick={onClose}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Box>
                    <Typography variant="h6" fontWeight={600} color="text.primary">
                      Questionnaire Fields
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Add, edit, or remove fields to customize what information you collect
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddField}
                    sx={{ borderRadius: 1, px: 3, py: 1, fontWeight: 600 }}
                  >
                    Add Field
                  </Button>
                </Box>

                <QuestionnaireFieldsTable
                  fields={fields}
                  isLoading={isLoadingFields}
                  onEdit={handleEditField}
                  onDelete={handleDeleteField}
                  isDeleting={isDeletingField}
                />
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
              <Button
                onClick={onClose}
                variant="contained"
                sx={{ borderRadius: 1, px: 4, py: 1, fontWeight: 600 }}
              >
                Done
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Field Form Dialog */}
      <FieldFormDialog
        open={fieldDialogOpen}
        onClose={() => {
          setFieldDialogOpen(false);
          setEditingField(null);
        }}
        editingField={editingField}
        questionnaireId={questionnaire?.id}
        onSubmit={handleFieldSubmit}
        isLoading={isCreatingField || isUpdatingField}
      />
    </>
  );
};
