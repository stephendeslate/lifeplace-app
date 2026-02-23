// frontend/admin-crm/src/pages/support/components/InquiryDetail.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Person as PersonIcon,
  SupportAgent as SupportAgentIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useSupport } from '../../../hooks/useSupport';
import type { SupportMessage, SupportStatus, SupportPriority } from '../../../types/support.types';

interface InquiryDetailProps {
  inquiryId: string;
  onBack: () => void;
}

const STATUS_CONFIG: Record<
  SupportStatus,
  {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  }
> = {
  active: { label: 'Open', color: 'info' },
  waiting: { label: 'Awaiting Response', color: 'warning' },
  resolved: { label: 'Resolved', color: 'success' },
  archived: { label: 'Archived', color: 'default' },
};

const PRIORITY_CONFIG: Record<
  SupportPriority,
  {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  }
> = {
  urgent: { label: 'Urgent', color: 'error' },
  high: { label: 'High', color: 'warning' },
  normal: { label: 'Normal', color: 'default' },
  low: { label: 'Low', color: 'default' },
};

const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Billing & Payments',
  event: 'Event Questions',
  technical: 'Technical Issues',
  general: 'General Inquiry',
};

export const InquiryDetail: React.FC<InquiryDetailProps> = ({ inquiryId, onBack }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  const { useSupportInquiry, useUpdateInquiry, useAddReply } = useSupport();
  const { data: inquiry, isLoading, error } = useSupportInquiry(inquiryId);
  const updateInquiry = useUpdateInquiry();
  const addReply = useAddReply();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [inquiry?.messages]);

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;

    await addReply.mutateAsync({
      inquiryId,
      data: {
        content: replyContent,
        is_internal_note: isInternalNote,
      },
    });
    setReplyContent('');
    setIsInternalNote(false);
  };

  const handleStatusChange = (newStatus: SupportStatus) => {
    updateInquiry.mutate({
      id: inquiryId,
      data: { status: newStatus },
    });
  };

  const handlePriorityChange = (newPriority: SupportPriority) => {
    updateInquiry.mutate({
      id: inquiryId,
      data: { priority: newPriority },
    });
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendReply();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isFromClient = (message: SupportMessage) => {
    return message.sender.role === 'CLIENT';
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !inquiry) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
          Back to Inquiries
        </Button>
        <Alert severity="error">Failed to load inquiry details. Please try again.</Alert>
      </Box>
    );
  }

  const statusConfig = STATUS_CONFIG[inquiry.status];
  const priorityConfig = PRIORITY_CONFIG[inquiry.priority];

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
          Back to Inquiries
        </Button>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              {inquiry.subject}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={statusConfig.label} size="small" color={statusConfig.color} />
              <Chip
                label={priorityConfig.label}
                size="small"
                color={priorityConfig.color}
                variant={
                  inquiry.priority === 'normal' || inquiry.priority === 'low'
                    ? 'outlined'
                    : 'filled'
                }
              />
              <Chip
                label={CATEGORY_LABELS[inquiry.category] || inquiry.category}
                size="small"
                variant="outlined"
              />
              {inquiry.event_name && (
                <Typography variant="body2" color="text.secondary">
                  Event: {inquiry.event_name}
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* Messages Section */}
        <Box sx={{ flex: 1 }}>
          <Paper sx={{ mb: 2 }}>
            <Box
              sx={{
                height: '50vh',
                overflowY: 'auto',
                p: 3,
              }}
            >
              <Stack spacing={2}>
                {inquiry.messages.map((message) => {
                  const fromClient = isFromClient(message);

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: fromClient ? 'flex-start' : 'flex-end',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: fromClient ? 'row' : 'row-reverse',
                          gap: 1.5,
                          maxWidth: '80%',
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            backgroundColor: fromClient
                              ? 'grey.300'
                              : message.is_internal_note
                                ? 'warning.light'
                                : 'primary.main',
                            color: fromClient
                              ? 'grey.700'
                              : message.is_internal_note
                                ? 'warning.dark'
                                : 'white',
                          }}
                        >
                          {fromClient ? (
                            <PersonIcon fontSize="small" />
                          ) : (
                            <SupportAgentIcon fontSize="small" />
                          )}
                        </Avatar>
                        <Box>
                          {message.is_internal_note && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              <LockIcon fontSize="small" color="warning" />
                              <Typography
                                variant="caption"
                                color="warning.main"
                                sx={{ fontWeight: 500 }}
                              >
                                Internal Note
                              </Typography>
                            </Box>
                          )}
                          <Box
                            sx={{
                              backgroundColor: fromClient
                                ? 'grey.100'
                                : message.is_internal_note
                                  ? 'warning.light'
                                  : 'primary.main',
                              color: fromClient
                                ? 'text.primary'
                                : message.is_internal_note
                                  ? 'warning.dark'
                                  : 'white',
                              borderRadius: 2,
                              borderTopLeftRadius: fromClient ? 4 : 16,
                              borderTopRightRadius: fromClient ? 16 : 4,
                              p: 2,
                            }}
                          >
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {message.content}
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              textAlign: fromClient ? 'left' : 'right',
                              mt: 0.5,
                            }}
                          >
                            {fromClient ? inquiry.client_name : message.sender.display_name} -{' '}
                            {formatMessageTime(message.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
                <div ref={messagesEndRef} />
              </Stack>
            </Box>
          </Paper>

          {/* Reply Box */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder={
                  isInternalNote
                    ? 'Type an internal note (not visible to client)...'
                    : 'Type your reply...'
                }
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={addReply.isPending}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      size="small"
                      color="warning"
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Internal note (not visible to client)
                    </Typography>
                  }
                />
                <Button
                  variant="contained"
                  endIcon={
                    addReply.isPending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SendIcon />
                    )
                  }
                  onClick={handleSendReply}
                  disabled={!replyContent.trim() || addReply.isPending}
                  color={isInternalNote ? 'warning' : 'primary'}
                >
                  {isInternalNote ? 'Add Note' : 'Send Reply'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Sidebar */}
        <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Client Information
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Avatar>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {inquiry.client_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {inquiry.client_email}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Inquiry Details
            </Typography>

            <Stack spacing={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={inquiry.status}
                  label="Status"
                  onChange={(e) => handleStatusChange(e.target.value as SupportStatus)}
                  disabled={updateInquiry.isPending}
                >
                  <MenuItem value="active">Open</MenuItem>
                  <MenuItem value="waiting">Awaiting Response</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={inquiry.priority}
                  label="Priority"
                  onChange={(e) => handlePriorityChange(e.target.value as SupportPriority)}
                  disabled={updateInquiry.isPending}
                >
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Timeline
            </Typography>
            <Stack spacing={1}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(inquiry.created_at).toLocaleString()}
                </Typography>
              </Box>
              {inquiry.last_message_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Activity
                  </Typography>
                  <Typography variant="body2">
                    {new Date(inquiry.last_message_at).toLocaleString()}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Messages
                </Typography>
                <Typography variant="body2">{inquiry.message_count} total</Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};
