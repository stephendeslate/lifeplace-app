/**
 * ThreadList - Advanced message thread list component
 * 
 * Features:
 * - Thread display with real-time updates
 * - Search and filtering capabilities
 * - Priority indicators and status badges
 * - Unread message counts
 * - Admin assignment indicators
 * - Event context integration
 * - Pagination and load more
 * - Responsive design with compact mode
 * - Keyboard navigation support
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Badge,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Skeleton,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Paper,
  Select,
  FormControl,
  InputLabel,
  styled,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  Event as EventIcon,
  PriorityHigh as PriorityIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  MoreVert as MoreVertIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Circle as CircleIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { MessageThread, User } from '../../types/messaging.types';

const ThreadListContainer = styled(Paper)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
}));

const SearchContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
}));

const ThreadListContent = styled(Box)({
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

const ThreadItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'compact'
})<{ selected?: boolean; compact?: boolean }>(({ theme, selected, compact }) => ({
  padding: theme.spacing(compact ? 1 : 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: selected ? theme.palette.action.selected : 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&.Mui-selected': {
    backgroundColor: theme.palette.primary.light + '20',
    borderLeft: `3px solid ${theme.palette.primary.main}`,
  },
}));

const ThreadMeta = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  flexWrap: 'wrap',
}));

const PriorityIndicator = styled(Box)<{ priority: 'urgent' | 'high' | 'normal' | 'low' }>(({ theme, priority }) => {
  const colors = {
    urgent: theme.palette.error.main,
    high: theme.palette.warning.main,
    normal: theme.palette.info.main,
    low: theme.palette.grey[500],
  };
  
  return {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: colors[priority],
    flexShrink: 0,
  };
});

const StatusChip = styled(Chip)<{ status: 'active' | 'waiting' | 'resolved' }>(({ theme, status }) => {
  const variants = {
    active: { color: theme.palette.success.main, background: theme.palette.success.light + '20' },
    waiting: { color: theme.palette.warning.main, background: theme.palette.warning.light + '20' },
    resolved: { color: theme.palette.grey[600], background: theme.palette.grey[100] },
  };
  
  return {
    height: 20,
    fontSize: '0.7rem',
    color: variants[status].color,
    backgroundColor: variants[status].background,
    border: `1px solid ${variants[status].color}`,
  };
});

const EmptyState = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

export interface ThreadListProps {
  threads?: MessageThread[];
  selectedThreadId?: string | null;
  onThreadSelect?: (thread: MessageThread | null) => void;
  loading?: boolean;
  // Additional props used in MessageInterface
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  userRole?: 'CLIENT' | 'ADMIN';
  compact?: boolean;
  enableSearch?: boolean;
  currentUser?: User;
  height?: number;
  showEventContext?: boolean;
  showAssignments?: boolean;
  onThreadAction?: (action: string, threadId: string) => void;
  // Sorting props
  ordering?: string;
  onOrderingChange?: (ordering: string) => void;
  enableSorting?: boolean;
}

export const ThreadList: React.FC<ThreadListProps> = ({
  threads = [],
  selectedThreadId,
  onThreadSelect,
  loading = false,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  searchQuery = '',
  onSearchChange,
  userRole = 'CLIENT',
  compact = false,
  enableSearch = true,
  currentUser,
  height = 500,
  showEventContext = true,
  showAssignments = true,
  onThreadAction,
  // Sorting props
  ordering = '-last_message_at',
  onOrderingChange,
  enableSorting = true
}) => {
  const theme = useTheme();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedActionThreadId, setSelectedActionThreadId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter threads based on search query
  const filteredThreads = useMemo(() => {
    if (!localSearchQuery.trim()) return threads;
    
    const query = localSearchQuery.toLowerCase();
    return threads.filter(thread => 
      thread.client_name.toLowerCase().includes(query) ||
      thread.event_name.toLowerCase().includes(query) ||
      thread.last_message?.content.toLowerCase().includes(query) ||
      thread.event_date.toLowerCase().includes(query)
    );
  }, [threads, localSearchQuery]);

  // Handle search input with debouncing
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalSearchQuery(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for external search handler
    searchTimeoutRef.current = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(value);
      }
    }, 300);
  }, [onSearchChange]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setLocalSearchQuery('');
    if (onSearchChange) {
      onSearchChange('');
    }
  }, [onSearchChange]);

  // Handle thread selection
  const handleThreadSelect = useCallback((thread: MessageThread) => {
    if (onThreadSelect) {
      onThreadSelect(thread);
    }
  }, [onThreadSelect]);

  // Handle thread action menu
  const handleActionMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, threadId: string) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
    setSelectedActionThreadId(threadId);
  }, []);

  const handleActionMenuClose = useCallback(() => {
    setActionMenuAnchor(null);
    setSelectedActionThreadId(null);
  }, []);

  const handleThreadAction = useCallback((action: string) => {
    if (onThreadAction && selectedActionThreadId) {
      onThreadAction(action, selectedActionThreadId);
    }
    handleActionMenuClose();
  }, [onThreadAction, selectedActionThreadId, handleActionMenuClose]);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  }, []);

  // Get priority icon
  const getPriorityIcon = useCallback((priority: MessageThread['priority']) => {
    switch (priority) {
      case 'urgent': return <PriorityIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      case 'high': return <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />;
      case 'normal': return <CircleIcon sx={{ fontSize: 16, color: 'info.main' }} />;
      case 'low': return <CircleIcon sx={{ fontSize: 16, color: 'grey.500' }} />;
      default: return null;
    }
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ThreadListContainer sx={{ height }}>
      {/* Search and Sort Header */}
      {(enableSearch || enableSorting) && (
        <SearchContainer>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {enableSearch && (
              <TextField
                size="small"
                placeholder="Search conversations..."
                value={localSearchQuery}
                onChange={handleSearchChange}
                variant="outlined"
                sx={{
                  flex: enableSorting ? 1 : 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: localSearchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}

            {enableSorting && onOrderingChange && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="thread-sort-label">Sort by</InputLabel>
                <Select
                  labelId="thread-sort-label"
                  value={ordering}
                  label="Sort by"
                  onChange={(e) => onOrderingChange(e.target.value)}
                  startAdornment={<SortIcon fontSize="small" sx={{ mr: 1 }} />}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                >
                  <MenuItem value="-last_message_at">Newest first</MenuItem>
                  <MenuItem value="last_message_at">Oldest first</MenuItem>
                  <MenuItem value="-priority_order">Priority</MenuItem>
                  <MenuItem value="subject">Subject A-Z</MenuItem>
                  <MenuItem value="-subject">Subject Z-A</MenuItem>
                  <MenuItem value="client_name">Client A-Z</MenuItem>
                  <MenuItem value="-client_name">Client Z-A</MenuItem>
                  <MenuItem value="event_name">Event A-Z</MenuItem>
                  <MenuItem value="-event_name">Event Z-A</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </SearchContainer>
      )}

      {/* Thread List Content */}
      <ThreadListContent>
        {loading && threads.length === 0 ? (
          // Loading skeleton
          <Box sx={{ p: 1 }}>
            {[...Array(5)].map((_, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="80%" />
                </Box>
              </Box>
            ))}
          </Box>
        ) : filteredThreads.length === 0 ? (
          // Empty state
          <EmptyState>
            <PersonIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              {localSearchQuery ? 'No conversations found' : 'No conversations yet'}
            </Typography>
            <Typography variant="body2">
              {localSearchQuery 
                ? 'Try adjusting your search terms'
                : 'Conversations will appear here when messages are sent'
              }
            </Typography>
          </EmptyState>
        ) : (
          // Thread list
          <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {filteredThreads.map((thread) => {
              const isSelected = thread.id === selectedThreadId;
              const hasUnread = thread.unread_count > 0;
              
              return (
                <ThreadItem
                  key={thread.id}
                  selected={isSelected}
                  compact={compact}
                  onClick={() => handleThreadSelect(thread)}
                  sx={{
                    borderLeft: isSelected ? `3px solid ${theme.palette.primary.main}` : 'none',
                  }}
                >
                  {/* Avatar */}
                  <ListItemAvatar>
                    <Badge
                      badgeContent={hasUnread ? thread.unread_count : 0}
                      color="primary"
                      invisible={!hasUnread}
                      max={99}
                    >
                      <Avatar
                        sx={{ 
                          width: compact ? 32 : 40, 
                          height: compact ? 32 : 40,
                          bgcolor: 'primary.light'
                        }}
                      >
                        {thread.assigned_admin?.avatar ? (
                          <img 
                            src={thread.assigned_admin.avatar} 
                            alt={thread.assigned_admin.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <PersonIcon />
                        )}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>

                  {/* Content */}
                  <ListItemText
                    primary={
                      <Box sx={{ mb: 0.5 }}>
                        {/* Subject line (primary) */}
                        {thread.subject && (
                          <Typography
                            variant={compact ? 'subtitle2' : 'subtitle1'}
                            fontWeight={hasUnread ? 600 : 500}
                            noWrap
                            sx={{ mb: 0.25 }}
                          >
                            {thread.subject}
                          </Typography>
                        )}

                        {/* Client name and priority indicators */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant={compact ? 'body2' : 'body1'}
                            fontWeight={hasUnread ? 500 : 400}
                            color={thread.subject ? 'text.secondary' : 'text.primary'}
                            noWrap
                            sx={{ flex: 1 }}
                          >
                            {thread.client_name}
                          </Typography>
                          <PriorityIndicator priority={thread.priority} />
                          {getPriorityIcon(thread.priority)}
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box component="span">
                        {/* Event info */}
                        {showEventContext && thread.event_name && (
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <EventIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                              {thread.event_name}
                            </Typography>
                            {thread.event_date && (
                              <>
                                <ScheduleIcon sx={{ fontSize: 12, color: 'text.secondary', ml: 0.5 }} />
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(thread.event_date).toLocaleDateString()}
                                </Typography>
                              </>
                            )}
                          </Box>
                        )}
                        
                        {/* Last message */}
                        {thread.last_message && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ 
                              display: '-webkit-box',
                              WebkitLineClamp: compact ? 1 : 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              fontWeight: hasUnread ? 500 : 400,
                              mb: 0.5
                            }}
                          >
                            {thread.last_message.content}
                          </Typography>
                        )}
                        
                        {/* Thread metadata */}
                        <ThreadMeta>
                          <StatusChip
                            label={thread.status}
                            status={thread.status}
                            size="small"
                          />
                          
                          {showAssignments && thread.assigned_admin && userRole === 'ADMIN' && (
                            <Chip
                              icon={<AssignmentIcon />}
                              label={thread.assigned_admin.name}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                          
                          {thread.last_message && (
                            <Typography variant="caption" color="text.secondary">
                              {formatTimestamp(thread.last_message.sent_at)}
                            </Typography>
                          )}
                        </ThreadMeta>
                      </Box>
                    }
                  />

                  {/* Action menu for admin */}
                  {userRole === 'ADMIN' && onThreadAction && (
                    <Tooltip title="Thread actions">
                      <IconButton
                        size="small"
                        onClick={(e) => handleActionMenuOpen(e, thread.id)}
                        sx={{ ml: 1 }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </ThreadItem>
              );
            })}
            
            {/* Load more button */}
            {hasMore && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={onLoadMore}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={16} /> : null}
                >
                  {isLoading ? 'Loading...' : 'Load more conversations'}
                </Button>
              </Box>
            )}
          </List>
        )}
        
        {/* Loading indicator at bottom */}
        {isLoading && threads.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </ThreadListContent>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleThreadAction('assign')}>
          <AssignmentIcon sx={{ mr: 1, fontSize: 16 }} />
          Assign to me
        </MenuItem>
        <MenuItem onClick={() => handleThreadAction('priority_high')}>
          <PriorityIcon sx={{ mr: 1, fontSize: 16 }} />
          Mark high priority
        </MenuItem>
        <MenuItem onClick={() => handleThreadAction('resolve')}>
          <CheckIcon sx={{ mr: 1, fontSize: 16 }} />
          Mark resolved
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleThreadAction('archive')}>
          Archive thread
        </MenuItem>
      </Menu>
    </ThreadListContainer>
  );
};

export default ThreadList;