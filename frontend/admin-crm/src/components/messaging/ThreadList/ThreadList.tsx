// frontend/admin-crm/src/components/messaging/ThreadList/ThreadList.tsx
// Thread list component with search, filters, and selection
// WIP: Messaging feature temporarily disabled for deployment

import React, { useState, useMemo } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Checkbox,
  Divider,
  Collapse,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  PriorityHigh as PriorityHighIcon,
  Circle as CircleIcon,
  Person as PersonIcon,
  Event as EventIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAdminMessaging } from '../../../hooks/useAdminMessaging';
import type { ThreadListProps, AdminThreadFilters, MessagePriority, MessageThreadStatus, MessageThreadListItem } from '../../../types/messaging.types';

export const ThreadList: React.FC<ThreadListProps> = ({
  clientId,
  eventId,
  selectedThreadId,
  onThreadSelect,
  bulkMode = false,
  selectedThreadIds = [],
  onThreadSelectionChange,
  height = 400,
  showSearch = true,
  showFilters = true,
  compactMode = false
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [activeFilters, setActiveFilters] = useState<AdminThreadFilters>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // ============================================================================
  // Messaging Hook
  // ============================================================================

  const {
    threads,
    isLoadingThreads,
    searchThreads
  } = useAdminMessaging({
    clientId,
    eventId
  });

  // ============================================================================
  // Computed Values
  // ============================================================================

  const filteredThreads = useMemo(() => {
    let results = threads;

    // Apply search
    if (searchQuery.trim()) {
      results = searchThreads(searchQuery);
    }

    // Apply filters
    if (activeFilters.status) {
      results = results.filter((thread: MessageThreadListItem) => thread.status === activeFilters.status);
    }

    if (activeFilters.priority) {
      results = results.filter((thread: MessageThreadListItem) => thread.priority === activeFilters.priority);
    }

    if (activeFilters.unassigned_only) {
      results = results.filter((thread: MessageThreadListItem) => !thread.assigned_admin);
    }

    if (activeFilters.has_unread) {
      results = results.filter((thread: MessageThreadListItem) => thread.unread_count > 0);
    }

    if (activeFilters.urgent_only) {
      results = results.filter((thread: MessageThreadListItem) => thread.priority === 'urgent');
    }

    return results;
  }, [threads, searchQuery, activeFilters, searchThreads]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleThreadClick = (threadId: string) => {
    if (bulkMode) {
      const newSelection = selectedThreadIds.includes(threadId)
        ? selectedThreadIds.filter(id => id !== threadId)
        : [...selectedThreadIds, threadId];
      onThreadSelectionChange?.(newSelection);
    } else {
      onThreadSelect(threadId);
    }
  };

  const handleFilterChange = (filterKey: keyof AdminThreadFilters, value: string | boolean | MessagePriority | MessageThreadStatus | undefined) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearFilters = () => {
    setActiveFilters({});
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, _threadId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const getPriorityIcon = (priority: MessagePriority) => {
    switch (priority) {
      case 'urgent':
        return <PriorityHighIcon color="error" fontSize="small" />;
      case 'high':
        return <CircleIcon color="warning" fontSize="small" />;
      case 'normal':
        return <CircleIcon color="info" fontSize="small" />;
      case 'low':
        return <CircleIcon color="disabled" fontSize="small" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: MessageThreadStatus): string => {
    switch (status) {
      case 'active': return 'success';
      case 'waiting': return 'warning';
      case 'resolved': return 'info';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const formatLastMessageTime = (timestamp: string | null): string => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderSearchBar = () => {
    if (!showSearch) return null;

    return (
      <Box sx={{ p: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: showFilters && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                  color={Object.keys(activeFilters).length > 0 ? 'primary' : 'default'}
                >
                  <FilterIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>
    );
  };

  const renderFiltersPanel = () => {
    if (!showFilters || !showFiltersPanel) return null;

    return (
      <Collapse in={showFiltersPanel}>
        <Paper sx={{ p: 2, m: 1, mt: 0 }} elevation={0} variant="outlined">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip
              label="Unassigned"
              size="small"
              variant={activeFilters.unassigned_only ? 'filled' : 'outlined'}
              onClick={() => handleFilterChange('unassigned_only', !activeFilters.unassigned_only)}
            />
            <Chip
              label="Has Unread"
              size="small"
              variant={activeFilters.has_unread ? 'filled' : 'outlined'}
              onClick={() => handleFilterChange('has_unread', !activeFilters.has_unread)}
            />
            <Chip
              label="Urgent"
              size="small"
              color="error"
              variant={activeFilters.urgent_only ? 'filled' : 'outlined'}
              onClick={() => handleFilterChange('urgent_only', !activeFilters.urgent_only)}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              select
              size="small"
              label="Status"
              value={activeFilters.status || ''}
              onChange={(e) => handleFilterChange('status' as keyof AdminThreadFilters, e.target.value || undefined)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="waiting">Waiting</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Priority"
              value={activeFilters.priority || ''}
              onChange={(e) => handleFilterChange('priority' as keyof AdminThreadFilters, e.target.value || undefined)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </TextField>
          </Box>

          {Object.keys(activeFilters).length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Chip
                label="Clear Filters"
                size="small"
                variant="outlined"
                color="secondary"
                onClick={clearFilters}
              />
            </Box>
          )}
        </Paper>
      </Collapse>
    );
  };

  const renderThreadItem = (thread: MessageThreadListItem) => {
    const isSelected = bulkMode
      ? selectedThreadIds.includes(thread.id)
      : selectedThreadId === thread.id;

    return (
      <ListItem
        key={thread.id}
        disablePadding
        sx={{
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <ListItemButton
          selected={isSelected}
          onClick={() => handleThreadClick(thread.id)}
          sx={{
            py: compactMode ? 0.5 : 1,
            '&.Mui-selected': {
              bgcolor: 'primary.light',
              '&:hover': {
                bgcolor: 'primary.light'
              }
            }
          }}
        >
          {bulkMode && (
            <Checkbox
              checked={selectedThreadIds.includes(thread.id)}
              size="small"
              sx={{ mr: 1 }}
            />
          )}

          <ListItemAvatar>
            <Badge
              badgeContent={thread.unread_count}
              color="primary"
              max={99}
              invisible={thread.unread_count === 0}
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {thread.client_name.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
          </ListItemAvatar>

          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: thread.unread_count > 0 ? 'bold' : 'normal',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {thread.subject}
                </Typography>
                {getPriorityIcon(thread.priority)}
              </Box>
            }
            secondary={
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <PersonIcon fontSize="small" color="disabled" />
                  <Typography variant="caption" color="text.secondary">
                    {thread.client_name}
                  </Typography>
                  {thread.event_name && (
                    <>
                      <EventIcon fontSize="small" color="disabled" />
                      <Typography variant="caption" color="text.secondary">
                        {thread.event_name}
                      </Typography>
                    </>
                  )}
                </Box>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {thread.last_message_preview}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                  <Chip
                    label={thread.status}
                    size="small"
                    color={getStatusColor(thread.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatLastMessageTime(thread.last_message_at)}
                  </Typography>
                </Box>
              </Box>
            }
          />

          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, thread.id)}
            sx={{ ml: 1 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </ListItemButton>
      </ListItem>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Box
      sx={{
        height,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper'
      }}
    >
      {renderSearchBar()}
      {renderFiltersPanel()}

      <Divider />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoadingThreads ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading conversations...
            </Typography>
          </Box>
        ) : filteredThreads.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searchQuery ? 'No conversations match your search.' : 'No conversations found.'}
            </Typography>
          </Box>
        ) : (
          <List dense={compactMode}>
            {filteredThreads.map(renderThreadItem)}
          </List>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>Mark as Read</MenuItem>
        <MenuItem onClick={handleMenuClose}>Assign to Me</MenuItem>
        <MenuItem onClick={handleMenuClose}>Change Priority</MenuItem>
        <MenuItem onClick={handleMenuClose}>Archive</MenuItem>
      </Menu>
    </Box>
  );
};

export type { ThreadListProps };