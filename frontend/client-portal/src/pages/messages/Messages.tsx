// frontend/client-portal/src/pages/messages/Messages.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  useTheme,
  alpha,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import {
  Message as MessageIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import MessageList from '../../components/messaging/MessageList';
import MessageThread from '../../components/messaging/MessageThread';
import { useMessaging } from '../../hooks/useMessaging';
import { useAuth } from '../../contexts/AuthContext';
import type { MessageThread as ThreadType, QuickAction } from '../../types/messaging.types';

const Messages: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const [selectedThread, setSelectedThread] = useState<ThreadType | null>(null);
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);
  
  const { 
    useThreads, 
    useMessages, 
    useSendMessage,
    useMarkThreadAsRead,
    useMarkUrgent,
    useRequestCallback,
    useUploadAttachment,
  } = useMessaging();
  
  // Fetch threads
  const { data: threads = [], isLoading: threadsLoading } = useThreads();
  
  // Fetch messages for selected thread
  const { data: messages = [], isLoading: messagesLoading } = useMessages({
    thread_id: selectedThread?.id || '',
  });
  
  // Mutations
  const sendMessageMutation = useSendMessage();
  const markThreadAsReadMutation = useMarkThreadAsRead();
  const markUrgentMutation = useMarkUrgent();
  const requestCallbackMutation = useRequestCallback();
  const uploadAttachmentMutation = useUploadAttachment();
  
  // Handle thread selection
  const handleThreadSelect = (thread: ThreadType) => {
    setSelectedThread(thread);
    if (isMobile) {
      setShowThreadOnMobile(true);
    }
    
    // Mark thread as read when selected
    if (thread.unread_count > 0) {
      markThreadAsReadMutation.mutate(thread.id);
    }
  };
  
  // Handle message sending
  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!selectedThread) return;
    
    // Upload attachments first if any
    let attachmentIds: string[] = [];
    if (attachments && attachments.length > 0) {
      try {
        const uploadPromises = attachments.map(file => 
          uploadAttachmentMutation.mutateAsync(file)
        );
        const uploadResults = await Promise.all(uploadPromises);
        attachmentIds = uploadResults.map(r => r.id);
      } catch (error) {
        console.error('Failed to upload attachments:', error);
        return;
      }
    }
    
    // Send message
    sendMessageMutation.mutate({
      thread_id: selectedThread.id,
      content,
      attachments: attachmentIds,
    });
  };
  
  // Handle quick actions
  const handleQuickAction = (action: QuickAction) => {
    if (!selectedThread) return;
    
    switch (action.action) {
      case 'mark_urgent':
        markUrgentMutation.mutate(selectedThread.id);
        break;
      case 'request_callback':
        requestCallbackMutation.mutate(selectedThread.id);
        break;
      default:
        break;
    }
  };
  
  // Handle mobile back navigation
  const handleMobileBack = () => {
    setShowThreadOnMobile(false);
  };
  
  // Auto-select first thread on desktop
  useEffect(() => {
    if (!isMobile && threads.length > 0 && !selectedThread) {
      setSelectedThread(threads[0]);
    }
  }, [threads, isMobile, selectedThread]);
  
  // Calculate unread count
  const totalUnread = threads.reduce((acc, thread) => acc + thread.unread_count, 0);
  
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Subtle gradient overlay for depth */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          left: -100,
          right: -100,
          height: 300,
          background: `radial-gradient(circle at 50% 0%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Header Section */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={3}
          sx={{ px: 0, py: 2, position: 'relative', zIndex: 1 }}
        >
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                mb: 1, 
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Event Messages
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Communicate directly with your event coordinator
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Unread Count Badge */}
            {totalUnread > 0 && (
              <AnimatedElement animation="slideLeft" delay={200}>
                <GlassCard
                  variant="light"
                  intensity="medium"
                  sx={{
                    px: 2,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                  }}
                >
                  <MessageIcon sx={{ color: theme.palette.error.main }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Unread
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1, color: theme.palette.error.main }}>
                      {totalUnread}
                    </Typography>
                  </Box>
                </GlassCard>
              </AnimatedElement>
            )}
            
            {/* Total Events */}
            <AnimatedElement animation="slideLeft" delay={250}>
              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                }}
              >
                <EventIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Events
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1 }}>
                    {threads.length}
                  </Typography>
                </Box>
              </GlassCard>
            </AnimatedElement>
          </Stack>
        </Stack>
      </AnimatedElement>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <AnimatedElement animation="slideUp" delay={300}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              height: '100%',
              border: `1px solid ${alpha('#fff', 0.1)}`,
              overflow: 'hidden',
              backgroundColor: alpha('#fff', 0.05),
              backdropFilter: 'blur(20px)',
              display: 'flex',
            }}
          >
            {/* Desktop Layout */}
            {!isMobile ? (
              <Stack direction="row" sx={{ height: '100%', width: '100%' }}>
                {/* Thread List - 30% width */}
                <Box sx={{ 
                  width: '30%', 
                  borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
                    {threadsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <MessageList
                        threads={threads}
                        selectedThreadId={selectedThread?.id}
                        onThreadSelect={handleThreadSelect}
                        userRole={user?.role as 'CLIENT' | 'ADMIN' || 'CLIENT'}
                      />
                    )}
                  </Box>
                </Box>

                {/* Message Thread - 70% width */}
                <Box sx={{ width: '70%', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <MessageThread
                    thread={selectedThread}
                    messages={messages}
                    currentUserId={user?.id || 0}
                    userRole={user?.role as 'CLIENT' | 'ADMIN' || 'CLIENT'}
                    isLoading={messagesLoading}
                    onSendMessage={handleSendMessage}
                    onQuickAction={handleQuickAction}
                  />
                </Box>
              </Stack>
            ) : (
              /* Mobile Layout */
              <>
                {!showThreadOnMobile ? (
                  <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                    {threadsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <MessageList
                        threads={threads}
                        selectedThreadId={selectedThread?.id}
                        onThreadSelect={handleThreadSelect}
                        userRole={user?.role as 'CLIENT' | 'ADMIN' || 'CLIENT'}
                      />
                    )}
                  </Box>
                ) : (
                  <MessageThread
                    thread={selectedThread}
                    messages={messages}
                    currentUserId={user?.id || 0}
                    userRole={user?.role as 'CLIENT' | 'ADMIN' || 'CLIENT'}
                    isLoading={messagesLoading}
                    onSendMessage={handleSendMessage}
                    onQuickAction={handleQuickAction}
                    onClose={handleMobileBack}
                    isMobile
                  />
                )}
              </>
            )}
          </GlassCard>
        </AnimatedElement>
      </Box>
    </Box>
  );
};

export default Messages;