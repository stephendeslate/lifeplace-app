// frontend/client-portal/src/pages/notifications/NotificationsPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Stack,
  Chip,
  IconButton,
  Button,
  MenuItem,
  TextField,
  Avatar,
  Divider,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Assignment as TaskIcon,
  Person as PersonIcon,
  Description as ContractIcon,
  AccountTree as WorkflowIcon,
  Campaign as CampaignIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  MarkEmailRead as MarkReadIcon,
  MarkEmailUnread as MarkUnreadIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Close as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationRealtime } from '../../hooks/useNotificationRealtime';
import { NotificationPreferencesDialog } from '../../components/notifications/NotificationPreferencesDialog';
import type {
  Notification,
  NotificationCategory,
  NotificationPriority,
  NotificationFilters,
} from '../../types/notifications.types';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PRIORITIES } from '../../types/notifications.types';

// Category icon mapping
const getCategoryIcon = (category?: NotificationCategory) => {
  switch (category) {
    case 'EVENT':
      return <EventIcon fontSize="small" />;
    case 'PAYMENT':
      return <PaymentIcon fontSize="small" />;
    case 'COMMUNICATION':
      return <MessageIcon fontSize="small" />;
    case 'SYSTEM':
      return <SettingsIcon fontSize="small" />;
    case 'TASK':
      return <TaskIcon fontSize="small" />;
    case 'CLIENT':
      return <PersonIcon fontSize="small" />;
    case 'CONTRACT':
      return <ContractIcon fontSize="small" />;
    case 'WORKFLOW':
      return <WorkflowIcon fontSize="small" />;
    case 'MARKETING':
      return <CampaignIcon fontSize="small" />;
    default:
      return <NotificationsIcon fontSize="small" />;
  }
};

// Category color mapping
const getCategoryColor = (theme: ReturnType<typeof useTheme>, category?: NotificationCategory) => {
  switch (category) {
    case 'EVENT':
      return theme.palette.primary.main;
    case 'PAYMENT':
      return theme.palette.success.main;
    case 'COMMUNICATION':
      return theme.palette.info.main;
    case 'SYSTEM':
      return theme.palette.grey[600];
    case 'TASK':
      return theme.palette.secondary.main;
    case 'CLIENT':
      return theme.palette.info.dark;
    case 'CONTRACT':
      return theme.palette.warning.main;
    case 'WORKFLOW':
      return theme.palette.primary.dark;
    case 'MARKETING':
      return theme.palette.secondary.light;
    default:
      return theme.palette.primary.main;
  }
};

// Priority icon mapping
const getPriorityIcon = (priority?: NotificationPriority) => {
  switch (priority) {
    case 'URGENT':
      return <WarningIcon fontSize="small" color="error" />;
    case 'HIGH':
      return <WarningIcon fontSize="small" color="warning" />;
    case 'NORMAL':
      return <InfoIcon fontSize="small" color="info" />;
    case 'LOW':
      return <SuccessIcon fontSize="small" color="success" />;
    default:
      return <InfoIcon fontSize="small" />;
  }
};

export const NotificationsPage: React.FC = () => {
  useDocumentTitle('Notifications | LifePlace Alfonso');
  const theme = useTheme();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<NotificationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const {
    useNotificationsList,
    useNotificationCounts,
    useMarkAsRead,
    useMarkAsUnread,
    useMarkAllAsRead,
    useDeleteNotification,
  } = useNotifications();

  const { data: notifications = [], isLoading } = useNotificationsList(filters);
  const { data: counts } = useNotificationCounts();
  const markAsReadMutation = useMarkAsRead();
  const markAsUnreadMutation = useMarkAsUnread();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();

  useNotificationRealtime({ enabled: true });

  const unreadCount = counts?.unread ?? 0;
  const hasActiveFilters =
    filters.is_read !== undefined ||
    filters.category !== undefined ||
    filters.priority !== undefined;

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        navigate(notification.action_url);
      }
    }
  };

  return (
    <>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <AnimatedElement animation="fadeIn" delay={100}>
          <Box
            sx={{
              mb: 4,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', md: 'flex-start' },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                Notifications
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  : "You're all caught up!"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {unreadCount > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={
                    markAllAsReadMutation.isPending ? (
                      <CircularProgress size={14} />
                    ) : (
                      <MarkReadIcon />
                    )
                  }
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  Mark All Read
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                color={hasActiveFilters ? 'primary' : 'inherit'}
              >
                Filters
                {hasActiveFilters && (
                  <Chip label="Active" size="small" color="primary" sx={{ ml: 1, height: 20 }} />
                )}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setPreferencesOpen(true)}
              >
                Preferences
              </Button>
            </Stack>
          </Box>
        </AnimatedElement>

        {/* Counts Summary */}
        {counts && (
          <AnimatedElement animation="fadeIn" delay={150}>
            <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
              <Chip label={`${counts.total} Total`} size="small" variant="outlined" />
              {counts.unread > 0 && (
                <Chip label={`${counts.unread} Unread`} size="small" color="error" />
              )}
              {Object.entries(counts.by_category || {}).map(
                ([cat, count]) =>
                  count > 0 && (
                    <Chip
                      key={cat}
                      label={`${NOTIFICATION_CATEGORIES.find((c) => c.value === cat)?.label ?? cat}: ${count}`}
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          category: cat as NotificationCategory,
                        }))
                      }
                      sx={{
                        cursor: 'pointer',
                        borderColor: filters.category === cat ? 'primary.main' : undefined,
                        bgcolor:
                          filters.category === cat
                            ? alpha(theme.palette.primary.main, 0.08)
                            : undefined,
                      }}
                    />
                  ),
              )}
            </Stack>
          </AnimatedElement>
        )}

        {/* Filters */}
        {showFilters && (
          <AnimatedElement animation="slideDown" delay={0}>
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <TextField
                  select
                  size="small"
                  label="Status"
                  value={filters.is_read === undefined ? '' : filters.is_read ? 'read' : 'unread'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      is_read: val === '' ? undefined : val === 'read' ? true : false,
                    }));
                  }}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="unread">Unread</MenuItem>
                  <MenuItem value="read">Read</MenuItem>
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Category"
                  value={filters.category ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: (e.target.value as NotificationCategory) || undefined,
                    }))
                  }
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {NOTIFICATION_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  size="small"
                  label="Priority"
                  value={filters.priority ?? ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      priority: (e.target.value as NotificationPriority) || undefined,
                    }))
                  }
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  {NOTIFICATION_PRIORITIES.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </TextField>

                {hasActiveFilters && (
                  <Button size="small" startIcon={<ClearIcon />} onClick={handleClearFilters}>
                    Clear
                  </Button>
                )}
              </Stack>
            </Box>
          </AnimatedElement>
        )}

        {/* Notification List */}
        <AnimatedElement animation="slideUp" delay={200}>
          <Box
            sx={{
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            {isLoading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  py: 8,
                }}
              >
                <CircularProgress size={40} />
                <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
                  Loading notifications...
                </Typography>
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 4 }}>
                <NotificationsIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {hasActiveFilters
                    ? 'No notifications match your filters'
                    : 'No Notifications Yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more results.'
                    : "We'll notify you when something important happens with your events, payments, or contracts."}
                </Typography>
                {hasActiveFilters && (
                  <Button variant="outlined" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                )}
              </Box>
            ) : (
              <Stack divider={<Divider />}>
                {notifications.map((notification, index) => {
                  const category = notification.notification_type_details?.category;
                  const priority = notification.notification_type_details?.priority;
                  const categoryColor = getCategoryColor(theme, category);

                  return (
                    <AnimatedElement key={notification.id} animation="fadeIn" delay={index * 30}>
                      <Box
                        sx={{
                          p: { xs: 2, md: 3 },
                          bgcolor: notification.is_read
                            ? 'transparent'
                            : alpha(categoryColor, 0.04),
                          '&:hover': {
                            bgcolor: alpha(theme.palette.action.hover, 0.04),
                          },
                          transition: 'background-color 0.2s ease',
                          position: 'relative',
                          cursor: notification.action_url ? 'pointer' : 'default',
                        }}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 3,
                              bgcolor: categoryColor,
                            }}
                          />
                        )}

                        <Box display="flex" gap={2}>
                          {/* Icon */}
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: alpha(categoryColor, 0.12),
                              color: categoryColor,
                              flexShrink: 0,
                            }}
                          >
                            {getCategoryIcon(category)}
                          </Avatar>

                          {/* Content */}
                          <Box flex={1} minWidth={0}>
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              alignItems="flex-start"
                              mb={0.5}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: notification.is_read ? 400 : 600,
                                  color: notification.is_read ? 'text.secondary' : 'text.primary',
                                }}
                              >
                                {notification.title}
                              </Typography>
                              <Box
                                display="flex"
                                alignItems="center"
                                gap={0.5}
                                flexShrink={0}
                                ml={1}
                              >
                                {getPriorityIcon(priority)}
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {notification.time_since_created}
                                </Typography>
                              </Box>
                            </Box>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1.5, lineHeight: 1.5 }}
                            >
                              {notification.content}
                            </Typography>

                            {/* Metadata chips */}
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              flexWrap="wrap"
                              gap={1}
                            >
                              <Box display="flex" gap={1} flexWrap="wrap">
                                {notification.event_name && (
                                  <Chip
                                    label={notification.event_name}
                                    size="small"
                                    variant="outlined"
                                    icon={<EventIcon />}
                                  />
                                )}
                                {category && (
                                  <Chip
                                    label={notification.notification_type_details?.name || category}
                                    size="small"
                                    sx={{
                                      bgcolor: alpha(categoryColor, 0.08),
                                      color: categoryColor,
                                      border: `1px solid ${alpha(categoryColor, 0.2)}`,
                                    }}
                                  />
                                )}
                              </Box>

                              {/* Actions */}
                              <Box display="flex" gap={0.5} onClick={(e) => e.stopPropagation()}>
                                {notification.is_read ? (
                                  <IconButton
                                    size="small"
                                    onClick={() => markAsUnreadMutation.mutate(notification.id)}
                                    disabled={markAsUnreadMutation.isPending}
                                    title="Mark as unread"
                                  >
                                    <MarkUnreadIcon fontSize="small" />
                                  </IconButton>
                                ) : (
                                  <IconButton
                                    size="small"
                                    onClick={() => markAsReadMutation.mutate(notification.id)}
                                    disabled={markAsReadMutation.isPending}
                                    title="Mark as read"
                                  >
                                    <MarkReadIcon fontSize="small" />
                                  </IconButton>
                                )}
                                <IconButton
                                  size="small"
                                  onClick={() => deleteMutation.mutate(notification.id)}
                                  disabled={deleteMutation.isPending}
                                  title="Delete"
                                  sx={{
                                    '&:hover': {
                                      color: 'error.main',
                                    },
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    </AnimatedElement>
                  );
                })}
              </Stack>
            )}
          </Box>
        </AnimatedElement>
      </Container>

      <NotificationPreferencesDialog
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </>
  );
};

export default NotificationsPage;
