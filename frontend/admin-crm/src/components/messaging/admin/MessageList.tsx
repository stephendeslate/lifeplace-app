import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Stack,
  Tooltip,
  Badge,
  Divider,
  FormControl,
  InputLabel,
  Select,
  type SelectChangeEvent,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  PriorityHigh as UrgentIcon,
  Phone as CallbackIcon,
  Check as ResolveIcon,
  Refresh as ReopenIcon,
  Event as EventIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Message as MessageIcon,
} from '@mui/icons-material';
import { useMessages } from '../../../hooks/useMessages';
import type { MessageThread, MessageFilters } from '../../../types/messaging.types';
import { formatDistanceToNow } from 'date-fns';

interface AdminMessageListProps {
  onThreadSelect: (thread: MessageThread) => void;
  selectedThreadId?: string;
  filters?: MessageFilters;
  onFiltersChange?: (filters: MessageFilters) => void;
}

export const MessageList: React.FC<AdminMessageListProps> = ({
  onThreadSelect,
  selectedThreadId,
  filters = {},
  onFiltersChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  const {
    useMessageThreads,
    markUrgent,
    requestCallback,
    resolveThread,
    reopenThread,
    markRead,
    isMarkingUrgent,
    isRequestingCallback,
    isResolvingThread,
    isReopeningThread,
  } = useMessages();

  const { data: threads = [], isLoading } = useMessageThreads(filters);

  const filteredThreads = useMemo(() => {
    if (!searchTerm.trim()) return threads;
    
    const search = searchTerm.toLowerCase();
    return threads.filter(thread => 
      thread.event_name?.toLowerCase().includes(search) ||
      thread.client_name?.toLowerCase().includes(search) ||
      thread.last_message?.content.toLowerCase().includes(search)
    );
  }, [threads, searchTerm]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, thread: MessageThread) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedThread(thread);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedThread(null);
  };

  const handleThreadClick = async (thread: MessageThread) => {
    onThreadSelect(thread);
    if (thread.unread_count > 0) {
      await markRead.mutateAsync(thread.id);
    }
  };

  const handleMarkUrgent = async () => {
    if (selectedThread) {
      await markUrgent.mutateAsync(selectedThread.id);
    }
    handleMenuClose();
  };

  const handleRequestCallback = async () => {
    if (selectedThread) {
      await requestCallback.mutateAsync(selectedThread.id);
    }
    handleMenuClose();
  };

  const handleResolve = async () => {
    if (selectedThread) {
      await resolveThread.mutateAsync(selectedThread.id);
    }
    handleMenuClose();
  };

  const handleReopen = async () => {
    if (selectedThread) {
      await reopenThread.mutateAsync(selectedThread.id);
    }
    handleMenuClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'primary';
      case 'low': return 'secondary';
      default: return 'primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'waiting': return 'warning';
      case 'resolved': return 'secondary';
      default: return 'primary';
    }
  };

  if (isLoading) {
    return (
      <Card sx={{ 
        p: 4, 
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <CircularProgress size={32} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading conversations...
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search and Filters */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
            },
          }}
        />

        {onFiltersChange && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={filters.priority || ''}
                label="Priority"
                onChange={(e: SelectChangeEvent) => 
                  onFiltersChange({ ...filters, priority: e.target.value || undefined })
                }
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                label="Status"
                onChange={(e: SelectChangeEvent) => 
                  onFiltersChange({ ...filters, status: e.target.value || undefined })
                }
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="waiting">Waiting</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        )}
      </Box>

      {/* Thread List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredThreads.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <MessageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No conversations found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'Try adjusting your search or filters' : 'No messages yet'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1} sx={{ p: 1 }}>
            {filteredThreads.map((thread) => (
                <Card
                  key={thread.id}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    border: selectedThreadId === thread.id ? 
                      '2px solid #1976d2' : 
                      '1px solid rgba(0, 0, 0, 0.12)',
                    bgcolor: selectedThreadId === thread.id ? 
                      'rgba(25, 118, 210, 0.04)' : 
                      'background.paper',
                    
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme => theme.shadows[4],
                      bgcolor: selectedThreadId === thread.id ? 
                        'rgba(25, 118, 210, 0.08)' : 
                        'rgba(0, 0, 0, 0.02)',
                    },
                  }}
                  onClick={() => handleThreadClick(thread)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    {/* Avatar */}
                    <Badge
                      badgeContent={thread.unread_count}
                      color="primary"
                      max={99}
                      invisible={thread.unread_count === 0}
                    >
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: `${getPriorityColor(thread.priority)}.main`,
                          fontSize: '0.875rem',
                        }}
                      >
                        {thread.client_name?.charAt(0) || thread.event_name?.charAt(0) || 'E'}
                      </Avatar>
                    </Badge>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: thread.unread_count > 0 ? 700 : 600,
                            color: 'text.primary',
                          }}
                          noWrap
                        >
                          {thread.event_name}
                        </Typography>
                        
                        <Chip
                          size="small"
                          label={thread.priority}
                          color={getPriorityColor(thread.priority)}
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                        
                        <Chip
                          size="small"
                          label={thread.status}
                          color={getStatusColor(thread.status)}
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {thread.client_name || 'No client'}
                        </Typography>
                        
                        <EventIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 1 }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          Event #{thread.event_id}
                        </Typography>
                      </Box>

                      {thread.last_message && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            fontSize: '0.8rem',
                            lineHeight: 1.3,
                          }}
                        >
                          {thread.last_message.content}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <TimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {thread.last_message_at ? 
                            formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true }) :
                            'No messages'
                          }
                        </Typography>
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Tooltip title="More actions">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, thread)}
                        sx={{
                          opacity: 0.7,
                          '&:hover': { opacity: 1 },
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {selectedThread?.priority !== 'urgent' && (
          <MenuItem onClick={handleMarkUrgent} disabled={isMarkingUrgent}>
            <ListItemIcon>
              <UrgentIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Mark as Urgent</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem onClick={handleRequestCallback} disabled={isRequestingCallback}>
          <ListItemIcon>
            <CallbackIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Request Callback</ListItemText>
        </MenuItem>

        <Divider />
        
        {selectedThread?.status === 'resolved' ? (
          <MenuItem onClick={handleReopen} disabled={isReopeningThread}>
            <ListItemIcon>
              <ReopenIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Reopen Thread</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={handleResolve} disabled={isResolvingThread}>
            <ListItemIcon>
              <ResolveIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Mark as Resolved</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};