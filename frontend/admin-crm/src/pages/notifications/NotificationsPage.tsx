// frontend/admin-crm/src/pages/notifications/NotificationsPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
  Stack,
  Alert,
  CircularProgress,
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
import { tokens } from '../../design-system';
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
      {value === index && <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>}
    </div>
  );
};

// Custom Header without glass effects
interface NotificationsHeaderProps {
  title: string;
  subtitle: string;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  isLoading: boolean;
  isMarkingAllAsRead: boolean;
  showMarkAllRead: boolean;
}

const NotificationsHeader: React.FC<NotificationsHeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  onMarkAllRead,
  isLoading,
  isMarkingAllAsRead,
  showMarkAllRead,
}) => (
  <Box
    sx={{
      mb: 4,
      p: 3,
      borderRadius: tokens.spacing.radius.md,
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
    <Box
      display="flex"
      flexDirection={{ xs: 'column', lg: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', lg: 'flex-start' }}
      gap={{ xs: 3, lg: 4 }}
    >
      <Box display="flex" alignItems="flex-start" gap={2} flex={1}>
        <NotificationsIcon color="primary" sx={{ fontSize: 32, mt: 0.5 }} />
        <Box flex={1} minWidth={0}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={2}
        sx={{
          flexWrap: { xs: 'wrap', lg: 'nowrap' },
          justifyContent: { xs: 'flex-start', lg: 'flex-end' },
        }}
      >
        <IconButton onClick={onRefresh} disabled={isLoading}>
          <Refresh />
        </IconButton>

        {showMarkAllRead && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<MarkEmailRead />}
            onClick={onMarkAllRead}
            disabled={isMarkingAllAsRead}
          >
            Mark All Read
          </Button>
        )}
      </Stack>
    </Box>
  </Box>
);

export const NotificationsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { setBreadcrumbs } = useLayout();

  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<NotificationFilters>({});

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: 'Notifications' }]);
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

  // Tab change handler
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
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

  // Empty state for no notifications
  const renderNoNotificationsState = () => (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 4,
      }}
    >
      <NotificationsIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        No Notifications Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        You're all caught up! When you have new notifications, they'll appear here. You can
        customize how you receive notifications in the preferences tab.
      </Typography>
      <Button variant="contained" startIcon={<SettingsIcon />} onClick={() => setActiveTab(1)}>
        Configure Preferences
      </Button>
    </Box>
  );

  // Loading state for preferences
  const renderPreferencesLoading = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
        Loading preferences...
      </Typography>
    </Box>
  );

  // List loading skeleton
  const renderListLoading = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
        Loading notifications...
      </Typography>
    </Box>
  );

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== '',
  );
  const notificationCount = Array.isArray(notifications) ? notifications.length : 0;
  const showMarkAllRead = activeTab === 0 && (counts?.unread ?? 0) > 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <NotificationsHeader
        title="Notifications"
        subtitle={`${notificationCount} notification${notificationCount !== 1 ? 's' : ''} found${counts?.unread ? ` - ${counts.unread} unread` : ''}`}
        onRefresh={handleRefresh}
        onMarkAllRead={handleMarkAllAsRead}
        isLoading={isLoadingNotifications}
        isMarkingAllAsRead={isMarkingAllAsRead}
        showMarkAllRead={showMarkAllRead}
      />

      {/* Notification Counts Overview */}
      {counts && (
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: tokens.spacing.radius.md,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <NotificationCountsDisplay counts={counts} isLoading={isLoadingCounts} />
          </Box>
        </Box>
      )}

      {/* Notification Status Alerts */}
      {preferences && !preferences.in_app_enabled && (
        <Box sx={{ mb: 4 }}>
          <Alert
            severity="warning"
            icon={<NotificationsOff />}
            action={
              <Button color="inherit" size="small" onClick={() => setActiveTab(1)}>
                Enable
              </Button>
            }
          >
            In-app notifications are currently disabled. Enable them in preferences to receive
            notifications here.
          </Alert>
        </Box>
      )}

      {/* Main Content Card */}
      <Box
        sx={{
          borderRadius: tokens.spacing.radius.md,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Tab System */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="notifications tabs"
            variant={isMobile ? 'fullWidth' : 'standard'}
          >
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1.5}>
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
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1.5}>
                  <SettingsIcon fontSize="small" />
                  <span>Preferences</span>
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 3, position: 'relative' }}>
          {/* Notifications Tab */}
          <TabPanel value={activeTab} index={0}>
            {notificationCount === 0 && !hasActiveFilters ? (
              renderNoNotificationsState()
            ) : isLoadingNotifications ? (
              renderListLoading()
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
            {isLoadingPreferences ? (
              renderPreferencesLoading()
            ) : preferences ? (
              <NotificationPreferencesForm
                preferences={preferences}
                isLoading={isLoadingPreferences}
              />
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <SettingsIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Unable to Load Preferences
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  There was an issue loading your notification preferences. Please try refreshing
                  the page.
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Refresh />}
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </Box>
            )}
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};
