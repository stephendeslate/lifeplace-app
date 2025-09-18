/**
 * ClientMessages - Client Portal Messages Interface
 * 
 * Features:
 * - WhatsApp-style clean messaging interface
 * - Event-specific messaging context
 * - Mobile-first responsive design
 * - Simple file sharing with drag-and-drop
 * - Clear message delivery status
 * - Accessibility compliance
 * - Clean consumer-grade UX
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery,
  Container,
} from '@mui/material';
import {
  Message as MessageIcon,
  Event as EventIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  ChatBubbleOutline as ChatIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useMessagingContext } from '@shared';
import { ClientMessageThread } from '../../components/messaging/ClientMessageThread';
import type { MessageThread } from '@shared/types/messaging.types';

export interface ClientMessagesProps {
  eventId?: string;
  simplified?: boolean;
  showWelcome?: boolean;
}

export const ClientMessages: React.FC<ClientMessagesProps> = ({
  eventId,
  simplified = false,
  showWelcome = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId?: string }>();
  
  // Messaging context
  const { state, actions } = useMessagingContext();
  
  // Component state
  const [selectedThread, setSelectedThread] = useState<string | null>(threadId || null);
  const [showThreadList, setShowThreadList] = useState(!threadId);

  // Filter threads by event if specified
  const filteredThreads = useMemo(() => {
    if (!eventId) return state.threads;
    return state.threads.filter(thread => thread.event_id === parseInt(eventId));
  }, [state.threads, eventId]);

  // Extract stable action reference to prevent callback recreation
  const selectThreadAction = actions.selectThread;

  // Handle thread selection
  const handleThreadSelect = useCallback((threadId: string) => {
    setSelectedThread(threadId);
    selectThreadAction(threadId);

    if (isMobile) {
      setShowThreadList(false);
    }

    // Update URL
    navigate(`/messages/thread/${threadId}`, { replace: true });
  }, [selectThreadAction, isMobile, navigate]);

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setShowThreadList(true);
    setSelectedThread(null);
    selectThreadAction(null);
    navigate('/messages', { replace: true });
  }, [selectThreadAction, navigate]);

  // Auto-select first thread if none selected (use effect without callback dependency)
  useEffect(() => {
    if (!selectedThread && filteredThreads.length > 0 && !isMobile) {
      const firstThreadId = filteredThreads[0].id;
      setSelectedThread(firstThreadId);
      selectThreadAction(firstThreadId);
      navigate(`/messages/thread/${firstThreadId}`, { replace: true });
    }
  }, [filteredThreads, selectedThread, isMobile, selectThreadAction, navigate]);

  // Loading state
  if (state.isLoadingThreads) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <LoadingSkeleton />
      </Container>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error.message}
        </Alert>
      </Container>
    );
  }

  // Mobile layout - single panel
  if (isMobile) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {showThreadList ? (
          <ThreadListView
            threads={filteredThreads}
            onThreadSelect={handleThreadSelect}
            showWelcome={showWelcome}
            eventId={eventId}
          />
        ) : selectedThread ? (
          <ClientMessageThread
            threadId={selectedThread}
            onBack={handleBackToList}
            showBackButton
          />
        ) : null}
      </Box>
    );
  }

  // Desktop layout - two panels
  return (
    <Container maxWidth="lg" sx={{ py: 3, height: 'calc(100vh - 140px)' }}>
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        {/* Thread List Panel */}
        <Paper
          sx={{
            width: '350px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <ThreadListView
            threads={filteredThreads}
            selectedThreadId={selectedThread}
            onThreadSelect={handleThreadSelect}
            showWelcome={false}
            eventId={eventId}
          />
        </Paper>

        {/* Message View Panel */}
        <Paper
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          {selectedThread ? (
            <ClientMessageThread
              threadId={selectedThread}
              simplified={simplified}
            />
          ) : (
            <EmptyStateView showWelcome={showWelcome} />
          )}
        </Paper>
      </Box>
    </Container>
  );
};

/**
 * Thread List View Component
 */
interface ThreadListViewProps {
  threads: MessageThread[];
  selectedThreadId?: string | null;
  onThreadSelect: (threadId: string) => void;
  showWelcome: boolean;
  eventId?: string;
}

const ThreadListView: React.FC<ThreadListViewProps> = ({
  threads,
  selectedThreadId,
  onThreadSelect,
  showWelcome,
  eventId,
}) => {
  const theme = useTheme();

  const getStatusIcon = (thread: MessageThread) => {
    if (thread.status === 'resolved') {
      return <CheckIcon fontSize="small" color="success" />;
    }
    if (thread.unread_count > 0) {
      return <ChatIcon fontSize="small" color="primary" />;
    }
    return <DoneAllIcon fontSize="small" color="action" />;
  };

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    }
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    }
    if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Header */}
      <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Messages
        </Typography>
        {eventId && (
          <Chip
            icon={<EventIcon />}
            label="Event-specific"
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      {/* Welcome Message */}
      {showWelcome && !eventId && (
        <Alert
          severity="info"
          sx={{ 
            m: 2, 
            borderRadius: 2,
            '& .MuiAlert-message': {
              fontSize: '0.875rem',
            }
          }}
        >
          Welcome! Here you can chat with our team about your events. We're here to help make your experience amazing!
        </Alert>
      )}

      {/* Thread List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {threads.length === 0 ? (
          <EmptyThreadList eventId={eventId} />
        ) : (
          <List sx={{ p: 1 }}>
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
                      bgcolor: 'primary.50',
                      borderLeft: `3px solid ${theme.palette.primary.main}`,
                      '&:hover': {
                        bgcolor: 'primary.100',
                      },
                    },
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: thread.unread_count > 0 ? 'primary.main' : 'grey.400',
                        color: 'white',
                      }}
                    >
                      <EventIcon />
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="subtitle2"
                          noWrap
                          sx={{
                            fontWeight: thread.unread_count > 0 ? 600 : 400,
                            color: thread.unread_count > 0 ? 'text.primary' : 'text.secondary',
                            flexGrow: 1,
                          }}
                        >
                          {thread.event_name}
                        </Typography>
                        {getStatusIcon(thread)}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: '0.8rem', mb: 0.5 }}
                        >
                          {new Date(thread.event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Typography>
                        {thread.last_message && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              color: 'text.secondary',
                              fontSize: '0.75rem',
                            }}
                          >
                            {thread.last_message.sender_name}: {thread.last_message.content}
                          </Typography>
                        )}
                        {thread.last_message && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5, fontSize: '0.7rem' }}
                          >
                            {formatLastMessageTime(thread.last_message.sent_at)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />

                  {thread.unread_count > 0 && (
                    <Chip
                      label={thread.unread_count}
                      size="small"
                      color="primary"
                      sx={{
                        minWidth: 24,
                        height: 24,
                        fontSize: '0.7rem',
                        '& .MuiChip-label': {
                          px: 1,
                        },
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </>
  );
};

/**
 * Empty Thread List Component
 */
const EmptyThreadList: React.FC<{ eventId?: string }> = ({ eventId }) => (
  <Box
    sx={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      p: 3,
    }}
  >
    <Box>
      <MessageIcon
        sx={{
          fontSize: 64,
          color: 'text.secondary',
          opacity: 0.3,
          mb: 2,
        }}
      />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {eventId ? 'No messages for this event' : 'No conversations yet'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {eventId
          ? 'Start a conversation about your event with our team'
          : 'Your conversations will appear here when you start messaging with our team'
        }
      </Typography>
    </Box>
  </Box>
);

/**
 * Empty State View Component
 */
const EmptyStateView: React.FC<{ showWelcome: boolean }> = ({ showWelcome }) => (
  <Box
    sx={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      p: 4,
    }}
  >
    <Box sx={{ maxWidth: 400 }}>
      <MessageIcon
        sx={{
          fontSize: 80,
          color: 'primary.main',
          opacity: 0.7,
          mb: 3,
        }}
      />
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Select a conversation
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Choose a conversation from the list to start chatting with our team
      </Typography>
      {showWelcome && (
        <Card sx={{ mt: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="body2" color="primary.dark">
              💬 <strong>Pro tip:</strong> Our team is here to help with any questions about your events. 
              Feel free to reach out anytime!
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  </Box>
);

/**
 * Loading Skeleton Component
 */
const LoadingSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', gap: 2, height: '600px' }}>
    <Paper sx={{ width: '350px', p: 2 }}>
      <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
      {[...Array(5)].map((_, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        </Box>
      ))}
    </Paper>
    <Paper sx={{ flexGrow: 1, p: 2 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height="80%" />
    </Paper>
  </Box>
);

export default ClientMessages;