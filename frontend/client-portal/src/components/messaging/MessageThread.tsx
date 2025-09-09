// frontend/client-portal/src/components/messaging/MessageThread.tsx

import React, { useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Event as EventIcon,
  CalendarToday as DateIcon,
  MoreVert as MoreIcon,
  Warning as UrgentIcon,
  Phone as CallIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import type { MessageThread as ThreadType, Message, QuickAction } from '../../types/messaging.types';

interface MessageThreadProps {
  thread: ThreadType | null;
  messages: Message[];
  currentUserId: number;
  userRole: 'CLIENT' | 'ADMIN';
  isLoading?: boolean;
  onSendMessage: (content: string, attachments?: File[]) => void;
  onQuickAction?: (action: QuickAction) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  thread,
  messages,
  currentUserId,
  userRole,
  isLoading = false,
  onSendMessage,
  onQuickAction,
  onClose,
  isMobile = false,
}) => {
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'waiting': return 'warning';
      case 'resolved': return 'default';
      default: return 'default';
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const quickActions: QuickAction[] = userRole === 'CLIENT' ? [
    {
      id: 'urgent',
      label: 'Mark Urgent',
      icon: 'warning',
      action: 'mark_urgent',
      enabled: thread?.priority !== 'urgent',
    },
    {
      id: 'callback',
      label: 'Request Callback',
      icon: 'phone',
      action: 'request_callback',
      enabled: true,
    },
  ] : [];

  if (!thread) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 4,
      }}>
        <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
          <EventIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Select a Conversation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose an event from the list to start messaging
          </Typography>
        </GlassCard>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Thread Header */}
      <GlassCard
        variant="light"
        intensity="strong"
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {isMobile && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}

          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
            <EventIcon />
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {thread.event_name}
              </Typography>
              <Chip
                label={thread.priority}
                size="small"
                color={getPriorityColor(thread.priority) as 'error' | 'warning' | 'info' | 'default'}
                sx={{ height: 20 }}
              />
              <Chip
                label={thread.status}
                size="small"
                color={getStatusColor(thread.status) as 'success' | 'warning' | 'default'}
                variant="outlined"
                sx={{ height: 20 }}
              />
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <DateIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {formatEventDate(thread.event_date)}
                </Typography>
              </Stack>

              {thread.assigned_admin && (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Avatar
                    src={thread.assigned_admin.avatar}
                    sx={{ width: 16, height: 16 }}
                  >
                    {thread.assigned_admin.name[0]}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {thread.assigned_admin.name}
                  </Typography>
                </Stack>
              )}

              {thread.unread_count > 0 && (
                <Chip
                  label={`${thread.unread_count} unread`}
                  size="small"
                  color="primary"
                  sx={{ height: 18, fontSize: '0.7rem' }}
                />
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            {quickActions.map((action) => (
              <IconButton
                key={action.id}
                size="small"
                disabled={!action.enabled}
                onClick={() => onQuickAction?.(action)}
                sx={{
                  backgroundColor: alpha(theme.palette.grey[500], 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.grey[500], 0.2),
                  },
                }}
              >
                {action.icon === 'warning' && <UrgentIcon fontSize="small" />}
                {action.icon === 'phone' && <CallIcon fontSize="small" />}
              </IconButton>
            ))}
            <IconButton size="small">
              <MoreIcon />
            </IconButton>
          </Stack>
        </Stack>
      </GlassCard>

      {/* Messages Area */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        p: 2,
        minHeight: 0, // Important: allows flex child to shrink below content size
      }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <AnimatedElement animation="fadeIn">
            <GlassCard
              variant="light"
              intensity="subtle"
              sx={{
                p: 3,
                textAlign: 'center',
                maxWidth: 400,
                mx: 'auto',
                mt: 4,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Start the Conversation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Send a message to begin discussing your {thread.event_name} event
              </Typography>
            </GlassCard>
          </AnimatedElement>
        ) : (
          <>
            {messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
              
              const isFirstInGroup = !prevMessage || prevMessage.sender.id !== message.sender.id;
              const isLastInGroup = !nextMessage || nextMessage.sender.id !== message.sender.id;
              
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender.id === currentUserId}
                  showAvatar={true}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* Message Composer */}
      <Box sx={{ flexShrink: 0 }}>
        <MessageComposer
          threadId={thread.id}
          onSend={onSendMessage}
          disabled={thread.status === 'resolved'}
          placeholder={
            thread.status === 'resolved' 
              ? 'This conversation has been resolved'
              : 'Type your message...'
          }
        />
      </Box>
    </Box>
  );
};

export default MessageThread;