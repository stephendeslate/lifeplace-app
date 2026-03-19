import React from 'react';
import { Box, Typography, Checkbox } from '@mui/material';
import { CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import type {
  Notification,
  NotificationFilters,
  NotificationBulkActionData,
} from '@/types/notifications.types';
import { useNotificationListLogic, groupNotificationsByTime } from './useNotificationListLogic';
import { NotificationListFilters } from './NotificationListFilters';
import { NotificationBulkActions } from './NotificationBulkActions';
import { NotificationEmptyState } from './NotificationEmptyState';
import { NotificationGroup } from './NotificationGroup';

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
  const {
    selectedIds,
    bulkMenuAnchor,
    showFilters,
    setShowFilters,
    searchValue,
    handleSelectAll,
    handleSelectOne,
    handleBulkMenuOpen,
    handleBulkMenuClose,
    handleBulkAction,
    handleFilterChange,
    handleSearchChange,
    clearFilters,
    hasActiveFilters,
    allSelected,
    someSelected,
  } = useNotificationListLogic({ notifications, filters, onBulkAction, onFilterChange });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <Typography color="text.secondary">Loading notifications...</Typography>
      </Box>
    );
  }

  const groups = groupNotificationsByTime(notifications);

  return (
    <Box>
      <NotificationListFilters
        filters={filters}
        searchValue={searchValue}
        showFilters={showFilters}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onClearFilters={clearFilters}
      />

      <NotificationBulkActions
        selectedCount={selectedIds.length}
        bulkMenuAnchor={bulkMenuAnchor}
        isPerformingAction={isPerformingAction}
        onBulkMenuOpen={handleBulkMenuOpen}
        onBulkMenuClose={handleBulkMenuClose}
        onBulkAction={handleBulkAction}
      />

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

      {notifications.length === 0 ? (
        <NotificationEmptyState
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          clearFilters={clearFilters}
        />
      ) : (
        <Box>
          <NotificationGroup
            notifications={groups.today}
            title="Today"
            selectedIds={selectedIds}
            onSelectOne={handleSelectOne}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onDelete={onDelete}
          />
          <NotificationGroup
            notifications={groups.yesterday}
            title="Yesterday"
            selectedIds={selectedIds}
            onSelectOne={handleSelectOne}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onDelete={onDelete}
          />
          <NotificationGroup
            notifications={groups.thisWeek}
            title="This Week"
            selectedIds={selectedIds}
            onSelectOne={handleSelectOne}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onDelete={onDelete}
          />
          <NotificationGroup
            notifications={groups.lastWeek}
            title="Last Week"
            selectedIds={selectedIds}
            onSelectOne={handleSelectOne}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onDelete={onDelete}
          />
          <NotificationGroup
            notifications={groups.older}
            title="Older"
            selectedIds={selectedIds}
            onSelectOne={handleSelectOne}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onDelete={onDelete}
          />
        </Box>
      )}
    </Box>
  );
};
