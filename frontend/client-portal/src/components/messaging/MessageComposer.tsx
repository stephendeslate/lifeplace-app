// frontend/client-portal/src/components/messaging/MessageComposer.tsx

import React, { useState, useRef } from 'react';
import {
  TextField,
  IconButton,
  Stack,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
  InputAdornment,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachIcon,
  InsertEmoticon as EmojiIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';

interface MessageComposerProps {
  threadId: string;
  onSend: (content: string, attachments?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  threadId: _threadId,
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  isLoading = false,
}) => {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message.trim(), attachments);
      setMessage('');
      setAttachments([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <GlassCard
      variant="light"
      intensity="strong"
      sx={{
        p: 2,
        borderRadius: 0,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <Stack 
          direction="row" 
          spacing={1} 
          sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
        >
          {attachments.map((file, index) => (
            <Chip
              key={index}
              label={`${file.name} (${formatFileSize(file.size)})`}
              onDelete={() => removeAttachment(index)}
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            />
          ))}
        </Stack>
      )}

      {/* Message Input */}
      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha('#fff', 0.7),
              '&.Mui-focused': {
                backgroundColor: alpha('#fff', 0.9),
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconButton 
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isLoading}
                >
                  <AttachIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  size="small"
                  disabled={disabled}
                  sx={{ mr: -1 }}
                >
                  <EmojiIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={disabled || isLoading || (!message.trim() && attachments.length === 0)}
          sx={{
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
            },
          }}
        >
          {isLoading ? (
            <CircularProgress size={20} />
          ) : (
            <SendIcon />
          )}
        </IconButton>
      </Stack>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
      />
    </GlassCard>
  );
};

export default MessageComposer;