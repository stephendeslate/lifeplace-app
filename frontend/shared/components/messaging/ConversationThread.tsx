/**
 * ConversationThread - Displays and manages message conversations
 * 
 * Features:
 * - Message display with proper formatting
 * - Virtualization for large message lists
 * - Loading states and error handling
 * - Message interaction support
 * - Scroll management and auto-scroll
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Avatar,
  Chip,
  Skeleton,
  styled,
  useTheme
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

import { VirtualMessageList, type VirtualMessageListRef } from './performance/VirtualMessageList';
import { ReadReceipts } from './realtime/ReadReceipts';
import type { Message, User } from '../../types/messaging.types';

const ThreadContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}));

const MessageBubble = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isOwn',
})<{ isOwn: boolean }>(({ theme, isOwn }) => ({
  maxWidth: '75%',
  padding: theme.spacing(1.5, 2),
  marginBottom: theme.spacing(1),
  marginLeft: isOwn ? 'auto' : 0,
  marginRight: isOwn ? 0 : 'auto',
  borderRadius: theme.spacing(2),
  backgroundColor: isOwn 
    ? theme.palette.primary.main 
    : theme.palette.background.paper,
  color: isOwn 
    ? theme.palette.primary.contrastText 
    : theme.palette.text.primary,
  boxShadow: theme.shadows[1],
  border: `1px solid ${theme.palette.divider}`,
  wordBreak: 'break-word',
  position: 'relative',
  
  '&.system': {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
    textAlign: 'center',
    margin: '0 auto',
    maxWidth: '90%',
  },
  
  '&.event_update': {
    backgroundColor: theme.palette.info.light,
    color: theme.palette.info.contrastText,
    borderLeft: `4px solid ${theme.palette.info.main}`,
  }
}));

const MessageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
}));

const MessageContent = styled(Typography)({
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

const LoadMoreButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1, 'auto'),
  borderRadius: theme.spacing(3),
}));

const EmptyState = styled(Box)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

export interface ConversationThreadProps {
  threadId?: string;
  messages?: Message[];
  onMessageClick?: (messageId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  onMarkAsRead?: (messageId?: string) => Promise<void>;
  userRole?: 'CLIENT' | 'ADMIN';
  enableVirtualization?: boolean;
  currentUser?: User;
  height?: number;
  showTimestamps?: boolean;
  showAvatars?: boolean;
  autoScrollToBottom?: boolean;
}

export const ConversationThread: React.FC<ConversationThreadProps> = ({
  threadId,
  messages = [],
  onMessageClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  onMarkAsRead,
  userRole = 'CLIENT',
  enableVirtualization = true,
  currentUser,
  height = 500,
  showTimestamps = true,
  showAvatars = true,
  autoScrollToBottom = true
}) => {
  const theme = useTheme();
  const virtualListRef = useRef<VirtualMessageListRef>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Mock current user if not provided
  const defaultUser: User = useMemo(() => currentUser || {
    id: 1,
    name: 'Current User',
    first_name: 'Current',
    email: 'user@example.com',
    role: userRole,
  }, [currentUser, userRole]);

  // Format message timestamp
  const formatMessageTime = useCallback((timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  }, []);

  // Handle load more messages
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !onLoadMore) return;
    
    try {
      setLoadingMore(true);
      setError(null);
      await onLoadMore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, onLoadMore]);

  // Handle message click
  const handleMessageClick = useCallback((message: Message) => {
    if (onMessageClick) {
      onMessageClick(message.id);
    }
    
    // Mark as read if this is a received message
    if (onMarkAsRead && message.sender.id !== defaultUser.id) {
      onMarkAsRead(message.id).catch(console.error);
    }
  }, [onMessageClick, onMarkAsRead, defaultUser.id]);

  // Custom message renderer for the virtual list
  const messageRenderer = useCallback((message: Message, index: number) => {
    const isOwn = message.sender.id === defaultUser.id;
    const showAvatar = showAvatars && !isOwn;
    const isSystem = message.message_type === 'system';
    const isEventUpdate = message.message_type === 'event_update';

    return (
      <Box
        key={message.id}
        sx={{ 
          p: 1,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-start',
          justifyContent: isOwn ? 'flex-end' : 'flex-start'
        }}
      >
        {/* Avatar for received messages */}
        {showAvatar && (
          <Avatar
            src={message.sender.avatar}
            sx={{ width: 32, height: 32, mt: 0.5 }}
          >
            {message.sender.name?.[0]?.toUpperCase() || <PersonIcon />}
          </Avatar>
        )}

        <Box sx={{ 
          maxWidth: isSystem ? '90%' : '75%',
          width: isSystem ? 'auto' : undefined 
        }}>
          <MessageBubble
            isOwn={isOwn}
            className={isSystem ? 'system' : isEventUpdate ? 'event_update' : ''}
            onClick={() => handleMessageClick(message)}
            sx={{ cursor: onMessageClick ? 'pointer' : 'default' }}
          >
            {/* Message header with sender info and timestamp */}
            {!isSystem && (showTimestamps || !isOwn) && (
              <MessageHeader>
                {!isOwn && (
                  <>
                    <Typography variant="caption" fontWeight="bold">
                      {message.sender.name}
                    </Typography>
                    {message.sender.role === 'ADMIN' && (
                      <Chip 
                        label="Admin" 
                        size="small" 
                        color="primary"
                        sx={{ height: 16, fontSize: '0.6rem' }}
                      />
                    )}
                  </>
                )}
                {showTimestamps && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                    <TimeIcon sx={{ fontSize: 12 }} />
                    <Typography variant="caption">
                      {formatMessageTime(message.created_at)}
                    </Typography>
                  </Box>
                )}
              </MessageHeader>
            )}

            {/* Message content */}
            <MessageContent variant="body2">
              {message.content}
            </MessageContent>

            {/* Message attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {message.attachments.map((attachment) => (
                  <Chip
                    key={attachment.id}
                    label={attachment.filename}
                    size="small"
                    onClick={() => window.open(attachment.file_url, '_blank')}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}

            {/* Read receipts for sent messages */}
            {isOwn && message.read_by && message.read_by.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <ReadReceipts
                  status="read"
                  readBy={message.read_by.map(userId => ({
                    id: userId,
                    name: `User ${userId}`,
                    email: `user${userId}@example.com`,
                    readAt: message.created_at,
                  }))}
                  size="small"
                />
              </Box>
            )}
          </MessageBubble>
        </Box>
      </Box>
    );
  }, [defaultUser.id, showAvatars, showTimestamps, handleMessageClick, formatMessageTime]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScrollToBottom && virtualListRef.current) {
      virtualListRef.current.scrollToBottom();
    }
  }, [messages.length, autoScrollToBottom]);

  // Show error state
  if (error) {
    return (
      <ThreadContainer>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => setError(null)}>
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      </ThreadContainer>
    );
  }

  // Show empty state
  if (!threadId) {
    return (
      <EmptyState>
        <PersonIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" gutterBottom>
          No conversation selected
        </Typography>
        <Typography variant="body2">
          Select a conversation to view messages
        </Typography>
      </EmptyState>
    );
  }

  // Show loading state for initial load
  if (isLoading && messages.length === 0) {
    return (
      <ThreadContainer>
        <Box sx={{ p: 2 }}>
          {[...Array(3)].map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="rectangular" width="80%" height={60} sx={{ borderRadius: 2 }} />
              </Box>
            </Box>
          ))}
        </Box>
      </ThreadContainer>
    );
  }

  // Show empty messages state
  if (messages.length === 0) {
    return (
      <EmptyState>
        <PersonIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" gutterBottom>
          No messages yet
        </Typography>
        <Typography variant="body2">
          Start the conversation by sending a message
        </Typography>
      </EmptyState>
    );
  }

  return (
    <ThreadContainer>
      {/* Load more button */}
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
          <LoadMoreButton
            variant="outlined"
            size="small"
            onClick={handleLoadMore}
            disabled={loadingMore}
            startIcon={loadingMore ? <CircularProgress size={16} /> : <ExpandMoreIcon />}
          >
            {loadingMore ? 'Loading...' : 'Load earlier messages'}
          </LoadMoreButton>
        </Box>
      )}

      {/* Messages list */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {enableVirtualization && messages.length > 50 ? (
          <VirtualMessageList
            ref={virtualListRef}
            messages={messages}
            currentUser={defaultUser}
            thread={{} as any} // Thread not needed for basic display
            height={height}
            loading={isLoading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onMessageClick={handleMessageClick}
            messageRenderer={messageRenderer}
          />
        ) : (
          // Simple scrollable list for smaller message counts
          <Box sx={{ 
            height: '100%', 
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': { 
              backgroundColor: theme.palette.divider,
              borderRadius: 3 
            }
          }}>
            {messages.map((message, index) => messageRenderer(message, index))}
            
            {/* Loading indicator at bottom */}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </ThreadContainer>
  );
};

export default ConversationThread;