// frontend/admin-crm/src/components/questionnaires/QuestionnairePreviewDialog.tsx

import React from 'react';
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
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { QuestionnairePreview } from './QuestionnairePreview';
import { useQuestionnaireFields } from '../../hooks/useQuestionnaires';
import type { Questionnaire } from '../../types/questionnaires.types';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

export interface QuestionnairePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  questionnaire: Questionnaire | null;
}

export const QuestionnairePreviewDialog: React.FC<QuestionnairePreviewDialogProps> = ({
  open,
  onClose,
  questionnaire,
}) => {
  // Fetch fields for the questionnaire
  const { useQuestionnaireFields: useFields } = useQuestionnaireFields();
  const {
    data: fields = [],
    isLoading: isLoadingFields,
  } = useFields(questionnaire?.id || 0);

  // Build questionnaire object with fields for preview
  const questionnaireWithFields: Questionnaire | null = questionnaire
    ? {
        ...questionnaire,
        fields: fields,
        fields_count: fields.length,
      }
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          ...glassPresets.light,
          borderRadius: tokens.spacing.radius.xxl,
          border: `1px solid ${tokens.color.borders.glass}`,
          background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
          boxShadow: `0 25px 80px ${tokens.color.neutral[900]}20`,
          minHeight: '60vh',
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
                <PreviewIcon sx={{ color: 'white', fontSize: 28 }} />
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
                  Preview Questionnaire
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: tokens.color.neutral[600],
                    mt: 0.5,
                  }}
                >
                  {questionnaire.name} • {fields.length} field{fields.length !== 1 ? 's' : ''}
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
              background: `linear-gradient(135deg, ${tokens.color.neutral[100]} 0%, ${tokens.color.neutral[200]} 100%)`,
            }}
          >
            {isLoadingFields ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                py={8}
              >
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading questionnaire fields...
                </Typography>
              </Box>
            ) : questionnaireWithFields ? (
              <QuestionnairePreview questionnaire={questionnaireWithFields} />
            ) : null}
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
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
