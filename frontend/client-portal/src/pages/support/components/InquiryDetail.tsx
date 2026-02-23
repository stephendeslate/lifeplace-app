// frontend/client-portal/src/pages/support/components/InquiryDetail.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Avatar,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Person as PersonIcon,
  SupportAgent as SupportAgentIcon,
} from '@mui/icons-material';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { useSupport } from '../../../hooks/useSupport';
import { getStatusConfig, getCategoryLabel } from '../../../constants/support.constants';
import type { SupportMessage } from '../../../types/support.types';

interface InquiryDetailProps {
  inquiryId: string;
  onBack: () => void;
}

export const InquiryDetail: React.FC<InquiryDetailProps> = ({ inquiryId, onBack }) => {
  const theme = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyContent, setReplyContent] = useState('');

  const { useSupportInquiry, useAddReply } = useSupport();
  const { data: inquiry, isLoading, error } = useSupportInquiry(inquiryId);
  const addReply = useAddReply();

  useDocumentTitle(
    inquiry ? `${inquiry.subject} | Support | LifePlace Alfonso` : 'Support | LifePlace Alfonso',
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [inquiry?.messages]);

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;

    await addReply.mutateAsync({
      inquiryId,
      data: { content: replyContent },
    });
    setReplyContent('');
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendReply();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString([], {
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !inquiry) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
          Back to Inquiries
        </Button>
        <Alert severity="error">Failed to load inquiry details. Please try again.</Alert>
      </Box>
    );
  }

  const statusConfig = getStatusConfig(inquiry.status);
  const isResolved = inquiry.status === 'resolved' || inquiry.status === 'archived';

  return (
    <>
      <Box>
        {/* Header */}
        <AnimatedElement animation="slideDown" delay={100}>
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
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={statusConfig.label} size="small" color={statusConfig.color} />
                  <Chip
                    label={getCategoryLabel(inquiry.category)}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: alpha('#fff', 0.3) }}
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
        </AnimatedElement>

        {/* Messages */}
        <AnimatedElement animation="slideUp" delay={200}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              p: 0,
              mb: 3,
              border: `1px solid ${alpha('#fff', 0.1)}`,
              height: '50vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 3,
              }}
            >
              <Stack spacing={2}>
                {inquiry.messages.map((message, _index) => {
                  const fromClient = isFromClient(message);

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: fromClient ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: fromClient ? 'row-reverse' : 'row',
                          gap: 1.5,
                          maxWidth: '80%',
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            backgroundColor: fromClient
                              ? theme.palette.primary.main
                              : alpha(theme.palette.info.main, 0.2),
                            color: fromClient ? 'white' : theme.palette.info.main,
                          }}
                        >
                          {fromClient ? (
                            <PersonIcon fontSize="small" />
                          ) : (
                            <SupportAgentIcon fontSize="small" />
                          )}
                        </Avatar>
                        <Box>
                          <Box
                            sx={{
                              backgroundColor: fromClient
                                ? theme.palette.primary.main
                                : alpha('#fff', 0.1),
                              color: fromClient ? 'white' : 'inherit',
                              borderRadius: 2,
                              borderTopRightRadius: fromClient ? 4 : 16,
                              borderTopLeftRadius: fromClient ? 16 : 4,
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
                              textAlign: fromClient ? 'right' : 'left',
                              mt: 0.5,
                            }}
                          >
                            {fromClient ? 'You' : message.sender.display_name || 'Support'} -{' '}
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
          </GlassCard>
        </AnimatedElement>

        {/* Reply Box */}
        <AnimatedElement animation="slideUp" delay={300}>
          {isResolved ? (
            <Alert severity="info">
              This inquiry has been resolved. If you need further assistance, please create a new
              inquiry.
            </Alert>
          ) : (
            <GlassCard
              variant="light"
              intensity="subtle"
              sx={{
                p: 2,
                border: `1px solid ${alpha('#fff', 0.1)}`,
              }}
            >
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Type your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={addReply.isPending}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: alpha('#fff', 0.05),
                    },
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendReply}
                  disabled={!replyContent.trim() || addReply.isPending}
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                    '&:disabled': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.3),
                      color: alpha('#fff', 0.5),
                    },
                  }}
                >
                  {addReply.isPending ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <SendIcon />
                  )}
                </IconButton>
              </Box>
            </GlassCard>
          )}
        </AnimatedElement>
      </Box>
    </>
  );
};
