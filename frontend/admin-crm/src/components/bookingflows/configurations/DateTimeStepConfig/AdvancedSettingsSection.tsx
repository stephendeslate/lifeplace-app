import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Stack,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Block as BlockIcon } from '@mui/icons-material';
import type { DateTimeConfigFormData } from './types';

interface AdvancedSettingsSectionProps {
  formData: DateTimeConfigFormData;
  errors: Record<string, string>;
  newBlockedDate: string;
  setNewBlockedDate: (date: string) => void;
  handleInputChange: (
    field: keyof DateTimeConfigFormData,
  ) => (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => void;
  handleAddBlockedDate: () => void;
  handleRemoveBlockedDate: (date: string) => void;
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  formData,
  errors,
  newBlockedDate,
  setNewBlockedDate,
  handleInputChange,
  handleAddBlockedDate,
  handleRemoveBlockedDate,
}) => (
  <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="subtitle1">Advanced Settings</Typography>
        {(formData.blocked_dates.length > 0 ||
          formData.buffer_before_hours > 0 ||
          formData.buffer_after_hours > 0) && (
          <Chip label="Configured" size="small" color="primary" />
        )}
      </Box>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Buffer Times
          </Typography>
          <Stack spacing={2}>
            <Box display="flex" gap={2}>
              <TextField
                label="Buffer Before (hours)"
                type="number"
                value={formData.buffer_before_hours}
                onChange={handleInputChange('buffer_before_hours')}
                error={!!errors.buffer}
                helperText="Time to block before the event"
                inputProps={{ min: 0 }}
                sx={{ flex: 1 }}
              />

              <TextField
                label="Buffer After (hours)"
                type="number"
                value={formData.buffer_after_hours}
                onChange={handleInputChange('buffer_after_hours')}
                error={!!errors.buffer}
                helperText="Time to block after the event"
                inputProps={{ min: 0 }}
                sx={{ flex: 1 }}
              />
            </Box>
            {errors.buffer && (
              <Typography variant="caption" color="error">
                {errors.buffer}
              </Typography>
            )}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Blocked Dates
          </Typography>

          <Box display="flex" gap={1} mb={2}>
            <TextField
              type="date"
              size="small"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<BlockIcon />}
              onClick={handleAddBlockedDate}
              disabled={!newBlockedDate}
            >
              Block Date
            </Button>
          </Box>

          {formData.blocked_dates.length > 0 ? (
            <Box display="flex" flexWrap="wrap" gap={1}>
              {formData.blocked_dates.map((date, index) => (
                <Chip
                  key={index}
                  label={new Date(date).toLocaleDateString()}
                  onDelete={() => handleRemoveBlockedDate(date)}
                  color="error"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No blocked dates set
            </Typography>
          )}
        </Box>
      </Stack>
    </AccordionDetails>
  </Accordion>
);
