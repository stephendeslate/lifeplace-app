// frontend/admin-crm/src/components/questionnaires/QuestionnaireReorderDialog.tsx

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
} from '@mui/material';
import {
  EventNote as EventIcon,
  QuestionAnswer as FieldsIcon,
} from '@mui/icons-material';
import { DraggableList } from '../common/DraggableList';
import { useQuestionnaires } from '../../hooks/useQuestionnaires';
import type { Questionnaire } from '../../types/questionnaires.types';

interface QuestionnaireReorderDialogProps {
  open: boolean;
  onClose: () => void;
  questionnaires: Questionnaire[];
  onReorderComplete?: () => void;
}

export const QuestionnaireReorderDialog: React.FC<QuestionnaireReorderDialogProps> = ({
  open,
  onClose,
  questionnaires,
  onReorderComplete,
}) => {
  const { reorderQuestionnaires, isReorderingQuestionnaires } = useQuestionnaires();

  const handleReorder = async (reorderedQuestionnaires: Questionnaire[]) => {
    const orderMapping: Record<string, number> = {};
    
    reorderedQuestionnaires.forEach((questionnaire, index) => {
      orderMapping[questionnaire.id.toString()] = index + 1;
    });

    const reorderData = {
      order_mapping: orderMapping,
    };

    return new Promise<void>((resolve, reject) => {
      reorderQuestionnaires(reorderData, {
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

  const renderQuestionnaireItem = (questionnaire: Questionnaire) => (
    <Box display="flex" alignItems="center" gap={2}>
      {/* Questionnaire Info */}
      <Box sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Typography variant="subtitle2" fontWeight="medium">
            {questionnaire.name}
          </Typography>
          {questionnaire.is_active ? (
            <Chip label="Active" size="small" color="success" />
          ) : (
            <Chip label="Inactive" size="small" variant="outlined" />
          )}
        </Box>
        
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {questionnaire.event_type_name ? (
            <Chip
              icon={<EventIcon />}
              label={questionnaire.event_type_name}
              size="small"
              color="primary"
              variant="outlined"
            />
          ) : (
            <Chip
              label="Any Event Type"
              size="small"
              variant="outlined"
              color="default"
            />
          )}
          
          {questionnaire.fields && (
            <Chip
              icon={<FieldsIcon />}
              label={`${questionnaire.fields.length} fields`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={isReorderingQuestionnaires}
    >
      <DialogTitle>Reorder Questionnaires</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Drag and drop questionnaires to change their display order.
        </Typography>
        
        <Box mt={2}>
          <DraggableList<Questionnaire>
            items={questionnaires}
            onReorder={handleReorder}
            renderItem={renderQuestionnaireItem}
            keyExtractor={(q) => q.id.toString()}
            showSaveButton={true}
            enableKeyboardReorder={true}
            emptyMessage="No questionnaires to reorder."
            containerProps={{ sx: { mt: 2 } }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={isReorderingQuestionnaires}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};