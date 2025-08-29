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
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, createRefreshAction } from '../../../components/common/ModernPageHeader';
import ModernLoadingStates from '../../../components/common/ModernLoadingStates';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

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
          glass
        />
      </ModernSettingsLayout>
    );
  }

  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
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
        gradient
        glass
      />

      {/* Test Result Alert */}
      {testResult && (
        <Box sx={{ mb: 4 }}>
          <ModernCard
            variant="glass"
            color={testResult.success ? 'success' : 'error'}
            size="small"
            animation="none"
          >
            <Alert 
              severity={testResult.success ? 'success' : 'error'}
              icon={testResult.success ? <CheckCircle /> : <Warning />}
              onClose={() => setTestResult(null)}
              sx={{
                backgroundColor: 'transparent',
                border: 'none',
                '& .MuiAlert-message': {
                  color: testResult.success ? tokens.color.success[700] : tokens.color.error[700],
                },
              }}
            >
              {testResult.message}
            </Alert>
          </ModernCard>
        </Box>
      )}

      {/* Info Alert */}
      <Box sx={{ mb: 4 }}>
        <ModernCard
          variant="glass"
          color="primary"
          size="small"
          animation="none"
        >
          <Alert 
            severity="info" 
            icon={<Info />}
            sx={{
              backgroundColor: 'transparent',
              border: 'none',
              '& .MuiAlert-message': {
                color: tokens.color.info[700],
              },
            }}
          >
            <Typography variant="body2">
              Notification preferences control how you receive system updates, event notifications, 
              and other important communications. Changes are saved automatically and take effect immediately.
            </Typography>
          </Alert>
        </ModernCard>
      </Box>

      <Stack spacing={4}>
        {/* Current Notification Status */}
        {counts && (
          <ModernCard
            variant="glass"
            size="large"
            color="primary"
            animation="none"
            title="Current Notifications"
            subtitle="Overview of your notification activity and status"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.primary[600]}03 100%)`,
              },
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: tokens.spacing.radius.lg,
                    background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
                    border: `1px solid ${tokens.color.primary[500]}20`,
                  }}
                >
                  <NotificationsIcon sx={{ color: tokens.color.primary[600], fontSize: '1.25rem' }} />
                </Box>
                <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>
                  Activity Overview
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={2}>
                <Chip
                  label={`${counts.total} Total`}
                  variant="outlined"
                  size="small"
                  sx={{
                    ...glassPresets.light,
                    border: `1px solid ${tokens.color.neutral[300]}`,
                    fontWeight: 600,
                  }}
                />
                {counts.unread > 0 && (
                  <Chip
                    label={`${counts.unread} Unread`}
                    color="warning"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      background: `linear-gradient(135deg, ${tokens.color.warning[500]} 0%, ${tokens.color.warning[600]} 100%)`,
                      color: 'white',
                    }}
                  />
                )}
              </Stack>
            </Box>
            
            <NotificationCountsDisplay
              counts={counts}
              isLoading={isLoadingCounts}
            />
          </ModernCard>
        )}

        {/* Notification Types Overview */}
        {notificationTypes.length > 0 && (
          <ModernCard
            variant="glass"
            size="large"
            color="secondary"
            animation="none"
            title="Available Notification Types"
            subtitle={`Your system has ${notificationTypes.length} different types of notifications configured`}
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.secondary[500]}04 0%, ${tokens.color.secondary[600]}03 100%)`,
              },
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: tokens.spacing.radius.lg,
                  background: `linear-gradient(135deg, ${tokens.color.secondary[500]}15 0%, ${tokens.color.secondary[600]}10 100%)`,
                  border: `1px solid ${tokens.color.secondary[500]}20`,
                }}
              >
                <Settings sx={{ color: tokens.color.secondary[600], fontSize: '1.25rem' }} />
              </Box>
              <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>
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
                    sx={{
                      mb: 1,
                      ...glassPresets.light,
                      border: `1px solid ${type.color || tokens.color.neutral[300]}30`,
                      color: type.color || tokens.color.neutral[700],
                      fontWeight: 500,
                      '&:hover': {
                        ...glassPresets.medium,
                      },
                    }}
                  />
                ))}
              {notificationTypes.length > 8 && (
                <Chip
                  label={`+${notificationTypes.length - 8} more`}
                  variant="outlined"
                  size="small"
                  sx={{
                    mb: 1,
                    ...glassPresets.light,
                    border: `1px solid ${tokens.color.neutral[300]}`,
                    fontWeight: 600,
                  }}
                />
              )}
            </Stack>
          </ModernCard>
        )}

        {/* Notification Preferences Form */}
        <ModernCard
          variant="glass"
          size="large"
          color="default"
          animation="none"
          title="Notification Preferences"
          subtitle="Customize your notification delivery settings and preferences"
        >
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
            <Alert 
              severity="error"
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.lg,
                border: `1px solid ${tokens.color.error[300]}30`,
                '& .MuiAlert-message': {
                  color: tokens.color.error[700],
                },
              }}
            >
              Failed to load notification preferences. Please try refreshing the page.
            </Alert>
          )}
        </ModernCard>

        {/* Additional Information */}
        <ModernCard
          variant="glass"
          size="large"
          color="default"
          animation="none"
          title="How Notifications Work"
          subtitle="Learn about notification delivery methods, categories, and customization options"
        >
          <Stack spacing={4}>
            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <NotificationsIcon sx={{ color: tokens.color.info[600] }} />
                <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>
                  Delivery Methods
                </Typography>
              </Box>
              
              <ModernCard
                variant="glass"
                size="small"
                color="default"
                animation="none"
                borderRadius="lg"
              >
                <Stack spacing={3}>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: tokens.spacing.radius.md,
                        background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
                        border: `1px solid ${tokens.color.primary[500]}20`,
                      }}
                    >
                      <NotificationsIcon sx={{ color: tokens.color.primary[600], fontSize: '1rem' }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>In-App Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Notifications appear in your dashboard and notification center
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: tokens.spacing.radius.md,
                        background: `linear-gradient(135deg, ${tokens.color.warning[500]}15 0%, ${tokens.color.warning[600]}10 100%)`,
                        border: `1px solid ${tokens.color.warning[500]}20`,
                      }}
                    >
                      <EmailIcon sx={{ color: tokens.color.warning[600], fontSize: '1rem' }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>Email Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Notifications sent to your registered email address
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: tokens.spacing.radius.md,
                        background: `linear-gradient(135deg, ${tokens.color.success[500]}15 0%, ${tokens.color.success[600]}10 100%)`,
                        border: `1px solid ${tokens.color.success[500]}20`,
                      }}
                    >
                      <SmsIcon sx={{ color: tokens.color.success[600], fontSize: '1rem' }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>SMS Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Text messages sent to your phone number (if configured)
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </ModernCard>
            </Box>

            <Divider sx={{ borderColor: tokens.color.borders.glass }} />

            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <Settings sx={{ color: tokens.color.info[600] }} />
                <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>Categories</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Configure delivery preferences for different types of notifications:
                System updates, Event management, Task assignments, Payment processing, 
                Client management, Contract updates, Workflow progress, and Communication alerts.
              </Typography>
            </Box>

            <Divider sx={{ borderColor: tokens.color.borders.glass }} />

            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <ScheduleIcon sx={{ color: tokens.color.info[600] }} />
                <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>Quiet Hours</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Set specific hours when you don't want to receive notifications. 
                This applies to email and SMS only - urgent system notifications may still be delivered.
              </Typography>
            </Box>

            <Divider sx={{ borderColor: tokens.color.borders.glass }} />

            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <SummarizeIcon sx={{ color: tokens.color.info[600] }} />
                <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>Digest Mode</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Instead of immediate notifications, receive a summary of notifications 
                at your preferred frequency (hourly, daily, or weekly).
              </Typography>
            </Box>
          </Stack>
        </ModernCard>
      </Stack>
    </ModernSettingsLayout>
  );
};