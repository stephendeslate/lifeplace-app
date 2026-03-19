import React from 'react';
import {
  Typography,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';

interface PreferencesDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  preferencesData: Record<string, unknown>;
  onPreferenceChange: (key: string, value: unknown) => void;
}

export const PreferencesDialog: React.FC<PreferencesDialogProps> = ({
  open,
  onClose,
  onSave,
  isSaving,
  preferencesData,
  onPreferenceChange,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Event Preferences</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          Update your preferences for this event. These settings help us tailor the experience to
          your needs.
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Special Requests"
            multiline
            rows={3}
            value={(preferencesData.special_requests as string) || ''}
            onChange={(e) => onPreferenceChange('special_requests', e.target.value)}
            placeholder="Any special requests or requirements..."
            fullWidth
          />

          <TextField
            label="Dietary Restrictions"
            value={(preferencesData.dietary_restrictions as string) || ''}
            onChange={(e) => onPreferenceChange('dietary_restrictions', e.target.value)}
            placeholder="Allergies, dietary preferences, etc."
            fullWidth
          />

          <TextField
            label="Communication Preferences"
            value={(preferencesData.communication_preferences as string) || ''}
            onChange={(e) => onPreferenceChange('communication_preferences', e.target.value)}
            placeholder="Preferred contact method, frequency, etc."
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" disabled={isSaving}>
          Save Preferences
        </Button>
      </DialogActions>
    </Dialog>
  );
};
