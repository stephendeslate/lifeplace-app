// frontend/client-portal/src/components/messaging/MessageBubble.tsx

import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AttachFile as FileIcon,
  CheckCircle as ReadIcon,
  Check as DeliveredIcon,
  Info as SystemIcon,
  Event as EventIcon,
  Lock as InternalIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import type { Message, MessageAttachment } from '../../types/messaging.types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  onAttachmentClick?: (attachment: MessageAttachment) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar = true,
  isFirstInGroup = true,
  isLastInGroup = true,
  onAttachmentClick,
}) => {
  const theme = useTheme();

  const getMessageIcon = () => {
    switch (message.message_type) {
      case 'system':
        return <SystemIcon fontSize="small" />;
      case 'event_update':
        return <EventIcon fontSize="small" />;
      case 'file':
        return <FileIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };


  const isSystemMessage = message.message_type === 'system' || message.message_type === 'event_update';

  if (isSystemMessage) {
    return (
      <AnimatedElement animation="fadeIn">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          my: 2,
          px: 2,
        }}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              px: 2,
              py: 1,
              maxWidth: '70%',
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {getMessageIcon()}
              <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                {message.content}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(message.created_at)}
              </Typography>
            </Stack>
          </GlassCard>
        </Box>
      </AnimatedElement>
    );
  }

  return (
    <AnimatedElement animation="slideUp">
      <Box sx={{ 
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        mb: isLastInGroup ? 2 : 0.5,
        px: 2,
      }}>
        <Stack 
          direction={isOwn ? 'row-reverse' : 'row'} 
          spacing={1}
          alignItems="flex-end"
          sx={{ maxWidth: '70%' }}
        >
          {/* Avatar */}
          {showAvatar && !isOwn && (
            <Avatar
              src={message.sender.avatar}
              sx={{
                width: 32,
                height: 32,
                visibility: isLastInGroup ? 'visible' : 'hidden',
              }}
            >
              {message.sender.name[0]}
            </Avatar>
          )}

          {/* Message Content */}
          <Box sx={{ flex: 1 }}>
            {/* Sender Name */}
            {!isOwn && isFirstInGroup && (
              <Typography 
                variant="caption" 
                sx={{ 
                  ml: 1, 
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                }}
              >
                {message.sender.name}
                {message.sender.role === 'ADMIN' && (
                  <Chip 
                    label="Admin" 
                    size="small" 
                    sx={{ ml: 1, height: 16, fontSize: '0.65rem' }}
                  />
                )}
              </Typography>
            )}

            {/* Message Bubble */}
            <GlassCard
              variant={isOwn ? 'light' : 'dark'}
              intensity="medium"
              hover={false}
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 2,
                borderTopLeftRadius: !isOwn && isFirstInGroup ? 4 : 16,
                borderTopRightRadius: isOwn && isFirstInGroup ? 4 : 16,
                borderBottomLeftRadius: !isOwn && isLastInGroup ? 4 : 16,
                borderBottomRightRadius: isOwn && isLastInGroup ? 4 : 16,
                backgroundColor: isOwn 
                  ? alpha(theme.palette.primary.main, 0.1)
                  : alpha(theme.palette.grey[800], 0.05),
                border: `1px solid ${alpha(
                  isOwn ? theme.palette.primary.main : theme.palette.divider, 
                  0.2
                )}`,
              }}
            >
              {/* Internal Note Badge */}
              {message.is_internal_note && (
                <Chip
                  icon={<InternalIcon />}
                  label="Internal Note"
                  size="small"
                  color="warning"
                  sx={{ mb: 1, height: 20, fontSize: '0.7rem' }}
                />
              )}

              {/* Message Text */}
              <Typography 
                variant="body2" 
                sx={{ 
                  color: theme.palette.text.primary,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message.content}
              </Typography>

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {message.attachments.map((attachment) => (
                    <Chip
                      key={attachment.id}
                      icon={<FileIcon />}
                      label={attachment.filename}
                      size="small"
                      onClick={() => onAttachmentClick?.(attachment)}
                      sx={{ 
                        justifyContent: 'flex-start',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    />
                  ))}
                </Stack>
              )}

              {/* Time and Status */}
              <Stack 
                direction="row" 
                spacing={0.5} 
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: theme.palette.text.secondary,
                    fontSize: '0.7rem',
                  }}
                >
                  {formatTime(message.created_at)}
                </Typography>
                
                {isOwn && message.read_by.length > 1 && (
                  <ReadIcon 
                    sx={{ 
                      fontSize: 12, 
                      color: theme.palette.primary.main 
                    }} 
                  />
                )}
                {isOwn && message.read_by.length === 1 && (
                  <DeliveredIcon 
                    sx={{ 
                      fontSize: 12, 
                      color: theme.palette.text.secondary 
                    }} 
                  />
                )}

                {message.edited_at && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: theme.palette.text.secondary,
                      fontSize: '0.7rem',
                      fontStyle: 'italic',
                    }}
                  >
                    (edited)
                  </Typography>
                )}
              </Stack>
            </GlassCard>
          </Box>
        </Stack>
      </Box>
    </AnimatedElement>
  );
};

export default MessageBubble;