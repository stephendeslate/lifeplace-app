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
import {
  Close as CloseIcon,
  Add as AddIcon,
  Quiz as QuestionnaireIcon,
} from '@mui/icons-material';
import { QuestionnaireFieldsTable } from './QuestionnaireFieldsTable';
import { FieldFormDialog } from './FieldFormDialog';
import { useQuestionnaireFields } from '../../hooks/useQuestionnaires';
import type {
  QuestionnaireField,
  CreateQuestionnaireFieldData,
  UpdateQuestionnaireFieldData
} from '../../types/questionnaires.types';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

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

  const {
    data: fields = [],
    isLoading: isLoadingFields
  } = useFields(questionnaire?.id || 0);

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
        }
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
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xxl,
            border: `1px solid ${tokens.color.borders.glass}`,
            background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
            boxShadow: `0 25px 80px ${tokens.color.neutral[900]}20`,
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
                borderBottom: `1px solid ${tokens.color.borders.glass}`,
                pb: 2,
                background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    ...glassPresets.medium,
                    borderRadius: tokens.spacing.radius.lg,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                    boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                  }}
                >
                  <QuestionnaireIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[500]} 100%)`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    Manage Questions
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: tokens.color.neutral[600],
                      mt: 0.5,
                    }}
                  >
                    {questionnaire.name} • {fields.length} question{fields.length !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title="Close">
                <IconButton
                  onClick={onClose}
                  sx={{
                    ...glassPresets.light,
                    border: `1px solid ${tokens.color.borders.glass}`,
                    borderRadius: tokens.spacing.radius.full,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      ...glassPresets.medium,
                      transform: 'scale(1.05)',
                      border: `1px solid ${tokens.color.error[300]}`,
                    },
                  }}
                >
                  <CloseIcon sx={{ color: tokens.color.neutral[600] }} />
                </IconButton>
              </Tooltip>
            </DialogTitle>

            <DialogContent
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
              }}
            >
              <Box
                sx={{
                  ...glassPresets.light,
                  borderRadius: tokens.spacing.radius.xxl,
                  border: `1px solid ${tokens.color.borders.glass}`,
                  p: 3,
                  background: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={3}
                >
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: tokens.color.neutral[800],
                      }}
                    >
                      Questionnaire Fields
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: tokens.color.neutral[600],
                        mt: 0.5,
                      }}
                    >
                      Add, edit, or remove fields to customize what information you collect
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddField}
                    sx={{
                      background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                      borderRadius: tokens.spacing.radius.full,
                      px: 3,
                      py: 1,
                      fontWeight: 600,
                      boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                        boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
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

            <DialogActions
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
                borderTop: `1px solid ${tokens.color.borders.glass}`,
                gap: 2,
              }}
            >
              <Button
                onClick={onClose}
                variant="contained"
                sx={{
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                  borderRadius: tokens.spacing.radius.full,
                  px: 4,
                  py: 1,
                  fontWeight: 600,
                  boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                    boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
                  },
                }}
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
