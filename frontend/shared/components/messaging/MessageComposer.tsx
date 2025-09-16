/**
 * MessageComposer - Advanced message composition component
 * 
 * Features:
 * - Rich text input with Material-UI styling
 * - File attachment support with drag & drop
 * - Typing indicators and real-time feedback
 * - Send on Enter, new line on Shift+Enter
 * - Character count and validation
 * - File preview and removal
 * - Auto-expanding text area
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Button,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  Badge,
  styled,
  useTheme
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  Description as DocumentIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

const ComposerContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[1],
}));

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-end',
  gap: theme.spacing(1),
  minHeight: 40,
}));

const AttachmentPreview = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.action.hover,
  borderRadius: theme.spacing(1),
}));

const DropZone = styled(Box)<{ isDragOver: boolean }>(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2),
  textAlign: 'center',
  backgroundColor: isDragOver ? theme.palette.primary.light + '10' : 'transparent',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + '05',
  },
}));

const CharacterCount = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isNearLimit'
})<{ isNearLimit: boolean }>(({ theme, isNearLimit }) => ({
  fontSize: '0.75rem',
  color: isNearLimit ? theme.palette.warning.main : theme.palette.text.secondary,
  fontWeight: isNearLimit ? 600 : 400,
}));

export interface MessageComposerProps {
  threadId?: string;
  onSendMessage?: (content: string, attachments?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  isTyping?: boolean;
  enableFileUploads?: boolean;
  userRole?: 'CLIENT' | 'ADMIN';
  maxLength?: number;
  allowedFileTypes?: string[];
  maxFileSize?: number; // in MB
  maxFiles?: number;
  showCharacterCount?: boolean;
  autoFocus?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  threadId,
  onSendMessage,
  placeholder = 'Type your message...',
  disabled = false,
  onStartTyping,
  onStopTyping,
  isTyping = false,
  enableFileUploads = true,
  userRole = 'CLIENT',
  maxLength = 1000,
  allowedFileTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  maxFileSize = 10, // 10MB
  maxFiles = 5,
  showCharacterCount = true,
  autoFocus = false
}) => {
  const theme = useTheme();
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [emojiMenuAnchor, setEmojiMenuAnchor] = useState<null | HTMLElement>(null);

  // Character count status
  const isNearLimit = message.length > maxLength * 0.8;
  const isOverLimit = message.length > maxLength;
  
  // Send button state
  const canSend = message.trim().length > 0 && !isOverLimit && !uploading && !disabled;

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (onStartTyping && !isTyping) {
      onStartTyping();
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (onStopTyping) {
        onStopTyping();
      }
    }, 2000);
  }, [onStartTyping, onStopTyping, isTyping]);

  // Handle message input change
  const handleMessageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newMessage = event.target.value;
    setMessage(newMessage);
    setError(null);
    
    if (newMessage.trim().length > 0) {
      handleTypingStart();
    }
  }, [handleTypingStart]);

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [message, attachments]);

  // Handle send message
  const handleSend = useCallback(() => {
    if (!canSend || !onSendMessage) return;

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0 && attachments.length === 0) return;

    try {
      onSendMessage(trimmedMessage, attachments);
      setMessage('');
      setAttachments([]);
      setError(null);
      
      // Stop typing indicator
      if (onStopTyping) {
        onStopTyping();
      }
      
      // Focus back to input
      if (textFieldRef.current) {
        textFieldRef.current.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [canSend, message, attachments, onSendMessage, onStopTyping]);

  // File type validation and icon
  const getFileIcon = useCallback((file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <ImageIcon />;
    if (type.startsWith('video/')) return <VideoIcon />;
    if (type.startsWith('audio/')) return <AudioIcon />;
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return <DocumentIcon />;
    return <FileIcon />;
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!allowedFileTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }
    return null;
  }, [allowedFileTypes, maxFileSize]);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Check total file count
    if (attachments.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    fileArray.forEach(file => {
      const validation = validateFile(file);
      if (validation) {
        errors.push(`${file.name}: ${validation}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
    } else {
      setError(null);
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
    }
  }, [attachments.length, maxFiles, validateFile]);

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileSelect(files);
    }
    // Reset input value
    event.target.value = '';
  }, [handleFileSelect]);

  // Handle file removal
  const handleRemoveFile = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  // Handle emoji insertion (simplified)
  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
    setEmojiMenuAnchor(null);
    if (textFieldRef.current) {
      textFieldRef.current.focus();
    }
  }, []);

  // Common emojis
  const commonEmojis = ['😊', '😂', '❤️', '👍', '👏', '🎉', '🔥', '💯', '😍', '🤔'];

  // Auto-focus effect
  useEffect(() => {
    if (autoFocus && textFieldRef.current) {
      textFieldRef.current.focus();
    }
  }, [autoFocus]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (!threadId) {
    return (
      <ComposerContainer>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Select a conversation to start messaging
        </Typography>
      </ComposerContainer>
    );
  }

  return (
    <ComposerContainer
      onDragOver={enableFileUploads ? handleDragOver : undefined}
      onDragLeave={enableFileUploads ? handleDragLeave : undefined}
      onDrop={enableFileUploads ? handleDrop : undefined}
    >
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 1 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setError(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* File Attachments Preview */}
      {attachments.length > 0 && (
        <AttachmentPreview>
          {attachments.map((file, index) => (
            <Chip
              key={index}
              icon={getFileIcon(file)}
              label={`${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`}
              onDelete={() => handleRemoveFile(index)}
              deleteIcon={<CancelIcon />}
              variant="outlined"
              size="small"
            />
          ))}
        </AttachmentPreview>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary">
            Uploading files...
          </Typography>
        </Box>
      )}

      {/* Drag & Drop Zone (when dragging) */}
      {isDragOver && enableFileUploads && (
        <DropZone isDragOver={isDragOver}>
          <AttachFileIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            Drop files here to attach
          </Typography>
        </DropZone>
      )}

      {/* Input Container */}
      <InputContainer>
        {/* Emoji Button */}
        <Tooltip title="Add emoji">
          <span>
            <IconButton
              size="small"
              onClick={(e) => setEmojiMenuAnchor(e.currentTarget)}
              disabled={disabled}
            >
              <EmojiIcon />
            </IconButton>
          </span>
        </Tooltip>

        {/* File Attachment Button */}
        {enableFileUploads && (
          <Tooltip title="Attach files">
            <span>
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || attachments.length >= maxFiles}
              >
                <Badge badgeContent={attachments.length} color="primary" invisible={attachments.length === 0}>
                  <AttachFileIcon />
                </Badge>
              </IconButton>
            </span>
          </Tooltip>
        )}

        {/* Message Input */}
        <TextField
          inputRef={textFieldRef}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyPress}
          placeholder={disabled ? 'Cannot send messages' : placeholder}
          disabled={disabled}
          multiline
          maxRows={6}
          variant="outlined"
          size="small"
          fullWidth
          error={isOverLimit}
          helperText={
            showCharacterCount ? (
              <CharacterCount component="span" isNearLimit={isNearLimit}>
                {message.length}/{maxLength}
              </CharacterCount>
            ) : undefined
          }
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              minHeight: 40,
            },
            '& .MuiInputBase-input': {
              fontSize: '0.9rem',
              lineHeight: 1.4,
            },
          }}
        />

        {/* Send Button */}
        <Tooltip title={canSend ? 'Send message' : 'Cannot send empty message'}>
          <span>
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!canSend}
              sx={{
                minWidth: 48,
                height: 40,
                borderRadius: 3,
                px: 2,
              }}
              startIcon={<SendIcon />}
            >
              Send
            </Button>
          </span>
        </Tooltip>
      </InputContainer>

      {/* Hidden File Input */}
      {enableFileUploads && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedFileTypes.join(',')}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      )}

      {/* Emoji Menu */}
      <Menu
        anchorEl={emojiMenuAnchor}
        open={Boolean(emojiMenuAnchor)}
        onClose={() => setEmojiMenuAnchor(null)}
        transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
      >
        <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.5 }}>
          {commonEmojis.map((emoji, index) => (
            <MenuItem
              key={index}
              onClick={() => handleEmojiSelect(emoji)}
              sx={{ minWidth: 'auto', fontSize: '1.2rem', justifyContent: 'center' }}
            >
              {emoji}
            </MenuItem>
          ))}
        </Box>
      </Menu>
    </ComposerContainer>
  );
};

export default MessageComposer;