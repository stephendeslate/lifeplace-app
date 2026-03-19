import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { QuestionnaireFormData } from '@/types/questionnaires.types';

interface EventType {
  id: number;
  name: string;
  description?: string;
}

interface BasicInfoTabProps {
  formData: QuestionnaireFormData;
  errors: Partial<{ [key: string]: string }>;
  eventTypes: EventType[];
  isLoadingEventTypes: boolean;
  eventTypesError: Error | null;
  onInputChange: (
    field: keyof QuestionnaireFormData,
  ) => (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target: { value: unknown } },
  ) => void;
  onSwitchChange: (
    field: keyof QuestionnaireFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  formData,
  errors,
  eventTypes,
  isLoadingEventTypes,
  eventTypesError,
  onInputChange,
  onSwitchChange,
}) => {
  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {/* Basic Information */}
      <TextField
        fullWidth
        label="Questionnaire Name"
        value={formData.name}
        onChange={onInputChange('name')}
        error={!!errors.name}
        helperText={errors.name}
        required
      />

      <FormControl fullWidth error={!!eventTypesError}>
        <InputLabel>Event Type (Optional)</InputLabel>
        <Select
          value={formData.event_type}
          onChange={onInputChange('event_type')}
          label="Event Type (Optional)"
          disabled={isLoadingEventTypes}
        >
          <MenuItem value="">
            <em>Any Event Type</em>
          </MenuItem>
          {eventTypes.map((eventType) => (
            <MenuItem key={eventType.id} value={eventType.id.toString()}>
              <Box>
                <Typography variant="body2">{eventType.name}</Typography>
                {eventType.description && (
                  <Typography variant="caption" color="text.secondary">
                    {eventType.description}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
        {isLoadingEventTypes && (
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Loading event types...
            </Typography>
          </Box>
        )}
        {eventTypesError && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Failed to load event types. You can still create the questionnaire without specifying an
            event type.
          </Alert>
        )}
      </FormControl>

      <Box display="flex" gap={2}>
        <TextField
          label="Display Order"
          value={formData.order}
          onChange={onInputChange('order')}
          error={!!errors.order}
          helperText={errors.order || 'Lower numbers appear first'}
          type="number"
          sx={{ flex: 1 }}
        />

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={formData.is_active} onChange={onSwitchChange('is_active')} />}
            label="Active"
          />
        </Box>
      </Box>
    </Box>
  );
};
