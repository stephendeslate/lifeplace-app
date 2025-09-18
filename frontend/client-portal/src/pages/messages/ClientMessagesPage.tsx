/**
 * ClientMessagesPage - Main Messages Page for Client Portal
 *
 * Features:
 * - WhatsApp-style clean messaging interface
 * - Event-specific messaging context
 * - Mobile-first responsive design
 * - Simple file sharing with drag-and-drop
 * - Clear message delivery status
 * - Accessibility compliance
 * - Clean consumer-grade UX
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery,
  Container,
} from '@mui/material';
import {
  Message as MessageIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useMessagingContext } from '@shared';
import { ClientThreadList } from '../../components/messaging/ClientThreadList';
import { ClientConversation } from '../../components/messaging/ClientConversation';

export interface ClientMessagesPageProps {
  eventId?: string;
  simplified?: boolean;
  showWelcome?: boolean;
}

export const ClientMessagesPage: React.FC<ClientMessagesPageProps> = ({
  eventId,
  simplified = false,
  showWelcome = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId?: string }>();

  // Messaging context
  const { state, actions } = useMessagingContext();

  // Component state
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(threadId || null);
  const [showThreadList, setShowThreadList] = useState(!threadId);

  // Filter threads by event if specified
  const filteredThreads = useMemo(() => {
    if (!eventId) return state.threads;
    return state.threads.filter(thread => thread.event_id === parseInt(eventId));
  }, [state.threads, eventId]);

  // Handle thread selection
  const handleThreadSelect = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    actions.selectThread(threadId);

    if (isMobile) {
      setShowThreadList(false);
    }

    // Update URL
    navigate(`/messages/thread/${threadId}`, { replace: true });
  }, [actions, isMobile, navigate]);

  // Handle back to list
  const handleBackToList = useCallback(() => {
    setShowThreadList(true);
    setSelectedThreadId(null);
    actions.selectThread(null);
    navigate('/messages', { replace: true });
  }, [actions, navigate]);

  // Auto-select first thread if none selected (desktop only)
  useEffect(() => {
    if (!selectedThreadId && filteredThreads.length > 0 && !isMobile) {
      const firstThreadId = filteredThreads[0].id;
      setSelectedThreadId(firstThreadId);
      actions.selectThread(firstThreadId);
      navigate(`/messages/thread/${firstThreadId}`, { replace: true });
    }
  }, [filteredThreads, selectedThreadId, isMobile, actions, navigate]);

  // Loading state
  if (state.isLoadingThreads) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <LoadingSkeleton />
      </Container>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error.message}
        </Alert>
      </Container>
    );
  }

  // Mobile layout - single panel
  if (isMobile) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {showThreadList ? (
          <ClientThreadList
            threads={filteredThreads}
            onThreadSelect={handleThreadSelect}
            showWelcome={showWelcome}
            eventId={eventId}
          />
        ) : selectedThreadId ? (
          <ClientConversation
            threadId={selectedThreadId}
            onBack={handleBackToList}
            showBackButton
          />
        ) : null}
      </Box>
    );
  }

  // Desktop layout - two panels
  return (
    <Container maxWidth="lg" sx={{ py: 3, height: 'calc(100vh - 140px)' }}>
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          gap: 2,
          bgcolor: 'background.default',
        }}
      >
        {/* Thread List Panel */}
        <Paper
          sx={{
            width: '350px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <ClientThreadList
            threads={filteredThreads}
            selectedThreadId={selectedThreadId}
            onThreadSelect={handleThreadSelect}
            showWelcome={false}
            eventId={eventId}
          />
        </Paper>

        {/* Message View Panel */}
        <Paper
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          {selectedThreadId ? (
            <ClientConversation
              threadId={selectedThreadId}
              simplified={simplified}
            />
          ) : (
            <EmptyStateView showWelcome={showWelcome} />
          )}
        </Paper>
      </Box>
    </Container>
  );
};

/**
 * Empty State View Component
 */
const EmptyStateView: React.FC<{ showWelcome: boolean }> = ({ showWelcome }) => (
  <Box
    sx={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      p: 4,
    }}
  >
    <Box sx={{ maxWidth: 400 }}>
      <MessageIcon
        sx={{
          fontSize: 80,
          color: 'primary.main',
          opacity: 0.7,
          mb: 3,
        }}
      />
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Select a conversation
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Choose a conversation from the list to start chatting with our team
      </Typography>
      {showWelcome && (
        <Card sx={{ mt: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="body2" color="primary.dark">
              💬 <strong>Pro tip:</strong> Our team is here to help with any questions about your events.
              Feel free to reach out anytime!
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  </Box>
);

/**
 * Loading Skeleton Component
 */
const LoadingSkeleton: React.FC = () => (
  <Box sx={{ display: 'flex', gap: 2, height: '600px' }}>
    <Paper sx={{ width: '350px', p: 2 }}>
      <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
      {[...Array(5)].map((_, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        </Box>
      ))}
    </Paper>
    <Paper sx={{ flexGrow: 1, p: 2 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Skeleton variant="rectangular" width="100%" height="80%" />
    </Paper>
  </Box>
);

export default ClientMessagesPage;