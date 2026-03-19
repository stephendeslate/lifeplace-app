import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { Email, Sms, Notifications, PhoneIphone, Campaign, Warning } from '@mui/icons-material';
import type { UpdateNotificationPreferenceData } from '@/types/notifications.types';

interface MarketingPreferencesSectionProps {
  formData: UpdateNotificationPreferenceData;
  onFieldChange: (
    field: keyof UpdateNotificationPreferenceData,
    value: boolean | string | number[],
  ) => void;
}

export const MarketingPreferencesSection: React.FC<MarketingPreferencesSectionProps> = ({
  formData,
  onFieldChange,
}) => {
  return (
    <Card sx={{ border: '1px solid', borderColor: 'warning.300' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Campaign sx={{ color: 'warning.main' }} />
          <Typography variant="h6" fontWeight="bold">
            Marketing & Promotions
          </Typography>
          <Chip label="Requires Consent" size="small" color="warning" variant="outlined" />
        </Box>

        <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Philippines DPA Compliance:</strong> Marketing communications require explicit
            consent. These settings are OFF by default. Users can withdraw consent at any time. Only
            enable if you have obtained explicit consent for marketing communications.
          </Typography>
        </Alert>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={
              <Switch
                checked={formData.marketing_email ?? false}
                onChange={(e) => onFieldChange('marketing_email', e.target.checked)}
                disabled={!formData.email_enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Email fontSize="small" />
                <Typography variant="body2">Marketing Email</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.marketing_sms ?? false}
                onChange={(e) => onFieldChange('marketing_sms', e.target.checked)}
                disabled={!formData.sms_enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Sms fontSize="small" />
                <Typography variant="body2">Marketing SMS</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.marketing_in_app ?? true}
                onChange={(e) => onFieldChange('marketing_in_app', e.target.checked)}
                disabled={!formData.in_app_enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Notifications fontSize="small" />
                <Typography variant="body2">Marketing In-App</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.marketing_push ?? false}
                onChange={(e) => onFieldChange('marketing_push', e.target.checked)}
                disabled={!formData.push_enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <PhoneIphone fontSize="small" />
                <Typography variant="body2">Marketing Push</Typography>
              </Box>
            }
          />
        </Stack>
      </CardContent>
    </Card>
  );
};
