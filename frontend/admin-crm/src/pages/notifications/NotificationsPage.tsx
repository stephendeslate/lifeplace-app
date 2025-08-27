// frontend/admin-crm/src/pages/notifications/NotificationsPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
  Stack,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  MarkEmailRead,
  Refresh,
  NotificationsActive,
  NotificationsOff,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications, useNotificationPreferences } from '../../hooks/useNotifications';
import { useNotificationRealtime } from '../../hooks/useNotificationRealtime';
import { NotificationList } from '../../components/notifications/NotificationList';
import { NotificationPreferencesForm } from '../../components/notifications/NotificationPreferencesForm';
import { NotificationCountsDisplay } from '../../components/notifications/NotificationCountsDisplay';
import type { NotificationFilters } from '../../types/notifications.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

export const NotificationsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setBreadcrumbs } = useLayout();
  
  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<NotificationFilters>({});

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Notifications' },
    ]);
  }, [setBreadcrumbs]);

  // Hooks
  const {
    notifications,
    isLoadingNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    bulkAction,
    deleteNotification,
    refetchNotifications,
    useNotificationCounts,
    isMarkingAllAsRead,
    isPerformingBulkAction,
    isDeleting,
  } = useNotifications(filters);

  const { preferences, isLoadingPreferences } = useNotificationPreferences();
  const { data: counts, isLoading: isLoadingCounts } = useNotificationCounts();
  
  // Enable real-time notifications
  useNotificationRealtime({ enabled: true });

  // @ts-ignore
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFilterChange = (newFilters: NotificationFilters) => {
    setFilters(newFilters);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleRefresh = () => {
    refetchNotifications();
  };

  // Empty state when no notifications exist
  const renderNoNotificationsState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 6, 
        textAlign: 'center',
        bgcolor: 'grey.50',
        border: '2px dashed',
        borderColor: 'grey.300'
      }}
    >
      <NotificationsIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        No Notifications Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
        You're all caught up! When you have new notifications, they'll appear here. 
        You can customize how you receive notifications in the preferences tab.
      </Typography>
      
      <Button
        variant="outlined"
        startIcon={<SettingsIcon />}
        onClick={() => setActiveTab(1)}
        size="large"
      >
        Configure Preferences
      </Button>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="body2" color="text.secondary">
        💡 <strong>Tip:</strong> Set up notification preferences to control how you receive updates
      </Typography>
    </Paper>
  );

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  const notificationCount = Array.isArray(notifications) ? notifications.length : 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {notificationCount} notification{notificationCount !== 1 ? 's' : ''} found
            {counts?.unread ? ` • ${counts.unread} unread` : ''}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <IconButton
            onClick={handleRefresh}
            disabled={isLoadingNotifications}
            color="primary"
            sx={{ 
              bgcolor: 'primary.50',
              '&:hover': { bgcolor: 'primary.100' }
            }}
          >
            <Refresh />
          </IconButton>
          
          {activeTab === 0 && ((counts?.unread ?? 0) > 0) && (
            <Button
              variant="contained"
              startIcon={<MarkEmailRead />}
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </Stack>
      </Box>

      {/* Notification Counts Overview */}
      {counts && (
        <Box sx={{ mb: 3 }}>
          <NotificationCountsDisplay
            counts={counts}
            isLoading={isLoadingCounts}
          />
        </Box>
      )}

      {/* Notification Status Alerts */}
      {preferences && !preferences.in_app_enabled && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          icon={<NotificationsOff />}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => setActiveTab(1)}
            >
              Enable
            </Button>
          }
        >
          In-app notifications are currently disabled. Enable them in preferences to receive notifications here.
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="notifications tabs"
            variant={isMobile ? 'fullWidth' : 'standard'}
          >
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <NotificationsActive fontSize="small" />
                  <span>Notifications</span>
                  {(counts?.unread ?? 0) > 0 && (
                    <Chip
                      label={counts?.unread ?? 0}
                      size="small"
                      color="error"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
              }
              iconPosition="start"
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <SettingsIcon fontSize="small" />
                  <span>Preferences</span>
                </Box>
              }
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* Notifications Tab */}
          <TabPanel value={activeTab} index={0}>
            {notificationCount === 0 && !hasActiveFilters ? (
              renderNoNotificationsState()
            ) : (
              <NotificationList
                notifications={notifications}
                isLoading={isLoadingNotifications}
                onMarkRead={markAsRead}
                onMarkUnread={markAsUnread}
                onDelete={deleteNotification}
                onBulkAction={bulkAction}
                onFilterChange={handleFilterChange}
                filters={filters}
                isPerformingAction={isPerformingBulkAction || isDeleting}
              />
            )}
          </TabPanel>

          {/* Preferences Tab */}
          <TabPanel value={activeTab} index={1}>
            {preferences ? (
              <NotificationPreferencesForm
                preferences={preferences}
                isLoading={isLoadingPreferences}
              />
            ) : (
              <Box display="flex" justifyContent="center" py={4}>
                <Typography color="text.secondary">
                  Loading preferences...
                </Typography>
              </Box>
            )}
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};