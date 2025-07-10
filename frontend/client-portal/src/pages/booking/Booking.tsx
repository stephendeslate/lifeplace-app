// frontend/client-portal/src/pages/booking/Booking.tsx

import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Button,
  Paper,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Home as HomeIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { BookingFlowProvider } from '../../contexts/BookingFlowContext';
import { BookingFlowContainer } from '../../components/booking/BookingFlowContainer';
import { BookingErrorBoundary } from '../../components/booking/BookingErrorBoundary';
import type { CompleteBookingResponse, BookingSession } from '../../types/booking-session.types';

interface BookingProps {
  eventTypeId?: number;
  flowId?: number;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  enableAutoSave?: boolean;
  showBackButton?: boolean;
  onBackNavigation?: () => void;
}

const Booking: React.FC<BookingProps> = ({
  eventTypeId,
  flowId,
  maxWidth = 'lg',
  enableAutoSave = true,
  showBackButton = true,
  onBackNavigation,
}) => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();

  // Track current selections for development info
  const [currentEventTypeId, setCurrentEventTypeId] = useState<number | undefined>(eventTypeId);
  const [currentFlowId, setCurrentFlowId] = useState<number | undefined>(flowId);

  // Memoize the session UUID to prevent unnecessary re-renders
  const sessionUUID = useMemo(() => sessionId, [sessionId]);

  // Handle flow completion
  const handleFlowComplete = useCallback((result: CompleteBookingResponse) => {
    console.log('Booking completed:', result);
    
    // Navigate to success page with session ID
    if (result.session?.session_id) {
      navigate(`/booking/success/${result.session.session_id}`, { replace: true });
    } else {
      // Fallback navigation
      navigate('/booking/success/completed', { replace: true });
    }
  }, [navigate]);

  // Handle flow errors
  const handleFlowError = useCallback((error: Error) => {
    console.error('Booking flow error:', error);
    // Error is handled by the error boundary
  }, []);

  // Handle session creation
  const handleSessionCreated = useCallback((session: BookingSession) => {
    console.log('Session created:', session);
    
    // Update URL with session ID if not already present
    if (!sessionId && session.session_id) {
      navigate(`/booking/${session.session_id}`, { replace: true });
    }
  }, [sessionId, navigate]);

  // Handle event type selection
  const handleEventTypeSelected = useCallback((eventTypeId: number) => {
    console.log('Event type selected:', eventTypeId);
    setCurrentEventTypeId(eventTypeId);
  }, []);

  // Handle flow selection
  const handleFlowSelected = useCallback((flowId: number) => {
    console.log('Flow selected:', flowId);
    setCurrentFlowId(flowId);
  }, []);

  // Handle back navigation
  const handleBackNavigation = useCallback(() => {
    if (onBackNavigation) {
      onBackNavigation();
    } else {
      navigate('/');
    }
  }, [onBackNavigation, navigate]);

  // Create reset keys array filtering out undefined values
  const resetKeys = useMemo(() => {
    const keys: Array<string | number> = [];
    if (sessionUUID) keys.push(sessionUUID);
    if (currentEventTypeId) keys.push(currentEventTypeId);
    if (currentFlowId) keys.push(currentFlowId);
    return keys;
  }, [sessionUUID, currentEventTypeId, currentFlowId]);

  return (
    <Container maxWidth={maxWidth} sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      {/* Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            color="inherit"
            href="/"
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Typography color="text.primary">Book Your Event</Typography>
        </Breadcrumbs>
      </Box>

      {/* Back Button */}
      {showBackButton && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackNavigation}
            size="small"
          >
            Back to Home
          </Button>
        </Box>
      )}

      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 600, 
            color: 'primary.main',
            mb: 2 
          }}
        >
          Book Your Event
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary"
          sx={{ maxWidth: 600, mx: 'auto' }}
        >
          Let's create something unforgettable together. Follow the simple steps below to book your perfect event.
        </Typography>
      </Box>

      {/* Booking Flow */}
      <BookingErrorBoundary
        enableErrorReporting={true}
        resetKeys={resetKeys}
        resetOnPropsChange={false}
        onError={(error, errorInfo) => {
          console.error('Booking flow error boundary:', error, errorInfo);
          handleFlowError(error);
        }}
        onReset={() => {
          console.log('Booking flow reset');
        }}
      >
        <BookingFlowProvider 
          eventTypeId={eventTypeId} 
          flowId={flowId}
          autoStart={false}
        >
          <BookingFlowContainer
            eventTypeId={eventTypeId}
            flowId={flowId}
            sessionUUID={sessionUUID}
            enableAutoSave={enableAutoSave}
            onFlowComplete={handleFlowComplete}
            onFlowError={handleFlowError}
            onSessionCreated={handleSessionCreated}
            onEventTypeSelected={handleEventTypeSelected}
            onFlowSelected={handleFlowSelected}
          />
        </BookingFlowProvider>
      </BookingErrorBoundary>

      {/* Development Info - Simplified */}
      {process.env.NODE_ENV === 'development' && (
        <Paper sx={{ mt: 4, p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            Development Info:
          </Typography>
          <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', mt: 1 }}>
            {JSON.stringify({
              sessionUUID: sessionUUID || 'undefined',
              eventTypeId: currentEventTypeId || 'undefined',
              flowId: currentFlowId || 'undefined',
              enableAutoSave,
            }, null, 2)}
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default Booking;