/**
 * MessagesOverview - Admin CRM Messages Dashboard
 * 
 * Features:
 * - Three-panel layout: Thread list, message view, context sidebar
 * - Glassmorphism integration with existing design tokens
 * - Advanced filtering and search functionality
 * - Bulk operations and thread management
 * - Real-time updates with optimistic UI
 * - Keyboard shortcuts for power users
 * - Responsive design with mobile support
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { keyframes } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Tooltip,
  Card,
  CardContent,
  MenuList,
  ListSubheader,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  FormControlLabel,
  Select,
  FormControl,
  InputLabel,
  Button,
  ButtonGroup,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Archive as ArchiveIcon,
  MoreVert as MoreVertIcon,
  Unarchive as UnarchiveIcon,
  Sort as SortIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import { useMessagingContext } from '@shared';
import { useArchiveThread, useUnarchiveThread } from '@shared/hooks/messaging/useMessagingMutations';
import { useSortedThreads, useThreadSortConfig, type ThreadSortCriteria, type ThreadSortConfig } from '@shared/utils/threadSorting';
import { AdminMessageThread } from '../../components/messaging/AdminMessageThread';
import { CreateThreadDialog } from '../../components/messaging/CreateThreadDialog';
import { useToastActions } from '../../contexts/ToastContext';
import type { MessageThread, ThreadFilters } from '@shared/types/messaging.types';

export interface MessagesOverviewProps {
  className?: string;
  defaultView?: 'grid' | 'list';
  enableSearch?: boolean;
  enableFilters?: boolean;
}

type ViewMode = 'grid' | 'list';
type PanelLayout = 'three-panel' | 'two-panel' | 'single-panel';

// Animation for state transitions
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const MessagesOverview: React.FC<MessagesOverviewProps> = ({
  className,
  defaultView = 'list',
  enableSearch = true,
  enableFilters = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  // Messaging context
  const { state, actions, config } = useMessagingContext();

  // Toast notifications
  const { showSuccess, showError, showInfo } = useToastActions();

  // Archive/unarchive mutations with optimistic updates
  const archiveThreadMutation = useArchiveThread();
  const unarchiveThreadMutation = useUnarchiveThread();

  // Component state
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [panelLayout, setPanelLayout] = useState<PanelLayout>('three-panel');
  const [showContext] = useState(true);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Filter state
  const [localFilters, setLocalFilters] = useState<ThreadFilters>({
    status: undefined,
    priority: undefined,
    assigned_admin: undefined,
    archive_status: 'active', // Default to showing only active threads
  });

  // Sort configuration with archive awareness
  const {
    sortConfig,
    setSortCriteria,
    toggleSortDirection,
  } = useThreadSortConfig({
    criteria: 'last_message_at',
    direction: 'desc',
    archiveAware: true,
  });

  // Archive-aware sorted threads with performance optimization
  const {
    sortedThreads,
    activeThreads,
    archivedThreads,
  } = useSortedThreads(state.threads, sortConfig);

  // Keyboard shortcut handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'r':
            event.preventDefault();
            actions.refreshThreads();
            break;
          case 'f':
            event.preventDefault();
            setSearchFocused(true);
            break;
          case '1':
            event.preventDefault();
            setPanelLayout('single-panel');
            break;
          case '2':
            event.preventDefault();
            setPanelLayout('two-panel');
            break;
          case '3':
            event.preventDefault();
            setPanelLayout('three-panel');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  // Auto-adjust layout based on screen size
  useEffect(() => {
    if (isMobile) {
      setPanelLayout('single-panel');
    } else if (isTablet) {
      setPanelLayout('two-panel');
    } else {
      setPanelLayout('three-panel');
    }
  }, [isMobile, isTablet]);

  // Layout calculations
  const layoutConfig = useMemo(() => {
    switch (panelLayout) {
      case 'single-panel':
        return {
          threadListWidth: state.selectedThreadId ? '0%' : '100%',
          messageViewWidth: state.selectedThreadId ? '100%' : '0%',
          contextWidth: '0%',
          showThreadList: !state.selectedThreadId,
          showMessageView: Boolean(state.selectedThreadId),
          showContext: false,
        };
      case 'two-panel':
        return {
          threadListWidth: '40%',
          messageViewWidth: '60%',
          contextWidth: '0%',
          showThreadList: true,
          showMessageView: Boolean(state.selectedThreadId),
          showContext: false,
        };
      case 'three-panel':
        return {
          threadListWidth: showContext ? '30%' : '40%',
          messageViewWidth: showContext ? '45%' : '60%',
          contextWidth: showContext ? '25%' : '0%',
          showThreadList: true,
          showMessageView: Boolean(state.selectedThreadId),
          showContext: showContext && Boolean(state.selectedThreadId),
        };
      default:
        return {
          threadListWidth: '40%',
          messageViewWidth: '60%',
          contextWidth: '0%',
          showThreadList: true,
          showMessageView: Boolean(state.selectedThreadId),
          showContext: false,
        };
    }
  }, [panelLayout, showContext, state.selectedThreadId]);

  // Filter handlers
  const handleApplyFilters = useCallback((filters: ThreadFilters) => {
    actions.setThreadFilters(filters);
    setLocalFilters(filters);
    setFilterAnchorEl(null);
  }, [actions]);

  const clearFilters = useCallback(() => {
    const emptyFilters: ThreadFilters = { status: undefined, priority: undefined, assigned_admin: undefined, archive_status: 'active' };
    actions.setThreadFilters(emptyFilters);
    setLocalFilters(emptyFilters);
  }, [actions]);

  // Sort handlers
  const handleSortMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setSortMenuAnchor(event.currentTarget);
  }, []);

  const handleSortMenuClose = useCallback(() => {
    setSortMenuAnchor(null);
  }, []);

  const handleSortCriteriaChange = useCallback((criteria: ThreadSortCriteria) => {
    setSortCriteria(criteria);
    handleSortMenuClose();
  }, [setSortCriteria, handleSortMenuClose]);

  const handleSortDirectionToggle = useCallback(() => {
    toggleSortDirection();
  }, [toggleSortDirection]);

  // Selection handlers
  const handleSelectThread = useCallback((threadId: string, selected: boolean) => {
    setSelectedThreads(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(threadId);
      } else {
        newSet.delete(threadId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedThreads.size === sortedThreads.length) {
      setSelectedThreads(new Set());
    } else {
      setSelectedThreads(new Set(sortedThreads.map(t => t.id)));
    }
  }, [selectedThreads.size, sortedThreads]);

  // Bulk operations
  const handleBulkMarkAsRead = useCallback(() => {
    // Implement bulk mark as read
    console.log('Bulk mark as read:', Array.from(selectedThreads));
    setSelectedThreads(new Set());
  }, [selectedThreads]);

  const handleBulkAssign = useCallback((adminId: number) => {
    // Implement bulk assign
    console.log('Bulk assign to admin:', adminId, Array.from(selectedThreads));
    setSelectedThreads(new Set());
  }, [selectedThreads]);

  // Archive/Unarchive handlers with comprehensive error handling
  const handleArchiveThread = useCallback((threadId: string) => {
    console.log('Archive thread:', threadId);

    archiveThreadMutation.mutate(threadId, {
      onSuccess: (updatedThread) => {
        console.log('Successfully archived thread:', threadId);

        // Show appropriate success message
        const successMessage = (updatedThread as MessageThread & { _successMessage?: string })._successMessage || 'Thread archived successfully.';
        showSuccess('Thread Archived', successMessage);

        // If this was the selected thread, clear the selection
        if (state.selectedThreadId === threadId) {
          actions.selectThread(null);
        }
      },
      onError: (error: Error & { isAlreadyArchived?: boolean; message: string }) => {
        console.error('Failed to archive thread:', error);

        // Handle "already archived" case as informational message
        if (error.isAlreadyArchived) {
          showInfo('Already Archived', error.message);

          // If this was the selected thread, clear the selection since it's archived
          if (state.selectedThreadId === threadId) {
            actions.selectThread(null);
          }
        } else {
          // Show actual error for other cases
          showError('Archive Failed', error.message || 'Failed to archive thread. Please try again.');
        }
      }
    });
  }, [archiveThreadMutation, state.selectedThreadId, actions, showSuccess, showError, showInfo]);

  const handleUnarchiveThread = useCallback((threadId: string) => {
    console.log('Unarchive thread:', threadId);

    unarchiveThreadMutation.mutate(threadId, {
      onSuccess: (updatedThread) => {
        console.log('Successfully unarchived thread:', threadId);

        // Show appropriate success message
        const successMessage = (updatedThread as MessageThread & { _successMessage?: string })._successMessage || 'Thread unarchived successfully.';
        showSuccess('Thread Unarchived', successMessage);
      },
      onError: (error: Error & { isNotArchived?: boolean; message: string }) => {
        console.error('Failed to unarchive thread:', error);

        // Handle "not archived" case as informational message
        if (error.isNotArchived) {
          showInfo('Already Active', error.message);
        } else {
          // Show actual error for other cases
          showError('Unarchive Failed', error.message || 'Failed to unarchive thread. Please try again.');
        }
      }
    });
  }, [unarchiveThreadMutation, showSuccess, showError, showInfo]);

  // Filter badges
  const activeFiltersCount = Object.entries(localFilters)
    .filter(([key, value]) => {
      // Don't count archive_status as active if it's 'active' (default)
      if (key === 'archive_status') return value !== 'active';
      return Boolean(value);
    }).length;

  // Error handling
  if (state.error) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
        }}
      >
        {/* Header */}
        <Paper
          elevation={0}
          className="glass"
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderRadius: 0,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MessageIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Messages
            </Typography>
          </Box>
        </Paper>

        {/* Error State */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Alert 
            severity="error" 
            sx={{ maxWidth: 600 }}
            action={
              <Button color="inherit" size="small" onClick={actions.refreshThreads}>
                Retry
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              Unable to load messages
            </Typography>
            <Typography variant="body2">
              {state.error.message}
            </Typography>
            {state.error.message.includes('authentication') && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Please try refreshing the page or logging out and back in.
              </Typography>
            )}
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      className={className}
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Paper
        elevation={0}
        className="glass"
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MessageIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>
            Messages
          </Typography>
          <Badge badgeContent={state.unreadCount} color="primary" max={99}>
            <NotificationsIcon color="action" />
          </Badge>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* New Thread Button */}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1,
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
            }
          }}
        >
          New Thread
        </Button>

        {/* Search */}
        {enableSearch && (
          <TextField
            size="small"
            placeholder="Search messages, clients, events..."
            value={state.searchQuery}
            onChange={(e) => actions.setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{
              width: searchFocused ? 300 : 200,
              transition: theme.transitions.create('width', {
                duration: theme.transitions.duration.short,
              }),
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
              },
            }}
          />
        )}

        {/* Filter Toggle */}
        {enableFilters && (
          <Tooltip title="Filters">
            <IconButton
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              color={activeFiltersCount > 0 ? 'primary' : 'default'}
            >
              <Badge badgeContent={activeFiltersCount} color="primary">
                <FilterIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        )}

        {/* View Mode Toggle */}
        <ButtonGroup variant="outlined" size="small">
          <Button
            onClick={() => setViewMode('list')}
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
          >
            <ViewListIcon />
          </Button>
          <Button
            onClick={() => setViewMode('grid')}
            variant={viewMode === 'grid' ? 'contained' : 'outlined'}
          >
            <ViewModuleIcon />
          </Button>
        </ButtonGroup>

        {/* Sort Menu */}
        <Tooltip title="Sort Options">
          <IconButton
            onClick={handleSortMenuOpen}
            color={sortConfig.criteria !== 'last_message_at' ? 'primary' : 'default'}
          >
            <SortIcon />
          </IconButton>
        </Tooltip>

        {/* Refresh */}
        <Tooltip title="Refresh (Ctrl+R)">
          <IconButton
            onClick={actions.refreshThreads}
            disabled={state.isLoadingThreads}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
        PaperProps={{
          sx: {
            width: 320,
            p: 2,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          },
        }}
      >
        <Typography variant="h6" gutterBottom>
          Filter Messages
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Status Filter */}
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={localFilters.status || ''}
              onChange={(e) =>
                setLocalFilters(prev => ({ ...prev, status: e.target.value as 'active' | 'waiting' | 'resolved' | undefined }))
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="waiting">Waiting</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
            </Select>
          </FormControl>

          {/* Priority Filter */}
          <FormControl fullWidth size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={localFilters.priority || ''}
              onChange={(e) =>
                setLocalFilters(prev => ({ ...prev, priority: e.target.value as 'normal' | 'high' | 'low' | 'urgent' | undefined }))
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>

          {/* Archive Status Filter */}
          <FormControl fullWidth size="small">
            <InputLabel>Archive Status</InputLabel>
            <Select
              value={localFilters.archive_status || 'active'}
              onChange={(e) =>
                setLocalFilters(prev => ({ ...prev, archive_status: e.target.value as 'active' | 'archived' | 'all' }))
              }
            >
              <MenuItem value="active">Active Only</MenuItem>
              <MenuItem value="archived">Archived Only</MenuItem>
              <MenuItem value="all">All Threads</MenuItem>
            </Select>
          </FormControl>

          <Divider />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={() => handleApplyFilters(localFilters)}
              fullWidth
            >
              Apply Filters
            </Button>
            <Button
              variant="outlined"
              onClick={clearFilters}
              fullWidth
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={handleSortMenuClose}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          },
        }}
      >
        <ListSubheader sx={{ bgcolor: 'transparent', fontWeight: 600 }}>
          Sort Threads
        </ListSubheader>

        <MenuList dense>
          <MenuItem
            onClick={() => handleSortCriteriaChange('last_message_at')}
            selected={sortConfig.criteria === 'last_message_at'}
          >
            Last Message
          </MenuItem>
          <MenuItem
            onClick={() => handleSortCriteriaChange('priority')}
            selected={sortConfig.criteria === 'priority'}
          >
            Priority
          </MenuItem>
          <MenuItem
            onClick={() => handleSortCriteriaChange('client_name')}
            selected={sortConfig.criteria === 'client_name'}
          >
            Client Name
          </MenuItem>
          <MenuItem
            onClick={() => handleSortCriteriaChange('event_name')}
            selected={sortConfig.criteria === 'event_name'}
          >
            Event Name
          </MenuItem>
          <MenuItem
            onClick={() => handleSortCriteriaChange('event_date')}
            selected={sortConfig.criteria === 'event_date'}
          >
            Event Date
          </MenuItem>
          <MenuItem
            onClick={() => handleSortCriteriaChange('created_at')}
            selected={sortConfig.criteria === 'created_at'}
          >
            Created Date
          </MenuItem>

          <Divider sx={{ my: 1 }} />

          <MenuItem onClick={handleSortDirectionToggle}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {sortConfig.direction === 'desc' ? <ArrowDownIcon fontSize="small" /> : <ArrowUpIcon fontSize="small" />}
              <Typography variant="body2">
                {sortConfig.direction === 'desc' ? 'Newest First' : 'Oldest First'}
              </Typography>
            </Box>
          </MenuItem>
        </MenuList>
      </Menu>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Thread List Panel */}
        {layoutConfig.showThreadList && (
          <Paper
            elevation={0}
            className="glass"
            sx={{
              width: layoutConfig.threadListWidth,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 0,
              borderRight: `1px solid ${theme.palette.divider}`,
            }}
          >
            {/* Bulk Operations Bar */}
            {selectedThreads.size > 0 && (
              <Alert
                severity="info"
                action={
                  <IconButton
                    size="small"
                    onClick={() => setSelectedThreads(new Set())}
                  >
                    <CloseIcon />
                  </IconButton>
                }
                sx={{ m: 1, borderRadius: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    {selectedThreads.size} selected
                  </Typography>
                  <Button size="small" onClick={handleBulkMarkAsRead}>
                    Mark Read
                  </Button>
                  <Button size="small" onClick={() => handleBulkAssign(1)}>
                    Assign
                  </Button>
                </Box>
              </Alert>
            )}

            {/* Thread List Header */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControlLabel
                  control={
                    <IconButton onClick={handleSelectAll}>
                      {selectedThreads.size === state.threads.length ? (
                        <CheckBoxIcon color="primary" />
                      ) : selectedThreads.size > 0 ? (
                        <CheckBoxBlankIcon color="primary" sx={{ opacity: 0.6 }} />
                      ) : (
                        <CheckBoxBlankIcon />
                      )}
                    </IconButton>
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      {activeThreads.length} active
                      {archivedThreads.length > 0 && `, ${archivedThreads.length} archived`}
                    </Typography>
                  }
                />
              </Box>
            </Box>

            {/* Thread List */}
            <ThreadList
              threads={sortedThreads}
              selectedThreadId={state.selectedThreadId}
              selectedThreads={selectedThreads}
              onThreadSelect={actions.selectThread}
              onThreadSelectionChange={handleSelectThread}
              onArchiveThread={handleArchiveThread}
              onUnarchiveThread={handleUnarchiveThread}
              currentFilters={localFilters}
              sortConfig={sortConfig}
              isLoading={state.isLoadingThreads}
              isArchiving={archiveThreadMutation.isPending}
              isUnarchiving={unarchiveThreadMutation.isPending}
            />
          </Paper>
        )}

        {/* Message View Panel */}
        {layoutConfig.showMessageView && (
          <Box
            sx={{
              width: layoutConfig.messageViewWidth,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
            }}
          >
            {state.selectedThreadId ? (
              <AdminMessageThread
                threadId={state.selectedThreadId}
                showContext={!layoutConfig.showContext}
                enableInternalNotes={config.enableInternalNotes}
              />
            ) : (
              <Box
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'text.secondary',
                }}
              >
                <Box>
                  <MessageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" gutterBottom>
                    Select a conversation
                  </Typography>
                  <Typography variant="body2">
                    Choose a thread from the list to view messages
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Context Panel */}
        {layoutConfig.showContext && state.selectedThreadId && (
          <Paper
            elevation={0}
            className="glass"
            sx={{
              width: layoutConfig.contextWidth,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 0,
              borderLeft: `1px solid ${theme.palette.divider}`,
            }}
          >
            <ContextPanel threadId={state.selectedThreadId} />
          </Paper>
        )}
      </Box>

      {/* Connection Status */}
      {!state.isConnected && (
        <Alert severity="warning" sx={{ m: 1 }}>
          Connection lost. Attempting to reconnect...
        </Alert>
      )}

      {/* Create Thread Dialog */}
      <CreateThreadDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Box>
  );
};

/**
 * Thread List Component
 */
interface ThreadListProps {
  threads: MessageThread[];
  selectedThreadId: string | null;
  selectedThreads: Set<string>;
  onThreadSelect: (threadId: string) => void;
  onThreadSelectionChange: (threadId: string, selected: boolean) => void;
  onArchiveThread?: (threadId: string) => void;
  onUnarchiveThread?: (threadId: string) => void;
  currentFilters?: ThreadFilters;
  sortConfig?: ThreadSortConfig;
  isLoading: boolean;
  isArchiving?: boolean;
  isUnarchiving?: boolean;
}

const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  selectedThreadId,
  selectedThreads,
  onThreadSelect,
  onThreadSelectionChange,
  onArchiveThread,
  onUnarchiveThread,
  currentFilters,
  sortConfig: _sortConfig,
  isLoading,
  isArchiving = false,
  isUnarchiving = false,
}) => {
  const theme = useTheme();
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    element: HTMLElement;
    threadId: string;
  } | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return theme.palette.error.main;
      case 'high':
        return theme.palette.warning.main;
      case 'normal':
        return theme.palette.primary.main;
      case 'low':
        return theme.palette.text.secondary;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'waiting':
        return theme.palette.warning.main;
      case 'resolved':
        return theme.palette.text.secondary;
      default:
        return theme.palette.text.secondary;
    }
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, threadId: string) => {
    event.stopPropagation(); // Prevent thread selection
    setActionMenuAnchor({
      element: event.currentTarget,
      threadId,
    });
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
  };

  const handleArchiveAction = (threadId: string) => {
    if (onArchiveThread) {
      onArchiveThread(threadId);
    }
    // Close menu immediately to provide responsive feedback
    handleActionMenuClose();
  };

  const handleUnarchiveAction = (threadId: string) => {
    if (onUnarchiveThread) {
      onUnarchiveThread(threadId);
    }
    // Close menu immediately to provide responsive feedback
    handleActionMenuClose();
  };

  // Filter threads based on archive status
  const filteredThreads = useMemo(() => {
    if (!currentFilters?.archive_status) return threads;

    switch (currentFilters.archive_status) {
      case 'active':
        return threads.filter(thread => !thread.is_archived);
      case 'archived':
        return threads.filter(thread => thread.is_archived);
      case 'all':
      default:
        return threads;
    }
  }, [threads, currentFilters?.archive_status]);

  if (isLoading) {
    return (
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography color="text.secondary">Loading threads...</Typography>
      </Box>
    );
  }

  if (filteredThreads.length === 0) {
    return (
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3,
        }}
      >
        <Box>
          <MessageIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom>
            No messages found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No conversations match your current filters
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <List sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        {filteredThreads.map((thread) => (
          <ListItem key={thread.id} disablePadding>
            <ListItemButton
              selected={selectedThreadId === thread.id}
              onClick={() => onThreadSelect(thread.id)}
              sx={{
                borderRadius: 2,
                mb: 1,
                p: 2,
                opacity: thread.is_archived ? 0.75 : 1,
                bgcolor: thread.is_archived ? 'rgba(255, 193, 7, 0.08)' : 'transparent',
                border: thread.is_archived ? '1px solid rgba(255, 193, 7, 0.2)' : '1px solid transparent',
                transition: 'all 0.2s ease-in-out',
                position: 'relative',
                '&.Mui-selected': {
                  bgcolor: thread.is_archived ? 'warning.light' : 'primary.main',
                  color: thread.is_archived ? 'warning.contrastText' : 'primary.contrastText',
                  opacity: 1,
                  border: thread.is_archived ? '1px solid rgba(255, 193, 7, 0.5)' : '1px solid transparent',
                  '&:hover': {
                    bgcolor: thread.is_archived ? 'warning.main' : 'primary.dark',
                  },
                },
                '&:hover': {
                  bgcolor: thread.is_archived ? 'rgba(255, 193, 7, 0.12)' : 'action.hover',
                  border: thread.is_archived ? '1px solid rgba(255, 193, 7, 0.3)' : '1px solid transparent',
                  transform: 'translateY(-1px)',
                  boxShadow: thread.is_archived ? '0 2px 8px rgba(255, 193, 7, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                },
                ...(thread.is_archived && {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    bgcolor: 'warning.main',
                    borderRadius: '0 2px 2px 0'
                  }
                })
              }}
            >
              <ListItemAvatar>
                <Box sx={{ position: 'relative' }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {thread.client_name.charAt(0)}
                  </Avatar>
                  {/* Selection checkbox */}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onThreadSelectionChange(
                        thread.id,
                        !selectedThreads.has(thread.id)
                      );
                    }}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: 'background.paper',
                      width: 20,
                      height: 20,
                    }}
                  >
                    {selectedThreads.has(thread.id) ? (
                      <CheckBoxIcon fontSize="inherit" color="primary" />
                    ) : (
                      <CheckBoxBlankIcon fontSize="inherit" />
                    )}
                  </IconButton>
                </Box>
              </ListItemAvatar>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{
                        textDecoration: thread.is_archived ? 'line-through' : 'none',
                        opacity: thread.is_archived ? 0.7 : 1,
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      {thread.event_name}
                    </Typography>
                    {thread.is_archived && (
                      <Tooltip
                        title={`Archived ${thread.archived_at ? new Date(thread.archived_at).toLocaleDateString() : ''} by ${thread.archived_by?.name || 'System'}`}
                        arrow
                      >
                        <Chip
                          icon={<ArchiveIcon />}
                          label="Archived"
                          size="small"
                          sx={{
                            bgcolor: 'warning.light',
                            color: 'warning.contrastText',
                            fontWeight: 500,
                            fontSize: '0.65rem',
                            height: 22,
                            '& .MuiChip-icon': {
                              color: 'warning.contrastText',
                              fontSize: '0.875rem'
                            },
                            animation: `${fadeIn} 0.3s ease-in-out`
                          }}
                        />
                      </Tooltip>
                    )}
                    <Chip
                      size="small"
                      label={thread.priority}
                      sx={{
                        bgcolor: getPriorityColor(thread.priority),
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 20,
                        opacity: thread.is_archived ? 0.6 : 1,
                        transition: 'opacity 0.2s ease-in-out'
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        opacity: thread.is_archived ? 0.8 : 1,
                        transition: 'opacity 0.2s ease-in-out'
                      }}
                    >
                      {thread.client_name}
                    </Typography>
                    {thread.last_message && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mt: 0.5,
                          opacity: thread.is_archived ? 0.7 : 1,
                          fontStyle: thread.is_archived ? 'italic' : 'normal',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        {thread.last_message.content}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Chip
                        size="small"
                        label={thread.status}
                        variant="outlined"
                        sx={{
                          borderColor: getStatusColor(thread.status),
                          color: getStatusColor(thread.status),
                          fontSize: '0.6rem',
                          height: 16,
                          opacity: thread.is_archived ? 0.6 : 1,
                          transition: 'opacity 0.2s ease-in-out'
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          opacity: thread.is_archived ? 0.7 : 1,
                          transition: 'opacity 0.2s ease-in-out'
                        }}
                      >
                        {thread.is_archived && thread.archived_at
                          ? `Archived ${new Date(thread.archived_at).toLocaleDateString()}`
                          : new Date(thread.updated_at).toLocaleDateString()
                        }
                      </Typography>
                    </Box>
                  </Box>
                }
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {thread.unread_count > 0 && (
                  <Badge
                    badgeContent={thread.unread_count}
                    color="primary"
                    max={99}
                  />
                )}
                <IconButton
                  size="small"
                  onClick={(e) => handleActionMenuOpen(e, thread.id)}
                  sx={{
                    opacity: 0.7,
                    '&:hover': {
                      opacity: 1,
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor?.element}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            boxShadow: theme.shadows[3],
          },
        }}
      >
        {actionMenuAnchor && (() => {
          const thread = filteredThreads.find(t => t.id === actionMenuAnchor.threadId);
          if (!thread) return null;

          return thread.is_archived ? (
            <MenuItem
              onClick={() => handleUnarchiveAction(actionMenuAnchor.threadId)}
              disabled={isUnarchiving}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1.5,
                px: 2,
                minHeight: 48,
                opacity: isUnarchiving ? 0.6 : 1,
                '&:hover': {
                  bgcolor: 'success.main',
                  color: 'success.contrastText',
                  '& .MuiSvgIcon-root': {
                    color: 'success.contrastText',
                  },
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <UnarchiveIcon
                fontSize="small"
                sx={{
                  color: isUnarchiving ? 'action.disabled' : 'success.main',
                  transition: 'color 0.2s ease-in-out'
                }}
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {isUnarchiving ? 'Removing from archive...' : 'Remove from archive'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Make thread active again
                </Typography>
              </Box>
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => handleArchiveAction(actionMenuAnchor.threadId)}
              disabled={isArchiving}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1.5,
                px: 2,
                minHeight: 48,
                opacity: isArchiving ? 0.6 : 1,
                '&:hover': {
                  bgcolor: 'warning.main',
                  color: 'warning.contrastText',
                  '& .MuiSvgIcon-root': {
                    color: 'warning.contrastText',
                  },
                },
                '&:disabled': {
                  opacity: 0.5,
                },
              }}
            >
              <ArchiveIcon
                fontSize="small"
                sx={{
                  color: isArchiving ? 'action.disabled' : 'warning.main',
                  transition: 'color 0.2s ease-in-out'
                }}
              />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {isArchiving ? 'Archiving thread...' : 'Archive thread'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Hide from active conversations
                </Typography>
              </Box>
            </MenuItem>
          );
        })()}
      </Menu>
    </>
  );
};

/**
 * Context Panel Component
 */
interface ContextPanelProps {
  threadId: string;
}

const ContextPanel: React.FC<ContextPanelProps> = ({ threadId }) => {
  const { state } = useMessagingContext();
  const thread = state.threads.find(t => t.id === threadId);

  if (!thread) {
    return null;
  }

  return (
    <Box sx={{ p: 2, overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Context
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonIcon color="primary" />
            <Typography variant="subtitle1">Client Information</Typography>
          </Box>
          <Typography variant="body2" gutterBottom>
            <strong>Name:</strong> {thread.client_name}
          </Typography>
          {thread.client_email && (
            <Typography variant="body2" gutterBottom>
              <strong>Email:</strong> {thread.client_email}
            </Typography>
          )}
          {thread.client_phone && (
            <Typography variant="body2">
              <strong>Phone:</strong> {thread.client_phone}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EventIcon color="primary" />
            <Typography variant="subtitle1">Event Details</Typography>
          </Box>
          <Typography variant="body2" gutterBottom>
            <strong>Event:</strong> {thread.event_name}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Date:</strong> {new Date(thread.event_date).toLocaleDateString()}
          </Typography>
          <Typography variant="body2">
            <strong>Status:</strong> {thread.status}
          </Typography>
        </CardContent>
      </Card>

      {thread.assigned_admin && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AssignmentIcon color="primary" />
              <Typography variant="subtitle1">Assigned To</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{ width: 32, height: 32 }}
                src={thread.assigned_admin.avatar}
              >
                {thread.assigned_admin.name.charAt(0)}
              </Avatar>
              <Typography variant="body2">
                {thread.assigned_admin.name}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MessagesOverview;