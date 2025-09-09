// frontend/client-portal/src/components/messaging/MessageList.tsx

import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  IconButton,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Event as EventIcon,
  FilterList as FilterIcon,
  Circle as UnreadIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import type { MessageThread } from '../../types/messaging.types';

interface MessageListProps {
  threads: MessageThread[];
  selectedThreadId?: string;
  onThreadSelect: (thread: MessageThread) => void;
  isLoading?: boolean;
  userRole?: 'CLIENT' | 'ADMIN';
}

export const MessageList: React.FC<MessageListProps> = ({
  threads,
  selectedThreadId,
  onThreadSelect,
  isLoading = false,
  userRole = 'CLIENT',
}) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          thread.last_message?.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = !filterPriority || thread.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return theme.palette.error.main;
      case 'high': return theme.palette.warning.main;
      case 'normal': return theme.palette.info.main;
      case 'low': return theme.palette.grey[500];
      default: return theme.palette.grey[500];
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': 
        return <Chip label="Active" size="small" color="success" sx={{ height: 18 }} />;
      case 'waiting': 
        return <Chip label="Waiting" size="small" color="warning" sx={{ height: 18 }} />;
      case 'resolved': 
        return <Chip label="Resolved" size="small" variant="outlined" sx={{ height: 18 }} />;
      default: 
        return null;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search and Filters */}
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search events..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small">
                  <FilterIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha('#fff', 0.7),
            },
          }}
        />

        {/* Priority Filter Chips */}
        {userRole === 'ADMIN' && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip
              label="All"
              size="small"
              variant={!filterPriority ? 'filled' : 'outlined'}
              onClick={() => setFilterPriority(null)}
            />
            <Chip
              label="Urgent"
              size="small"
              color="error"
              variant={filterPriority === 'urgent' ? 'filled' : 'outlined'}
              onClick={() => setFilterPriority('urgent')}
            />
            <Chip
              label="High"
              size="small"
              color="warning"
              variant={filterPriority === 'high' ? 'filled' : 'outlined'}
              onClick={() => setFilterPriority('high')}
            />
            <Chip
              label="Normal"
              size="small"
              color="info"
              variant={filterPriority === 'normal' ? 'filled' : 'outlined'}
              onClick={() => setFilterPriority('normal')}
            />
          </Stack>
        )}
      </GlassCard>

      {/* Thread List */}
      <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {filteredThreads.map((thread, index) => (
          <AnimatedElement key={thread.id} animation="slideUp" delay={index * 50}>
            <ListItem
              disablePadding
              sx={{ mb: 1 }}
            >
              <GlassCard
                variant={selectedThreadId === thread.id ? 'light' : 'dark'}
                intensity="medium"
                hover
                sx={{
                  width: '100%',
                  p: 0,
                  border: selectedThreadId === thread.id 
                    ? `2px solid ${theme.palette.primary.main}`
                    : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <ListItemButton
                  onClick={() => onThreadSelect(thread)}
                  sx={{ p: 2 }}
                >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={thread.unread_count}
                      color="primary"
                      overlap="circular"
                    >
                      <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                        <EventIcon sx={{ color: theme.palette.primary.main }} />
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: thread.unread_count > 0 ? 600 : 400,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {thread.event_name}
                        </Typography>
                        {thread.priority === 'urgent' && (
                          <Typography
                            sx={{ 
                              fontSize: 16, 
                              color: getPriorityColor('urgent'),
                              fontWeight: 'bold',
                            }} 
                          >
                            !
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {getRelativeTime(thread.last_message?.sent_at || thread.updated_at)}
                        </Typography>
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5}>
                        {thread.last_message && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: thread.unread_count > 0 ? 500 : 400,
                            }}
                          >
                            {thread.last_message.sender_name}: {thread.last_message.content}
                          </Typography>
                        )}
                        
                        <Stack direction="row" spacing={1} alignItems="center">
                          {getStatusBadge(thread.status)}
                          
                          {thread.assigned_admin && userRole === 'CLIENT' && (
                            <Typography variant="caption" color="text.secondary">
                              {thread.assigned_admin.name}
                            </Typography>
                          )}
                          
                          {thread.unread_count > 0 && (
                            <UnreadIcon 
                              sx={{ 
                                fontSize: 8, 
                                color: theme.palette.primary.main 
                              }} 
                            />
                          )}
                        </Stack>
                      </Stack>
                    }
                  />
                </ListItemButton>
              </GlassCard>
            </ListItem>
          </AnimatedElement>
        ))}

        {filteredThreads.length === 0 && !isLoading && (
          <AnimatedElement animation="fadeIn">
            <GlassCard
              variant="light"
              intensity="subtle"
              sx={{
                p: 4,
                textAlign: 'center',
                mt: 4,
              }}
            >
              <Typography variant="h6" gutterBottom>
                No Conversations Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm 
                  ? `No events match "${searchTerm}"`
                  : 'You don\'t have any event conversations yet'
                }
              </Typography>
            </GlassCard>
          </AnimatedElement>
        )}
      </List>
    </Box>
  );
};

export default MessageList;