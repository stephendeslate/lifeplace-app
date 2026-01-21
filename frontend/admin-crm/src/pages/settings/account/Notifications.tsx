// frontend/admin-crm/src/pages/settings/account/Notifications.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Divider,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info,
  BugReport,
  Settings,
  CheckCircle,
  Warning,
  Email as EmailIcon,
  Sms as SmsIcon,
  Schedule as ScheduleIcon,
  Summarize as SummarizeIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAuth } from '../../../contexts/AuthContext';
import {
  useNotificationPreferences,
  useNotificationTypes,
  useNotifications
} from '../../../hooks/useNotifications';
import { NotificationPreferencesForm } from '../../../components/notifications/NotificationPreferencesForm';
import { NotificationCountsDisplay } from '../../../components/notifications/NotificationCountsDisplay';
import type { CreateNotificationData } from '../../../types/notifications.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernPageHeader, createRefreshAction } from '../../../components/common/ModernPageHeader';
import ModernLoadingStates from '../../../components/common/ModernLoadingStates';

export const Notifications: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const { user } = useAuth();
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    preferences,
    isLoadingPreferences,
    refetchPreferences,
  } = useNotificationPreferences();

  const { notificationTypes, isLoadingTypes } = useNotificationTypes({ is_active: true });

  const {
    useNotificationCounts,
    createNotification,
    isCreating,
  } = useNotifications();

  const { data: counts, isLoading: isLoadingCounts, refetch: refetchCounts } = useNotificationCounts();

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Account Management' },
      { label: 'Notifications' },
    ]);
  }, [setBreadcrumbs]);

  const handleTestNotification = async () => {
    if (!user?.id) return;

    setIsTestingNotification(true);
    setTestResult(null);

    try {
      const testData: CreateNotificationData = {
        recipient_ids: [user.id],
        notification_type_code: 'SYSTEM_NOTIFICATION',
        context_data: {
          test: true,
          message: 'This is a test notification to verify your notification settings are working correctly.',
          action_url: '/settings/account/notifications',
          created_by: 'Settings Page',
          timestamp: new Date().toISOString(),
        },
      };

      await createNotification(testData);

      setTestResult({
        success: true,
        message: 'Test notification sent successfully! Check your notifications.'
      });

      // Refresh counts after creating test notification
      setTimeout(() => {
        refetchCounts();
      }, 1000);

    } catch (error) {
      console.error('Failed to send test notification:', error);
      setTestResult({
        success: false,
        message: 'Failed to send test notification. Please try again.'
      });
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleRefresh = () => {
    refetchPreferences();
    refetchCounts();
  };

  const isLoading = isLoadingPreferences || isLoadingTypes;

  if (isLoading) {
    return (
      <ModernSettingsLayout>
        <ModernLoadingStates.ModernLoadingSpinner
          size={40}
          message="Loading notification settings..."
          variant="circular"
        />
      </ModernSettingsLayout>
    );
  }

  return (
    <ModernSettingsLayout>
      {/* Header */}
      <ModernPageHeader
        title="Notification Settings"
        subtitle="Configure how and when you receive notifications and system alerts"
        icon={<NotificationsIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Account Management' },
          { label: 'Notifications' },
        ]}
        secondaryActions={[
          createRefreshAction(handleRefresh),
          {
            icon: <BugReport />,
            label: isTestingNotification ? 'Sending...' : 'Test Notification',
            variant: 'outlined',
            onClick: handleTestNotification,
            disabled: isTestingNotification || isCreating || !preferences,
            tooltip: 'Send a test notification to verify your settings',
          },
        ]}
        stats={counts ? [
          { label: 'Total Notifications', value: counts.total },
          { label: 'Unread', value: counts.unread },
        ] : undefined}
        size="medium"
      />

      {/* Test Result Alert */}
      {testResult && (
        <Box sx={{ mb: 4 }}>
          <Alert
            severity={testResult.success ? 'success' : 'error'}
            icon={testResult.success ? <CheckCircle /> : <Warning />}
            onClose={() => setTestResult(null)}
          >
            {testResult.message}
          </Alert>
        </Box>
      )}

      {/* Info Alert */}
      <Box sx={{ mb: 4 }}>
        <Alert severity="info" icon={<Info />}>
          <Typography variant="body2">
            Notification preferences control how you receive system updates, event notifications,
            and other important communications. Changes are saved automatically and take effect immediately.
          </Typography>
        </Alert>
      </Box>

      <Stack spacing={4}>
        {/* Current Notification Status */}
        {counts && (
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6" fontWeight="600">
                  Activity Overview
                </Typography>
              </Box>

              <Stack direction="row" spacing={2}>
                <Chip label={`${counts.total} Total`} variant="outlined" size="small" />
                {counts.unread > 0 && (
                  <Chip label={`${counts.unread} Unread`} color="warning" size="small" />
                )}
              </Stack>
            </Box>

            <NotificationCountsDisplay
              counts={counts}
              isLoading={isLoadingCounts}
            />
          </Box>
        )}

        {/* Notification Types Overview */}
        {notificationTypes.length > 0 && (
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
              <Settings color="secondary" />
              <Typography variant="h6" fontWeight="600">
                Configured Types
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {notificationTypes
                .slice(0, 8)
                .map((type) => (
                  <Chip
                    key={type.id}
                    label={type.name}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                ))}
              {notificationTypes.length > 8 && (
                <Chip
                  label={`+${notificationTypes.length - 8} more`}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 1 }}
                />
              )}
            </Stack>
          </Box>
        )}

        {/* Notification Preferences Form */}
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
            Notification Preferences
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Customize your notification delivery settings and preferences
          </Typography>
          {preferences ? (
            <Box sx={{ position: 'relative' }}>
              {isLoading && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
                  <CircularProgress />
                </Box>
              )}
              <NotificationPreferencesForm
                preferences={preferences}
                isLoading={isLoading}
              />
            </Box>
          ) : (
            <Alert severity="error">
              Failed to load notification preferences. Please try refreshing the page.
            </Alert>
          )}
        </Box>

        {/* Additional Information */}
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
            How Notifications Work
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Learn about notification delivery methods, categories, and customization options
          </Typography>
          <Stack spacing={4}>
            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <NotificationsIcon color="info" />
                <Typography variant="h6" fontWeight="600">
                  Delivery Methods
                </Typography>
              </Box>

              <Box sx={{ borderRadius: 1, bgcolor: 'action.hover', p: 2 }}>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <NotificationsIcon color="primary" sx={{ fontSize: '1.25rem' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="600">In-App Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Notifications appear in your dashboard and notification center
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <EmailIcon color="warning" sx={{ fontSize: '1.25rem' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="600">Email Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Notifications sent to your registered email address
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <SmsIcon color="success" sx={{ fontSize: '1.25rem' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="600">SMS Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Text messages sent to your phone number (if configured)
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <Settings color="info" />
                <Typography variant="h6" fontWeight="600">Categories</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Configure delivery preferences for different types of notifications:
                System updates, Event management, Task assignments, Payment processing,
                Client management, Contract updates, Workflow progress, and Communication alerts.
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <ScheduleIcon color="info" />
                <Typography variant="h6" fontWeight="600">Quiet Hours</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Set specific hours when you don't want to receive notifications.
                This applies to email and SMS only - urgent system notifications may still be delivered.
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <SummarizeIcon color="info" />
                <Typography variant="h6" fontWeight="600">Digest Mode</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Instead of immediate notifications, receive a summary of notifications
                at your preferred frequency (hourly, daily, or weekly).
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </ModernSettingsLayout>
  );
};
