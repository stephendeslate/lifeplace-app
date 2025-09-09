import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Avatar,
  IconButton,
  Stack,
  Divider,
  Button,
  Tooltip,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  PriorityHigh as UrgentIcon,
  CheckCircle as ResolveIcon,
  Refresh as ReopenIcon,
} from '@mui/icons-material';
import { useMessages } from '../../../hooks/useMessages';
import { useAuth } from '../../../hooks/useAuth';
import { useClients } from '../../../hooks/useClients';
import { MessageBubble } from '../MessageBubble';
import { MessageComposer } from '../MessageComposer';
import type { MessageThread as MessageThreadType, Message } from '../../../types/messaging.types';
import { formatDistanceToNow } from 'date-fns';

interface MessageThreadProps {
  thread: MessageThreadType;
  onBack?: () => void;
  isMobile?: boolean;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  thread,
  onBack,
  isMobile = false,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [_isComposerFocused, setIsComposerFocused] = useState(false);

  const { user: currentUser } = useAuth();
  const { useClient } = useClients();

  // Fetch client data if we have client_id but no client_name
  const shouldFetchClient = thread.client_id && !thread.client_name;
  const { data: clientData } = useClient(thread.client_id!);

  // Use client data from API if available, otherwise fallback to thread data
  const displayClientName = (shouldFetchClient && clientData) ? 
    `${clientData.first_name} ${clientData.last_name}`.trim() || clientData.email :
    thread.client_name || 'No client';

  const displayClientEmail = (shouldFetchClient && clientData) ? 
    clientData.email : 
    thread.client_email || '';
    
  const displayClientPhone = (shouldFetchClient && clientData) ? 
    clientData.profile?.phone || '' : 
    thread.client_phone || '';

  // Debug logging for thread data
  if (process.env.NODE_ENV === 'development') {
    console.log('MessageThread debug - thread data:', {
      threadId: thread.id,
      clientInfo: {
        id: thread.client_id,
        name: thread.client_name,
        email: thread.client_email,
        phone: thread.client_phone
      },
      fetchedClientData: clientData,
      displayClientName,
      eventInfo: {
        id: thread.event_id,
        name: thread.event_name,
        date: thread.event_date
      }
    });
  }

  const {
    useThreadMessages,
    sendMessage,
    markUrgent,
    resolveThread,
    reopenThread,
    markRead,
    isSendingMessage,
    isMarkingUrgent,
    isResolvingThread,
    isReopeningThread,
  } = useMessages();

  const { data: messages = [], isLoading } = useThreadMessages(thread.id);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when thread is opened
  useEffect(() => {
    if (thread.unread_count > 0) {
      markRead.mutate(thread.id);
    }
  }, [thread.id, thread.unread_count, markRead]);

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

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    await sendMessage.mutateAsync({
      content: content.trim(),
      thread_id: thread.id,
      attachments,
    });
  };

  const handleMarkUrgent = () => {
    markUrgent.mutate(thread.id);
  };

  const handleResolveThread = () => {
    resolveThread.mutate(thread.id);
  };

  const handleReopenThread = () => {
    reopenThread.mutate(thread.id);
  };

  const groupedMessages = useMemo(() => {
    const groups: { sender: string; messages: Message[]; isAdmin: boolean }[] = [];
    
    // Ensure messages is an array
    const messageArray = Array.isArray(messages) ? messages : [];
    
    messageArray.forEach((message) => {
      const lastGroup = groups[groups.length - 1];
      const isAdmin = message.sender_type === 'admin';
      
      const senderId = message.sender_id?.toString() || 'unknown';
      
      if (lastGroup && lastGroup.sender === senderId && lastGroup.isAdmin === isAdmin) {
        lastGroup.messages.push(message);
      } else {
        groups.push({
          sender: senderId,
          messages: [message],
          isAdmin,
        });
      }
    });
    
    return groups;
  }, [messages]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Card
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            {isMobile && (
              <IconButton onClick={onBack} size="small">
                <ArrowBackIcon />
              </IconButton>
            )}

            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: `${getPriorityColor(thread.priority)}.main`,
              }}
            >
              {displayClientName?.charAt(0) || thread.event_name?.charAt(0) || 'E'}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {thread.event_name || 'Untitled Event'}
              </Typography>
              
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {displayClientName}
                </Typography>
                
                <EventIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 1 }} />
                <Typography variant="caption" color="text.secondary" noWrap>
                  Event #{thread.event_id}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={thread.priority}
                  color={getPriorityColor(thread.priority)}
                  sx={{ height: 24, fontSize: '0.75rem' }}
                />
                <Chip
                  size="small"
                  label={thread.status}
                  color={getStatusColor(thread.status)}
                  sx={{ height: 24, fontSize: '0.75rem' }}
                />
              </Stack>
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={1}>
              {thread.priority !== 'urgent' && (
                <Tooltip title="Mark as urgent">
                  <IconButton
                    size="small"
                    onClick={handleMarkUrgent}
                    disabled={isMarkingUrgent}
                    sx={{
                      color: 'error.main',
                      '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
                    }}
                  >
                    <UrgentIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}

              {thread.status === 'resolved' ? (
                <Tooltip title="Reopen thread">
                  <IconButton
                    size="small"
                    onClick={handleReopenThread}
                    disabled={isReopeningThread}
                    sx={{
                      color: 'success.main',
                      '&:hover': { bgcolor: 'success.main', color: 'success.contrastText' },
                    }}
                  >
                    <ReopenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Mark as resolved">
                  <IconButton
                    size="small"
                    onClick={handleResolveThread}
                    disabled={isResolvingThread}
                    sx={{
                      color: 'success.main',
                      '&:hover': { bgcolor: 'success.main', color: 'success.contrastText' },
                    }}
                  >
                    <ResolveIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </Box>
      </Card>

      {/* Client Info Sidebar (Desktop) */}
      {!isMobile && (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: 280,
            height: '100%',
            borderLeft: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            zIndex: 1,
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Client Details
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Contact Information
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {displayClientEmail || 'Not provided'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {displayClientPhone || 'Not provided'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Event Information
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {thread.event_date ? 
                        new Date(thread.event_date).toLocaleDateString() : 
                        'Date TBD'
                      }
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Thread Activity
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Messages: {messages.length}
                  </Typography>
                  <Typography variant="body2">
                    Last activity: {thread.last_message_at ? 
                      formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true }) :
                      'No activity'
                    }
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          mr: isMobile ? 0 : '280px', // Account for sidebar
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={32} sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Loading messages...
            </Typography>
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No messages yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start the conversation with your client
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2, flex: 1 }}>
            <Stack spacing={2}>
              {groupedMessages.map((group, groupIndex) => (
                  <Stack key={groupIndex} spacing={1}>
                    {group.messages.map((message, messageIndex) => {
                      // Check if this message is from the current logged-in user
                      // Handle both string and number IDs for robust comparison
                      const isOwnMessage = currentUser && (
                        (message.sender?.id && String(message.sender.id) === String(currentUser.id)) || 
                        (message.sender_id && String(message.sender_id) === String(currentUser.id))
                      );

                      // Temporary debug for development - can be removed after fixing
                      if (process.env.NODE_ENV === 'development' && message.content.includes('test')) {
                        console.log('Debug message alignment:', {
                          messageContent: message.content.slice(0, 20),
                          currentUserId: currentUser?.id,
                          messageSenderId: message.sender?.id || message.sender_id,
                          messageType: message.sender?.role || message.sender_type,
                          isOwnMessage
                        });
                      }
                      
                      return (
                        <MessageBubble
                          key={message.id || `message-${messageIndex}`}
                          message={message}
                          isOwn={Boolean(isOwnMessage)}
                          showAvatar={messageIndex === 0}
                          isFirstInGroup={messageIndex === 0}
                          isLastInGroup={messageIndex === group.messages.length - 1}
                        />
                      );
                    })}
                  </Stack>
              ))}
            </Stack>
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      {/* Message Composer */}
      {thread.status !== 'resolved' && (
        <Fade in={true}>
          <Box
            sx={{
              flexShrink: 0,
              mr: isMobile ? 0 : '280px', // Account for sidebar
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <MessageComposer
              onSend={handleSendMessage}
              disabled={isSendingMessage}
              placeholder="Type your message..."
              showAttachments={true}
              showTemplates={true}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => setIsComposerFocused(false)}
            />
          </Box>
        </Fade>
      )}

      {thread.status === 'resolved' && (
        <Box
          sx={{
            p: 2,
            mr: isMobile ? 0 : '280px',
            textAlign: 'center',
            bgcolor: 'grey.50',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary" gutterBottom>
            This conversation has been resolved
          </Typography>
          <Button
            size="small"
            startIcon={<ReopenIcon />}
            onClick={handleReopenThread}
            disabled={isReopeningThread}
          >
            Reopen to continue messaging
          </Button>
        </Box>
      )}
    </Box>
  );
};