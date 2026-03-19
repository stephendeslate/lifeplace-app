import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  Divider,
  Stack,
  Paper,
} from '@mui/material';
import { Schedule } from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers';
import type { UpdateNotificationPreferenceData } from '@/types/notifications.types';
import { DIGEST_FREQUENCIES } from '@/types/notifications.types';

interface AdvancedSettingsSectionProps {
  formData: UpdateNotificationPreferenceData;
  quietHoursStart: Date | null;
  quietHoursEnd: Date | null;
  onFieldChange: (
    field: keyof UpdateNotificationPreferenceData,
    value: boolean | string | number[],
  ) => void;
  onQuietHoursChange: (field: 'start' | 'end', value: Date | null) => void;
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  formData,
  quietHoursStart,
  quietHoursEnd,
  onFieldChange,
  onQuietHoursChange,
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Advanced Settings
        </Typography>

        <Stack spacing={3}>
          {/* Digest Frequency */}
          <Box>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Digest Frequency
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Digest Frequency</InputLabel>
              <Select
                value={formData.digest_frequency || 'IMMEDIATE'}
                onChange={(e) => onFieldChange('digest_frequency', e.target.value)}
                label="Digest Frequency"
              >
                {DIGEST_FREQUENCIES.map((frequency) => (
                  <MenuItem key={frequency.value} value={frequency.value}>
                    {frequency.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Choose how often you want to receive notification digests
            </Typography>
          </Box>

          <Divider />

          {/* Quiet Hours */}
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Schedule color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                Quiet Hours
              </Typography>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.quiet_hours_enabled ?? false}
                  onChange={(e) => onFieldChange('quiet_hours_enabled', e.target.checked)}
                />
              }
              label="Enable Quiet Hours"
              sx={{ mb: 2 }}
            />

            {formData.quiet_hours_enabled && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <TimePicker
                    label="Start Time"
                    value={quietHoursStart}
                    onChange={(value) => onQuietHoursChange('start', value)}
                    slotProps={{
                      textField: { size: 'small' },
                    }}
                  />

                  <Typography variant="body2" color="text.secondary">
                    to
                  </Typography>

                  <TimePicker
                    label="End Time"
                    value={quietHoursEnd}
                    onChange={(value) => onQuietHoursChange('end', value)}
                    slotProps={{
                      textField: { size: 'small' },
                    }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Notifications will not be sent during these hours
                </Typography>
              </Paper>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
