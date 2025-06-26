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

  const handleFilterChange = (field: keyof NotificationFilters, value: any) => {
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
  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < notifications.length;

  // Empty state when no notifications match filters
  const renderFilteredEmptyState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 4, 
        textAlign: 'center',
        bgcolor: 'grey.50',
        border: '1px dashed',
        borderColor: 'grey.300'
      }}
    >
      <NotificationsIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        No Notifications Match Your Filters
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Try adjusting your search criteria or clearing the filters to see more results.
      </Typography>
      <Button
        variant="outlined"
        startIcon={<Clear />}
        onClick={clearFilters}
        size="small"
      >
        Clear All Filters
      </Button>
    </Paper>
  );

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