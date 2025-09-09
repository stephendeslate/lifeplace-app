import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Message as MessageIcon,
  Add as AddIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useMessages } from '../../hooks/useMessages';
import { useClients } from '../../hooks/useClients';
import { MessageThread } from '../messaging/admin/MessageThread';
import type { Event } from '../../types/events.types';
import type { MessageThread as MessageThreadType } from '../../types/messaging.types';
import { formatDistanceToNow } from 'date-fns';

interface EventMessagesProps {
  event: Event;
}

interface ThreadCardProps {
  thread: MessageThreadType;
  onThreadClick: (thread: MessageThreadType) => void;
  theme: any;
}

const ThreadCard: React.FC<ThreadCardProps> = ({ thread, onThreadClick, theme }) => {
  const { useClient } = useClients();
  
  // Fetch client data if we have client_id but no client_name
  const shouldFetchClient = thread.client_id && !thread.client_name;
  const { data: clientData } = useClient(thread.client_id!);
  
  // Use client data from API if available, otherwise fallback to thread data
  const displayClientName = (shouldFetchClient && clientData) ? 
    `${clientData.first_name} ${clientData.last_name}`.trim() || clientData.email :
    thread.client_name || 'Unknown Client';

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

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 0, 0, 0.12)',
        p: 3,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
          borderColor: '#1976d2',
        },
      }}
      onClick={() => onThreadClick(thread)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Client Info */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PersonIcon sx={{ fontSize: 16, color: '#1976d2' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {displayClientName}
            </Typography>
            {thread.client_id && (
              <Typography variant="caption" color="text.secondary">
                #{thread.client_id}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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
            {thread.unread_count > 0 && (
              <Chip
                size="small"
                label={`${thread.unread_count} unread`}
                color="error"
                sx={{ height: 20, fontSize: '0.75rem' }}
              />
            )}
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
                mb: 1,
                lineHeight: 1.4,
              }}
            >
              {thread.last_message.content}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {thread.last_message_at ? 
                formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true }) :
                'No messages'
              }
            </Typography>
          </Box>
        </Box>

        {/* Action Arrow */}
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <IconButton
            size="small"
            sx={{
              color: 'text.disabled',
              '&:hover': {
                color: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
              },
            }}
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
};

export const EventMessages: React.FC<EventMessagesProps> = ({ event }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedThread, setSelectedThread] = useState<MessageThreadType | null>(null);
  const [threadDialogOpen, setThreadDialogOpen] = useState(false);

  const { useMessageThreads } = useMessages();
  
  // Filter threads for this specific event
  const { data: allThreads = [], isLoading } = useMessageThreads();
  
  const eventThreads = useMemo(() => {
    return allThreads.filter(thread => thread.event_id === event.id);
  }, [allThreads, event.id]);

  const handleThreadClick = (thread: MessageThreadType) => {
    setSelectedThread(thread);
    setThreadDialogOpen(true);
  };

  const handleCreateNewThread = () => {
    // This would typically navigate to client invitation or thread creation
    console.log('Create new conversation for event:', event.id);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={32} sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading conversations...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Event Communications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All message threads related to {event.name}
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleCreateNewThread}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          New Conversation
        </Button>
      </Box>

      {/* Thread List */}
      {eventThreads.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <MessageIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No conversations yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start a conversation with your event participants
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNewThread}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
            }}
          >
            Start Conversation
          </Button>
        </Card>
      ) : (
        <Stack spacing={2}>
          {eventThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              onThreadClick={handleThreadClick}
              theme={theme}
            />
          ))}
        </Stack>
      )}

      {/* Thread Dialog */}
      <Dialog
        open={threadDialogOpen}
        onClose={() => setThreadDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            height: isMobile ? '100vh' : '80vh',
            maxHeight: isMobile ? '100vh' : '80vh',
            ...(!isMobile && {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(0, 0, 0, 0.12)',
            }),
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            py: 1,
            minHeight: 'auto',
          }}
        >
          <IconButton
            onClick={() => setThreadDialogOpen(false)}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                color: '#d32f2f',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {selectedThread && (
            <MessageThread
              thread={selectedThread}
              isMobile={isMobile}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};