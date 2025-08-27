// frontend/admin-crm/src/components/notifications/NotificationList.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Paper,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Search,
  FilterList,
  MoreVert,
  MarkEmailRead,
  MarkEmailUnread,
  Delete,
  CheckBox,
  CheckBoxOutlineBlank,
  Clear,
  Refresh,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { NotificationCard } from './NotificationCard';
import type {
  Notification,
  NotificationFilters,
  NotificationBulkActionData,
} from '../../types/notifications.types';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PRIORITIES } from '../../types/notifications.types';

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkRead: (id: number) => void;
  onMarkUnread: (id: number) => void;
  onDelete: (id: number) => void;
  onBulkAction: (data: NotificationBulkActionData) => void;
  onFilterChange: (filters: NotificationFilters) => void;
  filters: NotificationFilters;
  isPerformingAction?: boolean;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  isLoading,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onBulkAction,
  onFilterChange,
  filters,
  isPerformingAction = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.type || '');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(notifications.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setBulkMenuAnchor(event.currentTarget);
  };

  const handleBulkMenuClose = () => {
    setBulkMenuAnchor(null);
  };

  const handleBulkAction = (action: 'mark_read' | 'mark_unread' | 'delete') => {
    if (selectedIds.length === 0) return;
    
    onBulkAction({
      notification_ids: selectedIds,
      action,
    });
    
    setSelectedIds([]);
    handleBulkMenuClose();
  };

  const handleFilterChange = (field: keyof NotificationFilters, value: string | boolean | undefined) => {
    onFilterChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    const timer = setTimeout(() => {
      handleFilterChange('type', value);
    }, 300);

    return () => clearTimeout(timer);
  };

  const clearFilters = () => {
    onFilterChange({});
    setSearchValue('');
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  // Group notifications by time periods
  const groupNotificationsByTime = (notifications: Notification[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));
    const lastWeekStart = new Date(thisWeekStart.getTime() - (7 * 24 * 60 * 60 * 1000));

    const groups = {
      today: [] as Notification[],
      yesterday: [] as Notification[],
      thisWeek: [] as Notification[],
      lastWeek: [] as Notification[],
      older: [] as Notification[],
    };

    notifications.forEach(notification => {
      const createdDate = new Date(notification.created_at);
      const createdDateStart = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());

      if (createdDateStart.getTime() === today.getTime()) {
        groups.today.push(notification);
      } else if (createdDateStart.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification);
      } else if (createdDateStart >= thisWeekStart && createdDateStart < today) {
        groups.thisWeek.push(notification);
      } else if (createdDateStart >= lastWeekStart && createdDateStart < thisWeekStart) {
        groups.lastWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  };

  // Smart priority sorting algorithm
  const sortNotificationsByPriority = (notifications: Notification[]) => {
    return [...notifications].sort((a, b) => {
      // Priority weights
      const priorityWeights = {
        'URGENT': 1000,
        'HIGH': 100,
        'NORMAL': 10,
        'LOW': 1
      };

      // Status weights (unread is higher priority)
      const statusWeight = (notification: Notification) => notification.is_read ? 0 : 500;
      
      // Category weights (some categories are more important)
      const categoryWeights = {
        'SYSTEM': 50,
        'PAYMENT': 40,
        'CONTRACT': 35,
        'CLIENT': 30,
        'EVENT': 25,
        'TASK': 20,
        'WORKFLOW': 15,
        'COMMUNICATION': 10,
      };

      // Calculate scores
      const scoreA = 
        priorityWeights[a.notification_type_details?.priority as keyof typeof priorityWeights] +
        statusWeight(a) +
        (categoryWeights[a.notification_type_details?.category as keyof typeof categoryWeights] || 5) +
        // Recent notifications get slight boost (max 10 points for notifications less than 1 hour old)
        Math.max(0, 10 - (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60));

      const scoreB = 
        priorityWeights[b.notification_type_details?.priority as keyof typeof priorityWeights] +
        statusWeight(b) +
        (categoryWeights[b.notification_type_details?.category as keyof typeof categoryWeights] || 5) +
        Math.max(0, 10 - (Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60));

      // If scores are equal, sort by created date (newest first)
      if (Math.abs(scoreA - scoreB) < 0.1) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      return scoreB - scoreA; // Higher score first
    });
  };
  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < notifications.length;

  // Enhanced empty state with contextual messaging
  const renderFilteredEmptyState = () => {
    const hasSearchTerm = filters.type && filters.type.length > 0;
    const hasStatusFilter = filters.is_read !== undefined;
    const hasCategoryFilter = filters.category && filters.category.length > 0;
    const hasPriorityFilter = filters.priority && filters.priority.length > 0;
    
    let title = "No Notifications Found";
    let message = "There are currently no notifications to display.";
    const suggestions = [];

    if (hasActiveFilters) {
      title = "No Notifications Match Your Filters";
      
      if (hasSearchTerm) {
        message = `No notifications contain "${filters.type}".`;
        suggestions.push("Try a different search term or clear the search");
      }
      
      if (hasStatusFilter) {
        const statusText = filters.is_read ? "read" : "unread";
        if (!hasSearchTerm) {
          message = `No ${statusText} notifications found.`;
        }
        suggestions.push(`Try viewing ${filters.is_read ? "unread" : "read"} notifications instead`);
      }
      
      if (hasCategoryFilter && filters.category) {
        const categoryText = filters.category;
        if (!hasSearchTerm && !hasStatusFilter) {
          message = `No ${categoryText.toLowerCase()} notifications found.`;
        }
        suggestions.push("Try selecting a different category");
      }
      
      if (hasPriorityFilter && filters.priority) {
        const priorityText = filters.priority;
        if (!hasSearchTerm && !hasStatusFilter && !hasCategoryFilter) {
          message = `No ${priorityText.toLowerCase()} priority notifications found.`;
        }
        suggestions.push("Try selecting a different priority level");
      }
      
      if (suggestions.length === 0) {
        suggestions.push("Try adjusting your filter criteria");
      }
    } else {
      title = "All Caught Up!";
      message = "You have no notifications at this time. When new notifications arrive, they'll appear here.";
      suggestions.push("Configure notification preferences to control what you receive");
    }

    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 6, 
          textAlign: 'center',
          bgcolor: hasActiveFilters ? 'grey.50' : 'primary.50',
          border: '2px dashed',
          borderColor: hasActiveFilters ? 'grey.300' : 'primary.200'
        }}
      >
        <NotificationsIcon sx={{ 
          fontSize: 64, 
          color: hasActiveFilters ? 'grey.400' : 'primary.main', 
          mb: 2,
          opacity: 0.7
        }} />
        
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
          {message}
        </Typography>

        {suggestions.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
              💡 Suggestions:
            </Typography>
            <Stack spacing={1} alignItems="center">
              {suggestions.slice(0, 2).map((suggestion, index) => (
                <Typography key={index} variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                  • {suggestion}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
          {hasActiveFilters && (
            <Button
              variant="contained"
              startIcon={<Clear />}
              onClick={clearFilters}
              size="small"
              color="primary"
            >
              Clear All Filters
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => window.location.reload()}
            size="small"
          >
            Refresh Page
          </Button>
        </Stack>
      </Paper>
    );
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <Typography color="text.secondary">Loading notifications...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Search and Filters */}
      <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              placeholder="Search notifications..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
            />
            
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              color={hasActiveFilters ? 'primary' : 'inherit'}
              size="small"
            >
              Filters
              {hasActiveFilters && (
                <Chip size="small" label="•" sx={{ ml: 1, minWidth: 'auto', width: 8, height: 8 }} />
              )}
            </Button>
          </Stack>

          {/* Expanded Filter Controls */}
          {showFilters && (
            <>
              <Divider sx={{ my: 2 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.is_read !== undefined ? (filters.is_read ? 'read' : 'unread') : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleFilterChange('is_read', (value as string) === '' ? undefined : (value === 'read'));
                    }}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="unread">Unread</MenuItem>
                    <MenuItem value="read">Read</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category || ''}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {NOTIFICATION_CATEGORIES.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={filters.priority || ''}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    label="Priority"
                  >
                    <MenuItem value="">All Priorities</MenuItem>
                    {NOTIFICATION_PRIORITIES.map((priority) => (
                      <MenuItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button 
                  variant="text" 
                  onClick={clearFilters} 
                  disabled={!hasActiveFilters}
                  size="small"
                >
                  Clear Filters
                </Button>
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'primary.50', borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent sx={{ py: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" color="primary.main" fontWeight="medium">
                {selectedIds.length} notification{selectedIds.length !== 1 ? 's' : ''} selected
              </Typography>
              
              <Box>
                <IconButton
                  onClick={handleBulkMenuOpen}
                  disabled={isPerformingAction}
                  color="primary"
                >
                  <MoreVert />
                </IconButton>
                
                <Menu
                  anchorEl={bulkMenuAnchor}
                  open={Boolean(bulkMenuAnchor)}
                  onClose={handleBulkMenuClose}
                >
                  <MenuItem onClick={() => handleBulkAction('mark_read')}>
                    <ListItemIcon>
                      <MarkEmailRead fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Mark as Read</ListItemText>
                  </MenuItem>
                  
                  <MenuItem onClick={() => handleBulkAction('mark_unread')}>
                    <ListItemIcon>
                      <MarkEmailUnread fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Mark as Unread</ListItemText>
                  </MenuItem>
                  
                  <MenuItem onClick={() => handleBulkAction('delete')} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                      <Delete fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                  </MenuItem>
                </Menu>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Select All */}
      {notifications.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
            icon={<CheckBoxOutlineBlank />}
            checkedIcon={<CheckBox />}
            indeterminateIcon={<CheckBox />}
          />
          <Typography variant="body2" color="text.secondary">
            Select all notifications
          </Typography>
        </Box>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        renderFilteredEmptyState()
      ) : (
        (() => {
          const groups = groupNotificationsByTime(notifications);
          
          const renderNotificationGroup = (groupNotifications: Notification[], title: string) => {
            if (groupNotifications.length === 0) return null;
            
            // Apply smart sorting within each group
            const sortedGroupNotifications = sortNotificationsByPriority(groupNotifications);
            
            const unreadCount = groupNotifications.filter(n => !n.is_read).length;
            
            return (
              <Box key={title} sx={{ mb: 3 }}>
                <Box 
                  display="flex" 
                  alignItems="center" 
                  gap={1} 
                  sx={{ 
                    mb: 2, 
                    pb: 1, 
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'text.primary'
                    }}
                  >
                    {title}
                  </Typography>
                  
                  <Chip
                    label={groupNotifications.length}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.75rem',
                      bgcolor: 'grey.50'
                    }}
                  />
                  
                  {unreadCount > 0 && (
                    <Chip
                      label={`${unreadCount} unread`}
                      size="small"
                      color="primary"
                      sx={{ 
                        height: 20, 
                        fontSize: '0.75rem'
                      }}
                    />
                  )}
                </Box>
                
                <Stack spacing={0.75}>
                  {sortedGroupNotifications.map((notification) => {
                    const isUrgent = notification.notification_type_details?.priority === 'URGENT';
                    const isHigh = notification.notification_type_details?.priority === 'HIGH';
                    
                    return (
                      <Box 
                        key={notification.id} 
                        display="flex" 
                        alignItems="flex-start" 
                        gap={1}
                        sx={{
                          position: 'relative',
                          ...(isUrgent && !notification.is_read && {
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: -12,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 6,
                              height: '80%',
                              bgcolor: 'error.main',
                              borderRadius: 1,
                              animation: 'urgentPulse 2s ease-in-out infinite alternate',
                              '@keyframes urgentPulse': {
                                '0%': { opacity: 0.7 },
                                '100%': { opacity: 1 },
                              },
                            }
                          }),
                          ...(isHigh && !notification.is_read && {
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: -12,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 4,
                              height: '60%',
                              bgcolor: 'warning.main',
                              borderRadius: 1,
                            }
                          })
                        }}
                      >
                        <Checkbox
                          checked={selectedIds.includes(notification.id)}
                          onChange={(e) => handleSelectOne(notification.id, e.target.checked)}
                          sx={{ 
                            mt: 0.75, 
                            '& .MuiSvgIcon-root': { 
                              fontSize: '1.1rem',
                              ...(isUrgent && !notification.is_read && {
                                color: 'error.main'
                              }),
                              ...(isHigh && !notification.is_read && {
                                color: 'warning.main'
                              })
                            } 
                          }}
                          size="small"
                        />
                        
                        <Box sx={{ flexGrow: 1 }}>
                          <NotificationCard
                            notification={notification}
                            onMarkRead={onMarkRead}
                            onMarkUnread={onMarkUnread}
                            onDelete={onDelete}
                            compact={true}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            );
          };
          
          return (
            <Box>
              {renderNotificationGroup(groups.today, 'Today')}
              {renderNotificationGroup(groups.yesterday, 'Yesterday')}
              {renderNotificationGroup(groups.thisWeek, 'This Week')}
              {renderNotificationGroup(groups.lastWeek, 'Last Week')}
              {renderNotificationGroup(groups.older, 'Older')}
            </Box>
          );
        })()
      )}
    </Box>
  );
};