/**
 * ClientMessageComposer - Message Input Component for Client Portal
 *
 * Features:
 * - Simple text input with file upload
 * - Character limits
 * - Send on Enter (mobile-friendly)
 * - Drag and drop file support
 * - Mobile-optimized touch interactions
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Chip,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { useMessagingContext } from '@shared';

export interface ClientMessageComposerProps {
  threadId: string;
  placeholder?: string;
  maxLength?: number;
  enableFiles?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const ClientMessageComposer: React.FC<ClientMessageComposerProps> = ({
  threadId: _threadId,
  placeholder = 'Type your message...',
  maxLength = 2000,
  enableFiles = true,
  autoFocus = false,
  disabled = false,
}) => {
  const theme = useTheme();
  const { actions, config } = useMessagingContext();

  // Component state
  const [messageContent, setMessageContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textFieldRef = useRef<HTMLDivElement>(null);

  // Handle message sending
  const handleSendMessage = useCallback(async () => {
    if ((!messageContent.trim() && attachments.length === 0) || isUploading || disabled) {
      return;
    }

    try {
      setIsUploading(true);
      await actions.sendMessage(messageContent, attachments);
      setMessageContent('');
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsUploading(false);
    }
  }, [messageContent, attachments, actions, isUploading, disabled]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      // Check file size
      if (file.size > (config.maxFileSize || 10 * 1024 * 1024)) {
        console.warn(`File ${file.name} is too large`);
        return false;
      }

      // Check file type if allowedFileTypes is specified
      if (config.allowedFileTypes?.length) {
        const isAllowed = config.allowedFileTypes.some(type => {
          if (type.startsWith('.')) {
            return file.name.toLowerCase().endsWith(type.toLowerCase());
          }
          return file.type.match(type);
        });
        if (!isAllowed) {
          console.warn(`File type ${file.type} is not allowed`);
          return false;
        }
      }

      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
    if (event.target) {
      event.target.value = '';
    }
  }, [config.maxFileSize, config.allowedFileTypes]);

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

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      // Create a synthetic event to reuse file selection logic
      const syntheticEvent = {
        target: { files }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(syntheticEvent);
    }
  }, [handleFileSelect]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Handle typing indicators
  useEffect(() => {
    let typingTimer: NodeJS.Timeout;

    if (messageContent.trim() && config.enableTypingIndicators) {
      actions.startTyping();
      typingTimer = setTimeout(() => {
        actions.stopTyping();
      }, config.typingTimeout || 3000);
    }

    return () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
      if (config.enableTypingIndicators) {
        actions.stopTyping();
      }
    };
  }, [messageContent, actions, config.enableTypingIndicators, config.typingTimeout]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon fontSize="small" />;
    }
    if (fileType === 'application/pdf') {
      return <PdfIcon fontSize="small" />;
    }
    return <FileIcon fontSize="small" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        borderRadius: 0,
        position: 'relative',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && enableFiles && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(25, 118, 210, 0.1)',
            border: `2px dashed ${theme.palette.primary.main}`,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <Typography variant="h6" color="primary">
            Drop files here to attach
          </Typography>
        </Box>
      )}

      {/* File attachments preview */}
      {attachments.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Attachments ({attachments.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {attachments.map((file, index) => (
              <Chip
                key={index}
                icon={getFileIcon(file.type)}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                }
                onDelete={() => handleRemoveFile(index)}
                size="small"
                sx={{
                  height: 'auto',
                  py: 1,
                  '& .MuiChip-label': {
                    py: 0.5,
                  }
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Composer */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          ref={textFieldRef}
          multiline
          maxRows={4}
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={messageContent}
          onChange={(e) => {
            if (e.target.value.length <= maxLength) {
              setMessageContent(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={isUploading || disabled}
          autoFocus={autoFocus}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
            },
          }}
          helperText={
            messageContent.length > maxLength * 0.9 ?
            `${messageContent.length}/${maxLength}` :
            undefined
          }
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {enableFiles && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                accept={config.allowedFileTypes?.join(',')}
                style={{ display: 'none' }}
              />

              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || disabled}
                size="small"
              >
                <AttachFileIcon />
              </IconButton>
            </>
          )}

          <IconButton
            onClick={handleSendMessage}
            disabled={(!messageContent.trim() && attachments.length === 0) || isUploading || disabled}
            color="primary"
            size="large"
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&.Mui-disabled': {
                bgcolor: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      {isUploading && (
        <LinearProgress sx={{ mt: 1 }} />
      )}

      {/* Error states */}
      {messageContent.length > maxLength && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Message is too long. Please keep it under {maxLength} characters.
        </Alert>
      )}
    </Paper>
  );
};

export default ClientMessageComposer;