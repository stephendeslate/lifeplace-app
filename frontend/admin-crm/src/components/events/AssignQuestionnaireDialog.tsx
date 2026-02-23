// frontend/admin-crm/src/components/events/AssignQuestionnaireDialog.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useQuestionnaires } from '../../hooks/useQuestionnaires';
import {
  useCreateEventQuestionnaire,
  useSendEventQuestionnaire,
} from '../../hooks/useEventQuestionnaires';
import type { Questionnaire } from '../../types/questionnaires.types';

interface AssignQuestionnaireDialogProps {
  open: boolean;
  onClose: () => void;
  eventId: number;
  eventTypeId?: number;
  existingAssignments: number[]; // IDs of already assigned questionnaires
  onSuccess?: () => void;
}

export const AssignQuestionnaireDialog: React.FC<AssignQuestionnaireDialogProps> = ({
  open,
  onClose,
  eventId,
  eventTypeId,
  existingAssignments,
  onSuccess,
}) => {
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [sendImmediately, setSendImmediately] = useState(true);

  // Fetch active questionnaires
  const { useActiveQuestionnaires } = useQuestionnaires();
  const { data: allQuestionnaires = [], isLoading: isLoadingQuestionnaires } =
    useActiveQuestionnaires();

  // Filter out already assigned questionnaires and optionally filter by event type
  const availableQuestionnaires = allQuestionnaires.filter((q) => {
    // Don't show already assigned questionnaires
    if (existingAssignments.includes(q.id)) return false;
    // Show questionnaires for this event type or universal ones (no event type)
    if (eventTypeId) {
      return q.event_type === eventTypeId || q.event_type === null;
    }
    return true;
  });

  // Mutations
  const createEventQuestionnaire = useCreateEventQuestionnaire();
  const sendEventQuestionnaire = useSendEventQuestionnaire();

  const handleSubmit = async () => {
    if (!selectedQuestionnaire) return;

    createEventQuestionnaire.mutate(
      {
        event: eventId,
        questionnaire: selectedQuestionnaire,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : undefined,
        notes,
      },
      {
        onSuccess: (newEventQuestionnaire) => {
          // If sendImmediately is checked, send it right away
          if (sendImmediately) {
            sendEventQuestionnaire.mutate(newEventQuestionnaire.id, {
              onSuccess: () => {
                handleClose();
                onSuccess?.();
              },
              onError: () => {
                // Even if send fails, the assignment was created
                handleClose();
                onSuccess?.();
              },
            });
          } else {
            handleClose();
            onSuccess?.();
          }
        },
      },
    );
  };

  const handleClose = () => {
    setSelectedQuestionnaire('');
    setDueDate(null);
    setNotes('');
    setSendImmediately(true);
    onClose();
  };

  const getSelectedQuestionnaireDetails = (): Questionnaire | undefined => {
    if (!selectedQuestionnaire) return undefined;
    return allQuestionnaires.find((q) => q.id === selectedQuestionnaire);
  };

  const selectedDetails = getSelectedQuestionnaireDetails();

  const isSubmitting = createEventQuestionnaire.isPending || sendEventQuestionnaire.isPending;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Questionnaire</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {availableQuestionnaires.length === 0 ? (
            <Alert severity="info">
              {isLoadingQuestionnaires
                ? 'Loading questionnaires...'
                : existingAssignments.length > 0
                  ? 'All available questionnaires have already been assigned to this event.'
                  : 'No active questionnaires available to assign.'}
            </Alert>
          ) : (
            <>
              <FormControl fullWidth>
                <InputLabel id="questionnaire-select-label">Questionnaire</InputLabel>
                <Select
                  labelId="questionnaire-select-label"
                  value={selectedQuestionnaire}
                  onChange={(e) => setSelectedQuestionnaire(e.target.value as number)}
                  label="Questionnaire"
                  disabled={isLoadingQuestionnaires}
                >
                  {availableQuestionnaires.map((q) => (
                    <MenuItem key={q.id} value={q.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {q.name}
                        {q.event_type === null && (
                          <Chip label="Universal" size="small" variant="outlined" />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          ({q.fields_count} fields)
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedDetails && (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="body2">
                    <strong>{selectedDetails.name}</strong> has {selectedDetails.fields_count}{' '}
                    fields.
                    {selectedDetails.event_type_name && (
                      <> Designed for {selectedDetails.event_type_name} events.</>
                    )}
                  </Typography>
                </Alert>
              )}

              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Due Date (Optional)"
                  value={dueDate}
                  onChange={(newValue) => setDueDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: 'Set a deadline for the client to complete this questionnaire',
                    },
                  }}
                />
              </LocalizationProvider>

              <TextField
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
                fullWidth
                helperText="Internal notes about this assignment"
              />

              <FormControl>
                <label>
                  <input
                    type="checkbox"
                    checked={sendImmediately}
                    onChange={(e) => setSendImmediately(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Send to client immediately after assignment
                </label>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
                  If unchecked, the questionnaire will be assigned but not sent. You can send it
                  manually later.
                </Typography>
              </FormControl>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!selectedQuestionnaire || isSubmitting || availableQuestionnaires.length === 0}
        >
          {isSubmitting ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              {sendImmediately ? 'Assigning & Sending...' : 'Assigning...'}
            </>
          ) : sendImmediately ? (
            'Assign & Send'
          ) : (
            'Assign'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
