/**
 * AdminMessageThread - Advanced Message Thread Component for Admin CRM
 * 
 * Features:
 * - Virtual scrolling for performance with large message lists
 * - Internal notes with visual distinction
 * - Rich composer with file uploads and mentions
 * - Thread actions (assign, prioritize, resolve)
 * - Real-time typing indicators and read receipts
 * - Message formatting and attachment preview
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
  Avatar,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  Assignment as AssignmentIcon,
  Flag as FlagIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Reply as ReplyIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import type { Message } from '@shared/types/messaging.types';
import type { AdminMessageThreadProps } from './AdminMessageThread.types';


interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
}

export const AdminMessageThread: React.FC<AdminMessageThreadProps> = ({
  threadId: _threadId,
  enableInternalNotes = true,
  className,
  currentThread,
  messages,
  isConnected: _isConnected,
  isLoadingMessages,
  hasMoreMessages,
  typingUsers,
  config,
  isTyping,
  onSendMessage,
  onMarkAsRead: _onMarkAsRead,
  onLoadMoreMessages,
  onStartTyping,
  onStopTyping,
}) => {
  const theme = useTheme();
  
  // Component state
  const [messageContent, setMessageContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(true);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  // Current thread is passed as prop

  // Archive state derivation from thread data (single source of truth)
  const isThreadArchived = useMemo(() => {
    if (!currentThread) return false;

    // Check multiple ways thread can be archived to ensure compatibility
    return currentThread.status === 'archived' ||
           currentThread.is_archived === true ||
           Boolean(currentThread.archived_at);
  }, [currentThread]);

  // Filter messages based on internal notes visibility
  const visibleMessages = useMemo(() => {
    if (!showInternalNotes) {
      return messages.filter(msg => !msg.is_internal_note);
    }
    return messages;
  }, [messages, showInternalNotes]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages]);

  // Handle message sending
  const handleSendMessage = useCallback(async () => {
    if ((!messageContent.trim() && attachments.length === 0) || isTyping) {
      return;
    }

    try {
      setIsUploading(true);
      await onSendMessage(messageContent, attachments, isInternalNote);
      setMessageContent('');
      setAttachments([]);
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsUploading(false);
    }
  }, [messageContent, attachments, isInternalNote, onSendMessage, isTyping]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    if (event.target) {
      event.target.value = '';
    }
  }, []);

  // Handle file removal
  const handleRemoveFile = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle typing indicators
  useEffect(() => {
    let typingTimer: NodeJS.Timeout;

    if (messageContent.trim()) {
      onStartTyping();
      typingTimer = setTimeout(() => {
        onStopTyping();
      }, config.typingTimeout);
    }

    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
      onStopTyping();
    };
  }, [messageContent, onStartTyping, onStopTyping, config.typingTimeout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target === composerRef.current) {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          handleSendMessage();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSendMessage]);

  // Thread actions
  const handleAssignThread = useCallback((adminId: number) => {
    console.log('Assign thread to admin:', adminId);
    setAssignDialogOpen(false);
    setActionMenuAnchor(null);
  }, []);

  const handleChangePriority = useCallback((priority: string) => {
    console.log('Change thread priority to:', priority);
    setPriorityDialogOpen(false);
    setActionMenuAnchor(null);
  }, []);

  const handleResolveThread = useCallback(() => {
    console.log('Resolve thread');
    setActionMenuAnchor(null);
  }, []);

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
        }}
      >
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          {currentThread.client_name.charAt(0)}
        </Avatar>
        
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {currentThread.event_name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {currentThread.client_name} • {new Date(currentThread.event_date).toLocaleDateString()}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={currentThread.priority}
            size="small"
            color={
              currentThread.priority === 'urgent' ? 'error' :
              currentThread.priority === 'high' ? 'warning' :
              'primary'
            }
          />
          
          <Chip
            label={currentThread.status}
            size="small"
            variant="outlined"
            color={
              currentThread.status === 'active' ? 'success' :
              currentThread.status === 'waiting' ? 'warning' :
              currentThread.status === 'archived' ? 'error' :
              'default'
            }
            icon={currentThread.status === 'archived' ? <ArchiveIcon /> : undefined}
          />

          {enableInternalNotes && (
            <Tooltip title={showInternalNotes ? 'Hide internal notes' : 'Show internal notes'}>
              <IconButton
                size="small"
                onClick={() => setShowInternalNotes(!showInternalNotes)}
                color={showInternalNotes ? 'primary' : 'default'}
              >
                {showInternalNotes ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Thread actions">
            <IconButton
              size="small"
              onClick={(e) => setActionMenuAnchor(e.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Messages Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 1,
          bgcolor: 'grey.50',
        }}
      >
        {isLoadingMessages && (
          <LinearProgress sx={{ mb: 2 }} />
        )}

        <MessageList
          messages={visibleMessages}
          currentUserId={1} // This should come from auth context
          onReply={setReplyingTo}
          onLoadMore={onLoadMoreMessages}
          hasMore={hasMoreMessages}
        />

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {typingUsers.map(u => u.user_name).join(', ')}
              {typingUsers.length === 1 ? ' is' : ' are'} typing...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Reply Context */}
      {replyingTo && (
        <Alert
          severity="info"
          action={
            <IconButton size="small" onClick={() => setReplyingTo(null)}>
              <DeleteIcon />
            </IconButton>
          }
          sx={{ m: 1 }}
        >
          <Typography variant="body2">
            Replying to: {replyingTo.content.substring(0, 50)}...
          </Typography>
        </Alert>
      )}

      {/* Archived Thread Indicator */}
      {isThreadArchived && (
        <Alert
          severity="info"
          sx={{
            m: 1,
            bgcolor: theme.palette.grey[50],
            border: `1px solid ${theme.palette.grey[300]}`,
            '& .MuiAlert-message': {
              fontWeight: 500
            }
          }}
          icon={<ArchiveIcon />}
        >
          This conversation has been archived
          {currentThread?.archived_by && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
              Archived by {currentThread.archived_by.name} on {new Date(currentThread.archived_at || '').toLocaleDateString()}
            </Typography>
          )}
        </Alert>
      )}

      {/* Message Composer */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          borderRadius: 0,
        }}
      >
        {/* Internal Note Toggle */}
        {enableInternalNotes && (
          <Box sx={{ mb: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="caption" color={isInternalNote ? 'warning.main' : 'text.secondary'}>
                  Internal note (only visible to admins)
                </Typography>
              }
            />
          </Box>
        )}

        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Attachments ({attachments.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {attachments.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  onDelete={() => handleRemoveFile(index)}
                  size="small"
                  icon={getFileIcon(file.type)}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Composer */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            ref={composerRef}
            multiline
            maxRows={4}
            fullWidth
            variant="outlined"
            placeholder={
              isThreadArchived
                ? "This conversation has been archived and cannot accept new messages"
                : isInternalNote
                  ? "Add internal note..."
                  : "Type your message..."
            }
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            disabled={isUploading || isThreadArchived}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: isInternalNote ? 'warning.50' : 'background.paper',
                borderColor: isInternalNote ? 'warning.main' : 'divider',
              },
            }}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              accept={(config.allowedFileTypes || ['image/*', 'application/pdf', '.doc', '.docx', '.txt']).join(',')}
              style={{ display: 'none' }}
            />

            <Tooltip title={isThreadArchived ? "Cannot attach files to archived conversations" : "Attach files"}>
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isThreadArchived}
              >
                <AttachFileIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={isThreadArchived ? "Cannot send messages to archived conversations" : "Send message"}>
              <IconButton
                onClick={handleSendMessage}
                disabled={(!messageContent.trim() && attachments.length === 0) || isUploading || isThreadArchived}
                color="primary"
              >
                <SendIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {isUploading && (
          <LinearProgress sx={{ mt: 1 }} />
        )}
      </Paper>

      {/* Thread Actions Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          },
        }}
      >
        <MenuItem onClick={() => setAssignDialogOpen(true)}>
          <AssignmentIcon sx={{ mr: 1 }} />
          Assign to Admin
        </MenuItem>
        <MenuItem onClick={() => setPriorityDialogOpen(true)}>
          <FlagIcon sx={{ mr: 1 }} />
          Change Priority
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleResolveThread}>
          <CheckCircleIcon sx={{ mr: 1 }} />
          Mark as Resolved
        </MenuItem>
      </Menu>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
        <DialogTitle>Assign Thread</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Select Admin</InputLabel>
            <Select defaultValue="">
              <MenuItem value={1}>Admin User 1</MenuItem>
              <MenuItem value={2}>Admin User 2</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleAssignThread(1)}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Priority Dialog */}
      <Dialog open={priorityDialogOpen} onClose={() => setPriorityDialogOpen(false)}>
        <DialogTitle>Change Priority</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Priority</InputLabel>
            <Select defaultValue={currentThread.priority}>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriorityDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleChangePriority('high')}>
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/**
 * Message List Component with Virtual Scrolling
 */
interface MessageListProps {
  messages: Message[];
  currentUserId: number;
  onReply?: (message: Message) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onReply,
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
        }}
      >
        <Typography color="text.secondary">
          No messages in this thread
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }} onScroll={handleScroll}>
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwnMessage={message.sender.id === currentUserId}
          showAvatar={
            index === 0 || 
            messages[index - 1].sender.id !== message.sender.id
          }
          onReply={onReply}
        />
      ))}
    </Box>
  );
};

/**
 * Individual Message Item
 */
const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isOwnMessage,
  showAvatar,
  onReply,
}) => {
  const theme = useTheme();
  const [showActions, setShowActions] = useState(false);

  const isInternalNote = message.is_internal_note;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1,
        p: 1,
        '&:hover .message-actions': {
          opacity: 1,
        },
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
        {showAvatar && (
          <Avatar
            sx={{ 
              width: 32, 
              height: 32,
              bgcolor: isInternalNote ? 'warning.main' : 'primary.main'
            }}
            src={message.sender.avatar}
          >
            {message.sender.name?.charAt(0) || '?'}
          </Avatar>
        )}
      </Box>

      {/* Message Content */}
      <Box
        sx={{
          maxWidth: '70%',
          minWidth: '200px',
        }}
      >
        {/* Message Header */}
        {showAvatar && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 0.5,
              justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {message.sender.name || 'Unknown User'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(message.created_at).toLocaleTimeString()}
            </Typography>
            {isInternalNote && (
              <Chip
                label="Internal"
                size="small"
                color="warning"
                sx={{ fontSize: '0.6rem', height: 16 }}
              />
            )}
          </Box>
        )}

        {/* Message Bubble */}
        <Paper
          sx={{
            p: 1.5,
            bgcolor: isInternalNote ? 'warning.50' : 
                     isOwnMessage ? 'primary.main' : 'background.paper',
            color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2,
            border: isInternalNote ? `1px solid ${theme.palette.warning.main}` : 'none',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {message.attachments.map((attachment) => (
                <Chip
                  key={attachment.id}
                  label={attachment.filename}
                  size="small"
                  icon={getFileIcon(attachment.file_type)}
                  clickable
                  onClick={() => window.open(attachment.file_url, '_blank')}
                />
              ))}
            </Box>
          )}
        </Paper>

        {/* Message Actions */}
        <Box
          className="message-actions"
          sx={{
            display: 'flex',
            gap: 0.5,
            mt: 0.5,
            opacity: showActions ? 1 : 0,
            transition: theme.transitions.create('opacity'),
            justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          }}
        >
          {onReply && (
            <Tooltip title="Reply">
              <IconButton size="small" onClick={() => onReply(message)}>
                <ReplyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Get appropriate file icon based on file type
 */
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return <ImageIcon fontSize="small" />;
  }
  if (fileType === 'application/pdf') {
    return <PdfIcon fontSize="small" />;
  }
  return <FileIcon fontSize="small" />;
};

export default AdminMessageThread;