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
} from '@mui/icons-material';
import { useMessagingContext } from '@shared';
import { AdminMessageThread } from '../../components/messaging/AdminMessageThread';
import type { MessageThread, ThreadFilters } from '@shared/types/messaging.types';

export interface MessagesOverviewProps {
  className?: string;
  defaultView?: 'grid' | 'list';
  enableSearch?: boolean;
  enableFilters?: boolean;
}

type ViewMode = 'grid' | 'list';
type PanelLayout = 'three-panel' | 'two-panel' | 'single-panel';

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

  // Component state
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [panelLayout, setPanelLayout] = useState<PanelLayout>('three-panel');
  const [showContext] = useState(true);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Filter state
  const [localFilters, setLocalFilters] = useState<ThreadFilters>({
    status: undefined,
    priority: undefined,
    assigned_admin: undefined,
  });

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
    const emptyFilters = { status: undefined, priority: undefined, assigned_admin: undefined };
    actions.setThreadFilters(emptyFilters);
    setLocalFilters(emptyFilters);
  }, [actions]);

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
    if (selectedThreads.size === state.threads.length) {
      setSelectedThreads(new Set());
    } else {
      setSelectedThreads(new Set(state.threads.map(t => t.id)));
    }
  }, [selectedThreads.size, state.threads]);

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

  // Filter badges
  const activeFiltersCount = Object.values(localFilters).filter(Boolean).length;

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
                      {state.threads.length} threads
                    </Typography>
                  }
                />
              </Box>
            </Box>

            {/* Thread List */}
            <ThreadList
              threads={state.threads}
              selectedThreadId={state.selectedThreadId}
              selectedThreads={selectedThreads}
              onThreadSelect={actions.selectThread}
              onThreadSelectionChange={handleSelectThread}
              isLoading={state.isLoadingThreads}
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
  isLoading: boolean;
}

const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  selectedThreadId,
  selectedThreads,
  onThreadSelect,
  onThreadSelectionChange,
  isLoading,
}) => {
  const theme = useTheme();

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

  if (isLoading) {
    return (
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="text.secondary">Loading threads...</Typography>
      </Box>
    );
  }

  if (threads.length === 0) {
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
    <List sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
      {threads.map((thread) => (
        <ListItem key={thread.id} disablePadding>
          <ListItemButton
            selected={selectedThreadId === thread.id}
            onClick={() => onThreadSelect(thread.id)}
            sx={{
              borderRadius: 2,
              mb: 1,
              p: 2,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              },
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
                  <Typography variant="subtitle2" noWrap>
                    {thread.event_name}
                  </Typography>
                  <Chip
                    size="small"
                    label={thread.priority}
                    sx={{
                      bgcolor: getPriorityColor(thread.priority),
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" noWrap>
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
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(thread.updated_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              }
            />

            {thread.unread_count > 0 && (
              <Badge
                badgeContent={thread.unread_count}
                color="primary"
                max={99}
              />
            )}
          </ListItemButton>
        </ListItem>
      ))}
    </List>
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