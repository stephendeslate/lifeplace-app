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
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  MarkEmailRead,
  Delete,
  Refresh,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useNotifications, useNotificationPreferences } from '../../hooks/useNotifications';
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
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
      { label: 'Notifications', path: '/notifications' },
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

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <NotificationsIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Notifications
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Manage your notifications and preferences
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              onClick={handleRefresh}
              disabled={isLoadingNotifications}
              title="Refresh notifications"
            >
              <Refresh />
            </IconButton>
            
            {activeTab === 0 && (
              <Button
                variant="outlined"
                startIcon={<MarkEmailRead />}
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllAsRead || !counts?.unread}
                size={isMobile ? 'small' : 'medium'}
              >
                Mark All Read
              </Button>
            )}
          </Box>
        </Box>

        {/* Notification Counts */}
        {counts && (
          <NotificationCountsDisplay
            counts={counts}
            isLoading={isLoadingCounts}
          />
        )}
      </Box>

      {/* Tabs */}
      <Card elevation={2}>
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
                  <NotificationsIcon fontSize="small" />
                  <span>Notifications</span>
                  {(counts?.unread ?? 0) > 0 && (
                    <Chip
                      label={counts?.unread ?? 0}
                      size="small"
                      color="primary"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  )}
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <SettingsIcon fontSize="small" />
                  <span>Preferences</span>
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
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
        </TabPanel>

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
      </Card>
    </Box>
  );
};