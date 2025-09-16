/**
 * ClientMessageThread - Client-Facing Message Thread Component
 * 
 * Features:
 * - Simple, clean WhatsApp-style interface
 * - Mobile-optimized touch interactions
 * - File sharing with drag-and-drop
 * - Clear message delivery status
 * - Accessibility compliance
 * - Consumer-grade user experience
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Avatar,
  Chip,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useMessagingContext } from '@shared';
import { ClientMessageComposer } from './ClientMessageComposer';
import type { Message } from '@shared/types/messaging.types';

export interface ClientMessageThreadProps {
  threadId: string;
  simplified?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export const ClientMessageThread: React.FC<ClientMessageThreadProps> = ({
  threadId,
  simplified: _simplified = false,
  showBackButton = false,
  onBack,
  className,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Messaging context
  const { state, actions, config } = useMessagingContext();
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Get current thread
  const currentThread = state.threads.find(t => t.id === threadId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    const unreadMessages = state.messages.filter(msg => !msg.read_by.includes(1)); // Current user ID
    unreadMessages.forEach(msg => {
      actions.markAsRead(msg.id);
    });
  }, [state.messages, actions]);

  if (!currentThread) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <Typography color="text.secondary">Thread not found</Typography>
      </Box>
    );
  }

  return (
    <Box
      className={className}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Thread Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          borderRadius: 0,
          bgcolor: 'background.paper',
        }}
      >
        {showBackButton && (
          <IconButton onClick={onBack} edge="start">
            <ArrowBackIcon />
          </IconButton>
        )}
        
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          {currentThread.event_name.charAt(0)}
        </Avatar>
        
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {currentThread.event_name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {new Date(currentThread.event_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={currentThread.status}
            size="small"
            color={
              currentThread.status === 'active' ? 'success' :
              currentThread.status === 'waiting' ? 'warning' :
              'default'
            }
            sx={{ textTransform: 'capitalize' }}
          />
          
          {state.isConnected ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                }}
              />
              <Typography variant="caption" color="success.main">
                Online
              </Typography>
            </Box>
          ) : (
            <Typography variant="caption" color="warning.main">
              Connecting...
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Connection Status */}
      {!state.isConnected && (
        <Alert severity="warning" sx={{ m: 1 }}>
          Connection lost. Your messages will be sent when connection is restored.
        </Alert>
      )}

      {/* Messages Area */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 1,
          bgcolor: '#f8f9fa',
        }}
      >
        {state.isLoadingMessages && (
          <LinearProgress sx={{ mb: 2 }} />
        )}

        <ClientMessageList
          messages={state.messages}
          currentUserId={1} // This should come from auth context
          onLoadMore={actions.loadMoreMessages}
          hasMore={state.hasMoreMessages}
        />

        {/* Typing Indicators */}
        {state.typingUsers.length > 0 && (
          <TypingIndicator users={state.typingUsers} />
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Message Composer */}
      <Box sx={{ bgcolor: 'background.paper' }}>
        <ClientMessageComposer
          threadId={threadId}
          placeholder="Type your message..."
          maxLength={2000}
          enableFiles={config.enableFileUploads}
          autoFocus={!isMobile}
        />
      </Box>
    </Box>
  );
};

/**
 * Client Message List Component
 */
interface ClientMessageListProps {
  messages: Message[];
  currentUserId: number;
  onLoadMore: () => void;
  hasMore: boolean;
}

const ClientMessageList: React.FC<ClientMessageListProps> = ({
  messages,
  currentUserId,
  onLoadMore,
  hasMore,
}) => {
  // Load more when scrolled to top
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget;
    if (scrollTop === 0 && hasMore) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore]);

  if (messages.length === 0) {
    return (
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
        <Card sx={{ maxWidth: 400, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="h6" color="primary.dark" gutterBottom>
              👋 Welcome to your conversation!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This is the start of your conversation with our team. 
              We're here to help make your event amazing!
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100%' }} onScroll={handleScroll}>
      {messages.map((message, index) => (
        <ClientMessageItem
          key={message.id}
          message={message}
          isOwnMessage={message.sender.id === currentUserId}
          showAvatar={
            index === 0 || 
            messages[index - 1].sender.id !== message.sender.id
          }
          showTimestamp={
            index === 0 ||
            new Date(message.created_at).getTime() - 
            new Date(messages[index - 1].created_at).getTime() > 300000 // 5 minutes
          }
        />
      ))}
    </Box>
  );
};

/**
 * Individual Client Message Item
 */
interface ClientMessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
}

const ClientMessageItem: React.FC<ClientMessageItemProps> = ({
  message,
  isOwnMessage,
  showAvatar,
  showTimestamp,
}) => {
  const theme = useTheme();

  const getStatusIcon = () => {
    if (isOwnMessage) {
      if (message.read_by.length > 1) { // Read by others
        return <DoneAllIcon fontSize="small" sx={{ color: 'primary.main' }} />;
      }
      if (message.id) { // Delivered
        return <CheckIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
      }
      return <ScheduleIcon fontSize="small" sx={{ color: 'text.secondary' }} />; // Pending
    }
    return null;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* Timestamp */}
      {showTimestamp && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Chip
            label={new Date(message.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            size="small"
            sx={{
              bgcolor: 'background.paper',
              color: 'text.secondary',
              fontSize: '0.7rem',
            }}
          />
        </Box>
      )}

      {/* Message */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          gap: 1,
          px: 1,
        }}
      >
        {/* Avatar */}
        <Box sx={{ width: 32, display: 'flex', justifyContent: 'center' }}>
          {showAvatar && !isOwnMessage && (
            <Avatar
              sx={{ 
                width: 28, 
                height: 28,
                bgcolor: 'secondary.main',
                fontSize: '0.8rem',
              }}
              src={message.sender.avatar}
            >
              {message.sender.name?.charAt(0) || '?'}
            </Avatar>
          )}
        </Box>

        {/* Message Bubble */}
        <Box sx={{ maxWidth: '75%', minWidth: '120px' }}>
          {/* Sender name (for non-own messages) */}
          {showAvatar && !isOwnMessage && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ 
                display: 'block', 
                mb: 0.5, 
                ml: 1,
                fontSize: '0.7rem',
              }}
            >
              {message.sender.name || 'Unknown User'}
            </Typography>
          )}

          <Paper
            sx={{
              p: 1.5,
              bgcolor: isOwnMessage ? 'primary.main' : 'background.paper',
              color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
              borderRadius: 3,
              borderTopRightRadius: isOwnMessage && showAvatar ? 1 : 3,
              borderTopLeftRadius: !isOwnMessage && showAvatar ? 1 : 3,
              boxShadow: theme.shadows[1],
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message.content}
            </Typography>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {message.attachments.map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment}
                    isOwnMessage={isOwnMessage}
                  />
                ))}
              </Box>
            )}

            {/* Message Footer */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 0.5,
                mt: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  opacity: 0.7,
                  color: isOwnMessage ? 'primary.contrastText' : 'text.secondary',
                }}
              >
                {formatTime(message.created_at)}
              </Typography>
              {getStatusIcon()}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Attachment Preview Component
 */
interface AttachmentPreviewProps {
  attachment: { id: string; filename: string; file_type: string; file_url: string };
  isOwnMessage: boolean;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachment,
  isOwnMessage,
}) => {
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon fontSize="small" />;
    }
    if (fileType === 'application/pdf') {
      return <PdfIcon fontSize="small" />;
    }
    return <FileIcon fontSize="small" />;
  };

  const isImage = attachment.file_type.startsWith('image/');

  if (isImage) {
    return (
      <Box
        component="img"
        src={attachment.file_url}
        alt={attachment.filename}
        sx={{
          maxWidth: 200,
          maxHeight: 200,
          borderRadius: 2,
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
          },
        }}
        onClick={() => window.open(attachment.file_url, '_blank')}
      />
    );
  }

  return (
    <Chip
      icon={getFileIcon(attachment.file_type)}
      label={attachment.filename}
      size="small"
      clickable
      onClick={() => window.open(attachment.file_url, '_blank')}
      sx={{
        bgcolor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'action.hover',
        color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
        '&:hover': {
          bgcolor: isOwnMessage ? 'rgba(255,255,255,0.3)' : 'action.selected',
        },
      }}
    />
  );
};

/**
 * Typing Indicator Component
 */
interface TypingIndicatorProps {
  users: Array<{ user_id: number; user_name: string }>;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  const theme = useTheme();

  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          px: 1,
          py: 2,
        }}
      >
        <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main' }}>
          {users[0]?.user_name.charAt(0) || '?'}
        </Avatar>
        
        <Paper
          sx={{
            p: 1.5,
            bgcolor: 'background.paper',
            borderRadius: 3,
            borderTopLeftRadius: 1,
            boxShadow: theme.shadows[1],
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {users.length === 1
                ? `${users[0].user_name} is typing`
                : `${users.map(u => u.user_name).join(', ')} are typing`
              }
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: '2px',
                '& > div': {
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  bgcolor: 'text.secondary',
                  animation: 'typing 1.4s infinite ease-in-out',
                },
                '& > div:nth-of-type(1)': { animationDelay: '-0.32s' },
                '& > div:nth-of-type(2)': { animationDelay: '-0.16s' },
                '@keyframes typing': {
                  '0%, 80%, 100%': {
                    transform: 'scale(0.8)',
                    opacity: 0.5,
                  },
                  '40%': {
                    transform: 'scale(1)',
                    opacity: 1,
                  },
                },
              }}
            >
              <Box />
              <Box />
              <Box />
            </Box>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
};

export default ClientMessageThread;