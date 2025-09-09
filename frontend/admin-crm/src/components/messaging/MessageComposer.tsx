import React, { useState, useRef } from 'react';
import {
  TextField,
  IconButton,
  Stack,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemText,
  Typography,
  InputAdornment,
  Box,
  Tooltip,
  Card,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachIcon,
  InsertEmoticon as EmojiIcon,
  FormatQuote as TemplateIcon,
  PriorityHigh as UrgentIcon,
  Lock as InternalIcon,
} from '@mui/icons-material';

interface MessageComposerProps {
  onSend: (content: string, attachments?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
  showAttachments?: boolean;
  showTemplates?: boolean;
  showPriority?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  isLoading = false,
  showAttachments = true,
  showTemplates = false,
  showPriority = false,
  onFocus,
  onBlur,
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [templatesAnchor, setTemplatesAnchor] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickTemplates = [
    { label: 'Thank you for your message', content: 'Thank you for your message. I\'ll get back to you shortly.' },
    { label: 'Following up', content: 'Hi! I wanted to follow up on our previous conversation. Please let me know if you need any additional information.' },
    { label: 'Schedule meeting', content: 'Would you like to schedule a call to discuss this further? I have availability this week.' },
    { label: 'Documents requested', content: 'I\'ve attached the requested documents. Please review them and let me know if you have any questions.' },
    { label: 'Issue resolved', content: 'This issue has been resolved. Please let me know if you continue to experience any problems.' },
  ];

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message.trim(), attachments);
      setMessage('');
      setAttachments([]);
      setIsInternal(false);
      setIsUrgent(false);
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

  const handleTemplateSelect = (template: typeof quickTemplates[0]) => {
    setMessage(prev => prev + (prev ? '\n\n' : '') + template.content);
    setTemplatesAnchor(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        p: 2,
        borderRadius: 0,
        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
      }}
    >
      {/* Message Options */}
      {(showPriority || isInternal || isUrgent) && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {isInternal && (
            <Chip
              icon={<InternalIcon />}
              label="Internal Note"
              size="small"
              color="warning"
              onDelete={() => setIsInternal(false)}
            />
          )}
          {isUrgent && (
            <Chip
              icon={<UrgentIcon />}
              label="Urgent"
              size="small"
              color="error"
              onDelete={() => setIsUrgent(false)}
            />
          )}
        </Stack>
      )}

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
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                border: '1px solid rgba(25, 118, 210, 0.3)',
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
          maxRows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              
              '&.Mui-focused': {
                borderColor: '#1976d2',
                boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
              },
            },
          }}
          InputProps={{
            startAdornment: showAttachments ? (
              <InputAdornment position="start">
                <Tooltip title="Attach files">
                  <IconButton 
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isLoading}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: '#1976d2',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      },
                    }}
                  >
                    <AttachIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ) : undefined,
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" spacing={0.5}>
                  {showTemplates && (
                    <Tooltip title="Quick templates">
                      <IconButton 
                        size="small"
                        onClick={(e) => setTemplatesAnchor(e.currentTarget)}
                        disabled={disabled}
                        sx={{
                          color: 'text.secondary',
                          '&:hover': {
                            color: '#1976d2',
                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                          },
                        }}
                      >
                        <TemplateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {showPriority && (
                    <>
                      <Tooltip title="Mark as urgent">
                        <IconButton 
                          size="small"
                          onClick={() => setIsUrgent(!isUrgent)}
                          disabled={disabled}
                          sx={{
                            color: isUrgent ? '#d32f2f' : 'text.secondary',
                            '&:hover': {
                              color: '#d32f2f',
                              backgroundColor: 'rgba(211, 47, 47, 0.1)',
                            },
                          }}
                        >
                          <UrgentIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Internal note (not visible to client)">
                        <IconButton 
                          size="small"
                          onClick={() => setIsInternal(!isInternal)}
                          disabled={disabled}
                          sx={{
                            color: isInternal ? '#ed6c02' : 'text.secondary',
                            '&:hover': {
                              color: '#ed6c02',
                              backgroundColor: 'rgba(237, 108, 2, 0.1)',
                            },
                          }}
                        >
                          <InternalIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  
                  <Tooltip title="Add emoji">
                    <IconButton 
                      size="small"
                      disabled={disabled}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: '#1976d2',
                          backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        },
                      }}
                    >
                      <EmojiIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </InputAdornment>
            ),
          }}
        />

        <Tooltip title="Send message">
          <span>
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={disabled || isLoading || (!message.trim() && attachments.length === 0)}
              sx={{
                width: 48,
                height: 48,
                backgroundColor: 'rgba(25, 118, 210, 0.15)',
                border: '1px solid rgba(25, 118, 210, 0.3)',
                transition: 'all 0.2s ease-in-out',
                
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.25)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                },
                
                '&:disabled': {
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  borderColor: 'rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={20} />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* Templates Menu */}
      <Menu
        anchorEl={templatesAnchor}
        open={Boolean(templatesAnchor)}
        onClose={() => setTemplatesAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            maxWidth: 320,
            border: '1px solid rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Quick Templates
          </Typography>
        </Box>
        {quickTemplates.map((template, index) => (
          <MenuItem 
            key={index}
            onClick={() => handleTemplateSelect(template)}
            sx={{ 
              px: 2, 
              py: 1.5,
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
              },
            }}
          >
            <ListItemText
              primary={template.label}
              secondary={template.content.length > 50 ? 
                `${template.content.substring(0, 50)}...` : 
                template.content
              }
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: 600,
              }}
              secondaryTypographyProps={{
                variant: 'caption',
                color: 'text.secondary',
              }}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
      />
    </Card>
  );
};