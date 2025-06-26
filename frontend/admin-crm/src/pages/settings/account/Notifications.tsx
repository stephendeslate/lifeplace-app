// frontend/admin-crm/src/pages/settings/account/Notifications.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Button,
  Divider,
  Stack,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info,
  Refresh,
  BugReport,
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

export const Notifications: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const { user } = useAuth();
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const {
    preferences,
    isLoadingPreferences,
    updatePreferences,
    resetToDefaults,
    isUpdatingPreferences,
    isResettingPreferences,
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
      { label: 'Settings', path: '/settings' },
      { label: 'Account Management' },
      { label: 'Notifications', path: '/settings/account/notifications' },
    ]);
  }, [setBreadcrumbs]);

  const handleTestNotification = async () => {
    if (!user?.id) return;
    
    setIsTestingNotification(true);
    
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
      
      // Refresh counts after creating test notification
      setTimeout(() => {
        refetchCounts();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to send test notification:', error);
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleRefresh = () => {
    refetchPreferences();
    refetchCounts();
  };

  const isLoading = isLoadingPreferences || isLoadingTypes;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <NotificationsIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Notification Settings
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Configure how and when you receive notifications
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh notification data">
              <span>
                <IconButton
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <Refresh />
                </IconButton>
              </span>
            </Tooltip>
            
            <Button
              variant="outlined"
              startIcon={<BugReport />}
              onClick={handleTestNotification}
              disabled={isTestingNotification || isCreating || !preferences}
              size="small"
            >
              {isTestingNotification ? 'Sending...' : 'Test Notification'}
            </Button>
          </Stack>
        </Box>

        {/* Info Alert */}
        <Alert 
          severity="info" 
          icon={<Info />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            Notification preferences control how you receive system updates, event notifications, 
            and other important communications. Changes are saved automatically and take effect immediately.
          </Typography>
        </Alert>
      </Box>

      <Stack spacing={3}>
        {/* Current Notification Status */}
        {counts && (
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Current Notifications
                </Typography>
                
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={`${counts.total} Total`}
                    variant="outlined"
                    size="small"
                  />
                  {counts.unread > 0 && (
                    <Chip
                      label={`${counts.unread} Unread`}
                      color="warning"
                      size="small"
                    />
                  )}
                </Stack>
              </Box>
              
              <NotificationCountsDisplay
                counts={counts}
                isLoading={isLoadingCounts}
              />
            </CardContent>
          </Card>
        )}

        {/* Notification Types Overview */}
        {notificationTypes.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Available Notification Types
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Your system has {notificationTypes.length} different types of notifications configured.
              </Typography>
              
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                        borderColor: type.color || 'grey.300',
                        color: type.color || 'text.primary',
                      }}
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
            </CardContent>
          </Card>
        )}

        {/* Notification Preferences Form */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {preferences ? (
              <NotificationPreferencesForm
                preferences={preferences}
                isLoading={isLoading}
              />
            ) : isLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <Typography color="text.secondary">
                  Loading notification preferences...
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 3 }}>
                <Alert severity="error">
                  Failed to load notification preferences. Please try refreshing the page.
                </Alert>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              How Notifications Work
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Delivery Methods
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • <strong>In-App:</strong> Notifications appear in your dashboard and notification center<br/>
                  • <strong>Email:</strong> Notifications sent to your registered email address<br/>
                  • <strong>SMS:</strong> Text messages sent to your phone number (if configured)
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Categories
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure delivery preferences for different types of notifications:
                  System updates, Event management, Task assignments, Payment processing, 
                  Client management, Contract updates, Workflow progress, and Communication alerts.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Quiet Hours
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Set specific hours when you don't want to receive notifications. 
                  This applies to email and SMS only - urgent system notifications may still be delivered.
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                  Digest Mode
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Instead of immediate notifications, receive a summary of notifications 
                  at your preferred frequency (hourly, daily, or weekly).
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};