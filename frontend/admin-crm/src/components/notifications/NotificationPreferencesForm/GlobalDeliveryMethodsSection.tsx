import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Stack,
  Paper,
} from '@mui/material';
import { Email, Sms, Notifications, NotificationsActive, PhoneIphone } from '@mui/icons-material';
import type { UpdateNotificationPreferenceData } from '@/types/notifications.types';

interface GlobalDeliveryMethodsSectionProps {
  formData: UpdateNotificationPreferenceData;
  onFieldChange: (
    field: keyof UpdateNotificationPreferenceData,
    value: boolean | string | number[],
  ) => void;
}

export const GlobalDeliveryMethodsSection: React.FC<GlobalDeliveryMethodsSectionProps> = ({
  formData,
  onFieldChange,
}) => {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <NotificationsActive color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Global Delivery Methods
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph>
          Control which delivery methods are available for notifications
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          <Paper
            sx={{
              p: 2,
              textAlign: 'center',
              bgcolor: formData.email_enabled ? 'primary.50' : 'grey.50',
              flex: 1,
              minWidth: 180,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={formData.email_enabled ?? true}
                  onChange={(e) => onFieldChange('email_enabled', e.target.checked)}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Email fontSize="small" />
                  <Typography variant="body2" fontWeight="medium">
                    Email
                  </Typography>
                </Box>
              }
            />
          </Paper>

          <Paper
            sx={{
              p: 2,
              textAlign: 'center',
              bgcolor: formData.sms_enabled ? 'warning.50' : 'grey.50',
              flex: 1,
              minWidth: 180,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={formData.sms_enabled ?? false}
                  onChange={(e) => onFieldChange('sms_enabled', e.target.checked)}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Sms fontSize="small" />
                  <Typography variant="body2" fontWeight="medium">
                    SMS
                  </Typography>
                </Box>
              }
            />
          </Paper>

          <Paper
            sx={{
              p: 2,
              textAlign: 'center',
              bgcolor: formData.in_app_enabled ? 'success.50' : 'grey.50',
              flex: 1,
              minWidth: 180,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={formData.in_app_enabled ?? true}
                  onChange={(e) => onFieldChange('in_app_enabled', e.target.checked)}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <Notifications fontSize="small" />
                  <Typography variant="body2" fontWeight="medium">
                    In-App
                  </Typography>
                </Box>
              }
            />
          </Paper>

          <Paper
            sx={{
              p: 2,
              textAlign: 'center',
              bgcolor: formData.push_enabled ? 'info.50' : 'grey.50',
              flex: 1,
              minWidth: 180,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={formData.push_enabled ?? true}
                  onChange={(e) => onFieldChange('push_enabled', e.target.checked)}
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <PhoneIphone fontSize="small" />
                  <Typography variant="body2" fontWeight="medium">
                    Push
                  </Typography>
                </Box>
              }
            />
          </Paper>
        </Stack>
      </CardContent>
    </Card>
  );
};
