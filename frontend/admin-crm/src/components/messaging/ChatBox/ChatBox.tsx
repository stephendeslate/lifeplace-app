// frontend/admin-crm/src/components/messaging/ChatBox/ChatBox.tsx
// Chat interface component for displaying and sending messages

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Note as NoteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Reply as ReplyIcon
} from '@mui/icons-material';
import { parseISO, format } from 'date-fns';
// import { useThreadDetail, useMessages } from '@shared/hooks/useMessagingQueries';
import type { ChatBoxProps } from '../../../types/messaging.types';
// import type { Message } from '@shared/types/messaging';

// Temporary local types for build compatibility
interface Message {
  id: string;
  content: string;
  created_at: string;
}

// Temporary mock hooks for build compatibility
const useThreadDetail = () => ({ data: null, isLoading: false, error: null });
const useMessages = () => ({ data: [], isLoading: false, error: null });

export const ChatBox: React.FC<ChatBoxProps> = ({
  threadId,
  height = 400,
  showTypingIndicators: _showTypingIndicators = true,
  showInternalNotes: _showInternalNotes = true,
  allowAttachments = true,
  allowInternalNotes = true,
  onMessageSent: _onMessageSent,
  onThreadUpdate: _onThreadUpdate
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [messageInput, setMessageInput] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Hooks
  // ============================================================================

  // Thread and messages data
  const threadQuery = useThreadDetail(threadId);
  const messagesQuery = useMessages({
    thread_id: threadId,
    limit: 50
  });

  // ============================================================================
  // Effects
  // ============================================================================

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messagesQuery.data]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() && attachmentFiles.length === 0) return;

    try {
      // TODO: Implement actual message sending
      console.log('Sending message:', {
        content: messageInput.trim(),
        isInternalNote,
        attachments: attachmentFiles
      });

      // Reset form
      setMessageInput('');
      setAttachmentFiles([]);
      setIsInternalNote(false);

      scrollToBottom();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(event.target.value);
  };

  const handleFileAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachmentFiles(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleMessageMenu = (event: React.MouseEvent<HTMLElement>, message: Message) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const formatMessageTime = (timestamp: string): string => {
    try {
      const date = parseISO(timestamp);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) {
        return format(date, 'h:mm a');
      } else if (diffInDays === 1) {
        return `Yesterday ${format(date, 'h:mm a')}`;
      } else if (diffInDays < 7) {
        return format(date, 'EEE h:mm a');
      } else {
        return format(date, 'MMM d, h:mm a');
      }
    } catch {
      return '';
    }
  };

  const isOwnMessage = (message: Message): boolean => {
    // TODO: Compare with actual user ID
    return message.sender.role === 'ADMIN';
  };

  const shouldShowAvatar = (message: Message, index: number): boolean => {
    if (index === 0) return true;
    const prevMessage = messagesQuery.data?.results[index - 1];
    return !prevMessage || prevMessage.sender.id !== message.sender.id;
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderMessage = (message: Message, index: number) => {
    const isOwn = isOwnMessage(message);
    const showAvatar = shouldShowAvatar(message, index);
    const isInternal = message.is_internal_note;

    return (
      <ListItem
        key={message.id}
        sx={{
          flexDirection: isOwn ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          py: 0.5
        }}
      >
        <ListItemAvatar sx={{ minWidth: showAvatar ? 40 : 8 }}>
          {showAvatar && (
            <Avatar sx={{ width: 32, height: 32 }}>
              {isInternal ? (
                <NoteIcon fontSize="small" />
              ) : isOwn ? (
                <AdminIcon fontSize="small" />
              ) : (
                <PersonIcon fontSize="small" />
              )}
            </Avatar>
          )}
        </ListItemAvatar>

        <Box
          sx={{
            maxWidth: '70%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isOwn ? 'flex-end' : 'flex-start'
          }}
        >
          {showAvatar && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" fontWeight="medium">
                {message.sender.display_name}
              </Typography>
              {isInternal && (
                <Chip
                  label="Internal Note"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
              <Typography variant="caption" color="text.secondary">
                {formatMessageTime(message.created_at)}
              </Typography>
            </Box>
          )}

          <Card
            sx={{
              bgcolor: isOwn
                ? isInternal
                  ? 'warning.light'
                  : 'primary.main'
                : 'grey.100',
              color: isOwn && !isInternal ? 'primary.contrastText' : 'text.primary',
              boxShadow: 1
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>

              {/* Attachments */}
              {message.attachments.map((attachment) => (
                <Box
                  key={attachment.id}
                  sx={{
                    mt: 1,
                    p: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <AttachFileIcon fontSize="small" />
                  <Typography variant="caption" sx={{ flex: 1 }}>
                    {attachment.filename}
                  </Typography>
                  <IconButton size="small" href={attachment.file_url} download>
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </CardContent>
          </Card>

          <IconButton
            size="small"
            onClick={(e) => handleMessageMenu(e, message)}
            sx={{ mt: 0.5, opacity: 0.7 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </ListItem>
    );
  };

  const renderTypingIndicators = () => {
    // TODO: Implement typing indicators when WebSocket is connected
    return null;
  };

  const renderMessageInput = () => (
    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      {/* Attachments Preview */}
      {attachmentFiles.length > 0 && (
        <Box sx={{ mb: 1 }}>
          {attachmentFiles.map((file, index) => (
            <Chip
              key={index}
              label={file.name}
              onDelete={() => removeAttachment(index)}
              size="small"
              icon={<AttachFileIcon />}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Box>
      )}

      {/* Options */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 2 }}>
        {allowInternalNotes && (
          <FormControlLabel
            control={
              <Switch
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="caption">
                Internal Note
              </Typography>
            }
          />
        )}
      </Box>

      {/* Message Input */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={isInternalNote ? "Write an internal note..." : "Type a message..."}
          value={messageInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={false}
        />

        {allowAttachments && (
          <IconButton
            onClick={handleFileAttachment}
            disabled={false}
          >
            <AttachFileIcon />
          </IconButton>
        )}

        <Button
          variant="contained"
          onClick={handleSendMessage}
          disabled={!messageInput.trim() && attachmentFiles.length === 0}
          startIcon={<SendIcon />}
        >
          Send
        </Button>
      </Box>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </Box>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  if (messagesQuery.isLoading) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (messagesQuery.isError) {
    return (
      <Box sx={{ height, p: 2 }}>
        <Alert severity="error">
          Failed to load messages. Please try again.
        </Alert>
      </Box>
    );
  }

  const messages = messagesQuery.data?.results || [];

  return (
    <Box
      sx={{
        height,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper'
      }}
    >
      {/* Thread Header */}
      {threadQuery.data && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            {threadQuery.data.subject}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={threadQuery.data.status}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={threadQuery.data.priority}
              size="small"
              color="secondary"
              variant="outlined"
            />
            {threadQuery.data.event_name && (
              <Chip
                label={threadQuery.data.event_name}
                size="small"
                icon={<PersonIcon />}
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      )}

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              p: 3
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          <List>
            {messages.map((message, index) => renderMessage(message, index))}
            {renderTypingIndicators()}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>

      {/* Message Input */}
      {renderMessageInput()}

      {/* Message Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>
          <ReplyIcon sx={{ mr: 1 }} fontSize="small" />
          Reply
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          Mark as Important
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          Copy Message
        </MenuItem>
      </Menu>
    </Box>
  );
};

export type { ChatBoxProps };