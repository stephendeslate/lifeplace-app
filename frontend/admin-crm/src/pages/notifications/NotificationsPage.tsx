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

// Modern Design System imports
import { ModernPageLayout } from '../../components/common/ModernPageLayout';
import { ModernCard } from '../../components/common/ModernCard';
import { ModernEmptyState } from '../../components/common/ModernEmptyState';
import ModernLoadingStates from '../../components/common/ModernLoadingStates';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

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

// Custom Modern Header without animations
interface ModernNotificationsHeaderProps {
  title: string;
  subtitle: string;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  isLoading: boolean;
  isMarkingAllAsRead: boolean;
  showMarkAllRead: boolean;
}

const ModernNotificationsHeader: React.FC<ModernNotificationsHeaderProps> = ({
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
      ...glassPresets.light,
      border: `1px solid ${tokens.color.borders.glass}`,
      borderRadius: tokens.spacing.radius.xxl,
      p: { xs: 3, md: 4 },
      position: 'relative',
      overflow: 'visible',
      
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(135deg, ${tokens.color.primary[500]}06 0%, ${tokens.color.success[500]}06 100%)`,
        borderRadius: tokens.spacing.radius.xxl,
        pointerEvents: 'none',
      }
    }}
  >
    <Box 
      display="flex" 
      flexDirection={{ xs: 'column', lg: 'row' }}
      justifyContent="space-between" 
      alignItems={{ xs: 'stretch', lg: 'flex-start' }}
      gap={{ xs: 3, lg: 4 }}
      sx={{ position: 'relative', zIndex: 1 }}
    >
      <Box display="flex" alignItems="flex-start" gap={3} flex={1}>
        {/* Icon */}
        <Box
          sx={{
            ...glassPresets.medium,
            borderRadius: tokens.spacing.radius.full,
            p: 2,
            background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
            border: `1px solid ${tokens.color.primary[500]}30`,
            flexShrink: 0,
          }}
        >
          <NotificationsIcon 
            sx={{ 
              fontSize: 28, 
              color: tokens.color.primary[600] 
            }} 
          />
        </Box>

        {/* Title and Subtitle */}
        <Box flex={1} minWidth={0}>
          <Typography 
            variant="h3"
            component="h1" 
            sx={{ 
              fontWeight: 700,
              background: tokens.color.backgrounds.primaryGradient,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              lineHeight: 1.2,
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography 
            variant="body1"
            sx={{ 
              color: tokens.color.neutral[600],
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Box>

      {/* Actions */}
      <Stack 
        direction={{ xs: 'row', lg: 'row' }} 
        spacing={2} 
        sx={{ 
          flexWrap: { xs: 'wrap', lg: 'nowrap' },
          justifyContent: { xs: 'flex-start', lg: 'flex-end' },
        }}
      >
        <IconButton
          onClick={onRefresh}
          disabled={isLoading}
          sx={{
            ...glassPresets.light,
            width: 44,
            height: 44,
            color: tokens.color.neutral[600],
            border: `1px solid ${tokens.color.neutral[400]}30`,
            borderRadius: tokens.spacing.radius.full,
            transition: createTransition(['transform', 'background', 'box-shadow'], 'fast'),
            
            '&:hover': {
              ...glassPresets.medium,
              color: tokens.color.neutral[700],
              transform: 'translateY(-1px)',
            }
          }}
        >
          <Refresh />
        </IconButton>
        
        {showMarkAllRead && (
          <Button
            variant="contained"
            startIcon={<MarkEmailRead />}
            onClick={onMarkAllRead}
            disabled={isMarkingAllAsRead}
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
              borderRadius: tokens.spacing.radius.full,
              fontWeight: 600,
              px: 4,
              py: 1.25,
              boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
              transition: createTransition(['transform', 'box-shadow'], 'fast'),
              
              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                transform: 'translateY(-2px)',
                boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
              }
            }}
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

  // Modern empty state for no notifications
  const renderNoNotificationsState = () => (
    <ModernEmptyState
      icon={NotificationsIcon}
      title="No Notifications Yet"
      description="You're all caught up! When you have new notifications, they'll appear here. You can customize how you receive notifications in the preferences tab."
      primaryAction={{
        label: "Configure Preferences",
        onClick: () => setActiveTab(1),
        icon: <SettingsIcon />,
        color: "primary",
      }}
      tip={{
        text: "Set up notification preferences to control how you receive updates",
        type: "info",
      }}
      size="medium"
      illustration="gradient"
    />
  );

  // Modern empty state for preferences loading
  const renderPreferencesLoading = () => (
    <ModernLoadingStates.ModernLoadingSpinner
      size={40}
      message="Loading preferences..."
      variant="circular"
      glass
    />
  );

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  const notificationCount = Array.isArray(notifications) ? notifications.length : 0;
  const showMarkAllRead = activeTab === 0 && ((counts?.unread ?? 0) > 0);

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Header */}
      <ModernNotificationsHeader
        title="Notifications"
        subtitle={`${notificationCount} notification${notificationCount !== 1 ? 's' : ''} found${counts?.unread ? ` • ${counts.unread} unread` : ''}`}
        onRefresh={handleRefresh}
        onMarkAllRead={handleMarkAllAsRead}
        isLoading={isLoadingNotifications}
        isMarkingAllAsRead={isMarkingAllAsRead}
        showMarkAllRead={showMarkAllRead}
      />

      {/* Modern Notification Counts Overview */}
      {counts && (
        <Box sx={{ mb: 4 }}>
          <ModernCard
            variant="glass"
            size="small"
            color="primary"
            animation="none"
          >
            <NotificationCountsDisplay
              counts={counts}
              isLoading={isLoadingCounts}
            />
          </ModernCard>
        </Box>
      )}

      {/* Modern Notification Status Alerts */}
      {preferences && !preferences.in_app_enabled && (
        <Box sx={{ mb: 4 }}>
          <ModernCard
            variant="glass"
            color="warning"
            size="small"
            animation="none"
          >
            <Alert 
              severity="warning" 
              icon={<NotificationsOff />}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={() => setActiveTab(1)}
                  sx={{
                    borderRadius: tokens.spacing.radius.full,
                    fontWeight: 600,
                  }}
                >
                  Enable
                </Button>
              }
              sx={{
                backgroundColor: 'transparent',
                border: 'none',
                '& .MuiAlert-message': {
                  color: tokens.color.warning[700],
                },
              }}
            >
              In-app notifications are currently disabled. Enable them in preferences to receive notifications here.
            </Alert>
          </ModernCard>
        </Box>
      )}

      {/* Modern Main Content Card */}
      <ModernCard
        variant="glass"
        size="medium"
        animation="none"
        sx={{
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Modern Tab System */}
        <Box 
          sx={{ 
            borderBottom: `1px solid ${tokens.color.borders.glass}`,
            position: 'relative',
            ...glassPresets.light,
            borderRadius: `${tokens.spacing.radius.xxl} ${tokens.spacing.radius.xxl} 0 0`,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="notifications tabs"
            variant={isMobile ? 'fullWidth' : 'standard'}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: tokens.color.primary[500],
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: `${tokens.spacing.radius.lg} ${tokens.spacing.radius.lg} 0 0`,
                transition: createTransition(['background', 'color'], 'fast'),
                
                '&:hover': {
                  backgroundColor: `${tokens.color.primary[500]}08`,
                },
                
                '&.Mui-selected': {
                  backgroundColor: `${tokens.color.primary[500]}12`,
                  color: tokens.color.primary[700],
                },
              },
            }}
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
                      sx={{ 
                        height: 20, 
                        fontSize: '0.75rem',
                        background: `linear-gradient(135deg, ${tokens.color.error[500]} 0%, ${tokens.color.error[600]} 100%)`,
                        color: 'white',
                        fontWeight: 600,
                      }}
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
              <ModernLoadingStates.ModernListSkeleton 
                items={5}
                showAvatar
                showSecondaryText
              />
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
              <ModernEmptyState
                icon={SettingsIcon}
                title="Unable to Load Preferences"
                description="There was an issue loading your notification preferences. Please try refreshing the page."
                variant="error"
                primaryAction={{
                  label: "Refresh Page",
                  onClick: () => window.location.reload(),
                  icon: <Refresh />,
                  color: "error",
                }}
                size="small"
              />
            )}
          </TabPanel>
        </Box>
      </ModernCard>
    </ModernPageLayout>
  );
};