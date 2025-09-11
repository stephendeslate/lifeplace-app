/**
 * ClientMessageComposer - Simple Message Composition Component
 * 
 * Features:
 * - Clean, accessible text input
 * - File upload with drag-and-drop support
 * - Send shortcuts (Enter to send, Shift+Enter for new line)
 * - Character limits with visual feedback
 * - Mobile keyboard optimization
 * - File type and size validation
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Chip,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Tooltip,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { useMessagingContext } from '../../../../shared/providers/MessagingProvider';

export interface ClientMessageComposerProps {
  threadId: string;
  placeholder?: string;
  maxLength?: number;
  enableFiles?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const ClientMessageComposer: React.FC<ClientMessageComposerProps> = ({
  threadId: _threadId,
  placeholder = "Type your message...",
  maxLength = 2000,
  enableFiles = true,
  autoFocus = false,
  className,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Messaging context
  const { actions, config } = useMessagingContext();
  
  // Component state
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Character count
  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars < 100;
  const isOverLimit = remainingChars < 0;

  // Handle message sending
  const handleSend = useCallback(async () => {
    if ((!message.trim() && attachments.length === 0) || isUploading || isOverLimit) {
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      await actions.sendMessage(message.trim(), attachments);
      
      // Reset form
      setMessage('');
      setAttachments([]);
      
      // Focus back to input
      if (textFieldRef.current) {
        textFieldRef.current.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsUploading(false);
    }
  }, [message, attachments, isUploading, isOverLimit, actions]);

  // Handle keyboard shortcuts
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFiles(files);
    if (event.target) {
      event.target.value = '';
    }
  }, []);

  // Handle files (from input or drag-and-drop)
  const handleFiles = useCallback((files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Check file size
      if (file.size > config.maxFileSize) {
        errors.push(`"${file.name}" is too large (max ${config.maxFileSize / (1024 * 1024)}MB)`);
        return;
      }

      // Check file type
      const allowedTypes = config.allowedFileTypes || ['image/*', 'application/pdf', '.doc', '.docx'];
      const isAllowedType = allowedTypes.some(type => {
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return file.type.startsWith(baseType);
        }
        return file.type === type || file.name.toLowerCase().endsWith(type.toLowerCase());
      });

      if (!isAllowedType) {
        errors.push(`"${file.name}" is not an allowed file type`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
      setTimeout(() => setError(null), 5000);
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
    }
  }, [config]);

  // Handle file removal
  const handleRemoveFile = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon fontSize="small" />;
    }
    if (fileType === 'application/pdf') {
      return <PdfIcon fontSize="small" />;
    }
    return <FileIcon fontSize="small" />;
  };

  // Auto-resize text field
  useEffect(() => {
    if (textFieldRef.current) {
      const element = textFieldRef.current;
      element.style.height = 'auto';
      element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <Box className={className}>
      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ mx: 2, mb: 1 }}
        >
          {error}
        </Alert>
      )}

      {/* File Attachments Preview */}
      {attachments.length > 0 && (
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Attachments ({attachments.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {attachments.map((file, index) => (
              <Chip
                key={index}
                icon={getFileIcon(file.type)}
                label={`${file.name} (${(file.size / 1024).toFixed(1)}KB)`}
                onDelete={() => handleRemoveFile(index)}
                size="small"
                sx={{
                  maxWidth: 200,
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Composer */}
      <Box
        sx={{
          p: 2,
          borderTop: attachments.length > 0 ? `1px solid ${theme.palette.divider}` : 'none',
        }}
        onDragOver={enableFiles ? handleDragOver : undefined}
        onDragLeave={enableFiles ? handleDragLeave : undefined}
        onDrop={enableFiles ? handleDrop : undefined}
      >
        {/* Drag Overlay */}
        {enableFiles && dragOver && (
          <Fade in>
            <Paper
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                borderColor: 'primary.main',
                borderWidth: 2,
                borderStyle: 'dashed',
                borderRadius: 2,
                zIndex: 10,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h6" color="primary.main">
                  Drop files here
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Release to attach files to your message
                </Typography>
              </Box>
            </Paper>
          </Fade>
        )}

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          {/* File Upload Input */}
          {enableFiles && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                accept={(config.allowedFileTypes || ['image/*', 'application/pdf', '.doc', '.docx']).join(',')}
                style={{ display: 'none' }}
              />
              
              <Tooltip title="Attach files">
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  size={isMobile ? 'medium' : 'small'}
                  sx={{ mb: 0.5 }}
                >
                  <AttachFileIcon />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Text Input */}
          <TextField
            inputRef={textFieldRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder={placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isUploading}
            autoFocus={autoFocus && !isMobile}
            error={isOverLimit}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'grey.50',
                },
                '&.Mui-focused': {
                  bgcolor: 'background.paper',
                },
              },
              '& textarea': {
                resize: 'none',
              },
            }}
          />

          {/* Send Button */}
          <Tooltip title={`Send message ${!isMobile ? '(Enter)' : ''}`}>
            <span>
              <IconButton
                onClick={handleSend}
                disabled={(!message.trim() && attachments.length === 0) || isUploading || isOverLimit}
                color="primary"
                size={isMobile ? 'medium' : 'small'}
                sx={{ 
                  mb: 0.5,
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
            </span>
          </Tooltip>
        </Box>

        {/* Character Count */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Box>
            {isUploading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress sx={{ width: 100, height: 4 }} />
                <Typography variant="caption" color="text.secondary">
                  Sending...
                </Typography>
              </Box>
            )}
          </Box>
          
          {(isNearLimit || isOverLimit) && (
            <Typography
              variant="caption"
              color={isOverLimit ? 'error' : 'warning.main'}
              sx={{ fontSize: '0.7rem' }}
            >
              {remainingChars} characters {isOverLimit ? 'over limit' : 'remaining'}
            </Typography>
          )}
        </Box>

        {/* Helper Text */}
        {!isMobile && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ 
              display: 'block', 
              mt: 1, 
              fontSize: '0.7rem',
              opacity: message.length > 0 || attachments.length > 0 ? 1 : 0.6,
              transition: theme.transitions.create('opacity'),
            }}
          >
            Press Enter to send • Shift+Enter for new line
            {enableFiles && ' • Drag files to attach'}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ClientMessageComposer;