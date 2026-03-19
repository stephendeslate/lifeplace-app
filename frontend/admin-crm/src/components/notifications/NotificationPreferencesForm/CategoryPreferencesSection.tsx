import React from 'react';
import { Box, Typography, Card, CardContent, FormControlLabel, Switch, Stack } from '@mui/material';
import { Email, Sms, Notifications, Schedule, Settings, PhoneIphone } from '@mui/icons-material';
import type { UpdateNotificationPreferenceData } from '@/types/notifications.types';

interface CategoryPreferencesSectionProps {
  formData: UpdateNotificationPreferenceData;
  onFieldChange: (
    field: keyof UpdateNotificationPreferenceData,
    value: boolean | string | number[],
  ) => void;
}

const renderCategoryPreferences = (
  category: string,
  label: string,
  icon: React.ReactNode,
  formData: UpdateNotificationPreferenceData,
  onFieldChange: CategoryPreferencesSectionProps['onFieldChange'],
) => {
  const categoryKey = category.toLowerCase();
  return (
    <Card key={category} variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {icon}
          <Typography variant="h6" fontWeight="medium">
            {label}
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          <FormControlLabel
            control={
              <Switch
                checked={
                  (formData[
                    `${categoryKey}_email` as keyof UpdateNotificationPreferenceData
                  ] as boolean) ?? false
                }
                onChange={(e) =>
                  onFieldChange(
                    `${categoryKey}_email` as keyof UpdateNotificationPreferenceData,
                    e.target.checked,
                  )
                }
                disabled={!formData.email_enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Email fontSize="small" />
                <Typography variant="body2">Email</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={
                  (formData[
                    `${categoryKey}_sms` as keyof UpdateNotificationPreferenceData
                  ] as boolean) ?? false
                }
                onChange={(e) =>
                  onFieldChange(
                    `${categoryKey}_sms` as keyof UpdateNotificationPreferenceData,
                    e.target.checked,
                  )
                }
                disabled={!formData.sms_enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Sms fontSize="small" />
                <Typography variant="body2">SMS</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={
                  (formData[
                    `${categoryKey}_in_app` as keyof UpdateNotificationPreferenceData
                  ] as boolean) ?? false
                }
                onChange={(e) =>
                  onFieldChange(
                    `${categoryKey}_in_app` as keyof UpdateNotificationPreferenceData,
                    e.target.checked,
                  )
                }
                disabled={!formData.in_app_enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Notifications fontSize="small" />
                <Typography variant="body2">In-App</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={
                  (formData[
                    `${categoryKey}_push` as keyof UpdateNotificationPreferenceData
                  ] as boolean) ?? false
                }
                onChange={(e) =>
                  onFieldChange(
                    `${categoryKey}_push` as keyof UpdateNotificationPreferenceData,
                    e.target.checked,
                  )
                }
                disabled={!formData.push_enabled}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <PhoneIphone fontSize="small" />
                <Typography variant="body2">Push</Typography>
              </Box>
            }
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

export const CategoryPreferencesSection: React.FC<CategoryPreferencesSectionProps> = ({
  formData,
  onFieldChange,
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Notification Categories
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure delivery methods for different types of notifications
        </Typography>

        <Stack spacing={2}>
          {renderCategoryPreferences(
            'SYSTEM',
            'System Updates',
            <Settings color="action" />,
            formData,
            onFieldChange,
          )}
          {renderCategoryPreferences(
            'EVENT',
            'Event Management',
            <Schedule color="action" />,
            formData,
            onFieldChange,
          )}
          {renderCategoryPreferences(
            'TASK',
            'Task Assignments',
            <Notifications color="action" />,
            formData,
            onFieldChange,
          )}
          {renderCategoryPreferences(
            'PAYMENT',
            'Payment Processing',
            <Notifications color="action" />,
            formData,
            onFieldChange,
          )}
          {renderCategoryPreferences(
            'CLIENT',
            'Client Management',
            <Notifications color="action" />,
            formData,
            onFieldChange,
          )}
          {renderCategoryPreferences(
            'CONTRACT',
            'Contract Updates',
            <Notifications color="action" />,
            formData,
            onFieldChange,
          )}
          {renderCategoryPreferences(
            'WORKFLOW',
            'Workflow Progress',
            <Notifications color="action" />,
            formData,
            onFieldChange,
          )}
          {renderCategoryPreferences(
            'COMMUNICATION',
            'Communication Alerts',
            <Email color="action" />,
            formData,
            onFieldChange,
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
