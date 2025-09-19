/**
 * ClientThreadList - Thread List Component for Client Portal
 *
 * Features:
 * - Event-focused thread display
 * - Unread message indicators
 * - Simple filtering (by event)
 * - Consumer-grade UX
 * - Mobile-optimized touch interactions
 */

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Message as MessageIcon,
  Event as EventIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  ChatBubbleOutline as ChatIcon,
} from '@mui/icons-material';
import type { MessageThread } from '@shared/types/messaging.types';

export interface ClientThreadListProps {
  threads: MessageThread[];
  selectedThreadId?: string | null;
  onThreadSelect: (threadId: string) => void;
  showWelcome: boolean;
  eventId?: string;
}

export const ClientThreadList: React.FC<ClientThreadListProps> = ({
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

  const formatLastMessageTime = (dateString: string | null) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

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
                          {thread.event_name || thread.subject || 'General Message'}
                        </Typography>
                        {getStatusIcon(thread)}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {thread.created_at && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: '0.8rem', mb: 0.5 }}
                          >
                            {new Date(thread.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Typography>
                        )}
                        {thread.last_message_content && (
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
                            {thread.last_message_sender_name}: {thread.last_message_content}
                          </Typography>
                        )}
                        {thread.last_message_at && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.5, fontSize: '0.7rem' }}
                          >
                            {formatLastMessageTime(thread.last_message_at)}
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

export default ClientThreadList;