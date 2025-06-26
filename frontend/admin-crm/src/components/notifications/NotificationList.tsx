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
  Alert,
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
} from '@mui/icons-material';
import { NotificationCard } from './NotificationCard';
import type {
  Notification,
  NotificationFilters,
  NotificationBulkActionData,
  NotificationCategory,
  NotificationPriority,
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

  const handleFilterChange = (field: keyof NotificationFilters, value: any) => {
    onFilterChange({
      ...filters,
      [field]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < notifications.length;

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
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search notifications..."
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
          
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setShowFilters(!showFilters)}
            color={hasActiveFilters ? 'primary' : 'inherit'}
          >
            Filters
            {hasActiveFilters && (
              <Chip size="small" label="•" sx={{ ml: 1, minWidth: 'auto', width: 8, height: 8 }} />
            )}
          </Button>
        </Stack>

        {/* Filter Controls */}
        {showFilters && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
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

              <Button variant="text" onClick={clearFilters} disabled={!hasActiveFilters}>
                Clear Filters
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="primary.contrastText">
              {selectedIds.length} notification{selectedIds.length !== 1 ? 's' : ''} selected
            </Typography>
            
            <Box>
              <IconButton
                onClick={handleBulkMenuOpen}
                disabled={isPerformingAction}
                sx={{ color: 'primary.contrastText' }}
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
        </Box>
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
        <Alert severity="info">
          {hasActiveFilters
            ? 'No notifications match your current filters.'
            : 'You have no notifications at this time.'}
        </Alert>
      ) : (
        <Stack spacing={1}>
          {notifications.map((notification) => (
            <Box key={notification.id} display="flex" alignItems="flex-start" gap={1}>
              <Checkbox
                checked={selectedIds.includes(notification.id)}
                onChange={(e) => handleSelectOne(notification.id, e.target.checked)}
                sx={{ mt: 1 }}
              />
              
              <Box sx={{ flexGrow: 1 }}>
                <NotificationCard
                  notification={notification}
                  onMarkRead={onMarkRead}
                  onMarkUnread={onMarkUnread}
                  onDelete={onDelete}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};