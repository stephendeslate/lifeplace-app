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
import { Close as CloseIcon, Preview as PreviewIcon } from '@mui/icons-material';
import { QuestionnairePreview } from './QuestionnairePreview';
import { useQuestionnaireFields } from '../../hooks/useQuestionnaires';
import type { Questionnaire } from '../../types/questionnaires.types';

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
  const { data: fields = [], isLoading: isLoadingFields } = useFields(questionnaire?.id || 0);

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
          borderRadius: 1,
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
              borderBottom: 1,
              borderColor: 'divider',
              pb: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={2}>
              <PreviewIcon color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h5" fontWeight={700} color="primary">
                  Preview Questionnaire
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {questionnaire.name} - {fields.length} field{fields.length !== 1 ? 's' : ''}
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

          <DialogActions sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              onClick={onClose}
              variant="contained"
              sx={{ borderRadius: 1, px: 4, py: 1, fontWeight: 600 }}
            >
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
