// frontend/client-portal/src/pages/booking/Booking.tsx

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Alert,
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

  // Memoize the session UUID to prevent unnecessary re-renders
  const sessionUUID = useMemo(() => sessionId, [sessionId]);

  // Handle flow completion
  const handleFlowComplete = (result: CompleteBookingResponse) => {
    console.log('Booking completed:', result);
    
    // Navigate to success page with session ID
    if (result.session?.session_id) {
      navigate(`/booking/success/${result.session.session_id}`, { replace: true });
    } else {
      // Fallback navigation
      navigate('/booking/success/completed', { replace: true });
    }
  };

  // Handle flow errors
  const handleFlowError = (error: Error) => {
    console.error('Booking flow error:', error);
    // Error is handled by the error boundary
  };

  // Handle session creation
  const handleSessionCreated = (session: BookingSession) => {
    console.log('Session created:', session);
    
    // Update URL with session ID if not already present
    if (!sessionId && session.session_id) {
      navigate(`/booking/${session.session_id}`, { replace: true });
    }
  };

  // Handle back navigation
  const handleBackNavigation = () => {
    if (onBackNavigation) {
      onBackNavigation();
    } else {
      navigate('/');
    }
  };

  // Create reset keys array filtering out undefined values
  const resetKeys = useMemo(() => {
    const keys: Array<string | number> = [];
    if (sessionUUID) keys.push(sessionUUID);
    if (eventTypeId) keys.push(eventTypeId);
    if (flowId) keys.push(flowId);
    return keys;
  }, [sessionUUID, eventTypeId, flowId]);

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
        <BookingFlowProvider eventTypeId={eventTypeId} autoStart={false}>
          <BookingFlowContainer
            eventTypeId={eventTypeId}
            flowId={flowId}
            sessionUUID={sessionUUID}
            enableAutoSave={enableAutoSave}
            onFlowComplete={handleFlowComplete}
            onFlowError={handleFlowError}
            onSessionCreated={handleSessionCreated}
          />
        </BookingFlowProvider>
      </BookingErrorBoundary>

      {/* Development Info */}
      {process.env.NODE_ENV === 'development' && (
        <Paper sx={{ mt: 4, p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="caption" color="text.secondary">
            Development Info:
          </Typography>
          <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', mt: 1 }}>
            {JSON.stringify({
              sessionUUID: sessionUUID || 'undefined',
              eventTypeId: eventTypeId || 'undefined',
              flowId: flowId || 'undefined',
              enableAutoSave,
            }, null, 2)}
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default Booking;