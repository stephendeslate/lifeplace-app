// frontend/client-portal/src/pages/booking/BookingFlow.tsx

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Container, Alert, Typography, Paper, CircularProgress } from '@mui/material';
import { BookingProvider, useBooking } from '../../contexts/BookingContext';
import { BookingContainer } from '../../components/booking/BookingContainer';
import { StepRenderer } from '../../components/booking/StepRenderer';
import { useEventTypes } from '../../hooks/booking/useBookingCore';
import type { EventType } from '../../types/booking';

// Event Type Selection Component using the proper hook
const EventTypeSelection: React.FC = () => {
  // @ts-ignore
  const { actions } = useBooking();
  const { eventTypes, loading, error } = useEventTypes();

  const handleSelectEventType = async (eventType: EventType) => {
    try {
      await actions.selectEventType(eventType);
    } catch (error) {
      // Error is handled by the booking context
      console.error('Failed to select event type:', error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading event types...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
          Please check back later or contact us directly at{' '}
          <a href="mailto:info@lifeplacealfonso.com" style={{ color: 'blue' }}>
            info@lifeplacealfonso.com
          </a>
        </Typography>
      </Container>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">
          No event types are currently available for booking. Please check back later or contact us directly.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
          Select Your Event Type
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Choose the type of event you'd like to book at LifePlace Alfonso.
        </Typography>
      </Box>

      <Box sx={{ 
        display: 'grid', 
        gap: 3, 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        maxWidth: 800,
        mx: 'auto'
      }}>
        {eventTypes.map((eventType) => (
          <Paper
            key={eventType.id}
            elevation={0}
            onClick={() => handleSelectEventType(eventType)}
            sx={{
              p: 4,
              border: 2,
              borderColor: 'divider',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              '&:hover': {
                borderColor: 'primary.main',
                transform: 'translateY(-4px)',
                boxShadow: 4,
                backgroundColor: 'primary.light',
              },
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
              {eventType.name}
            </Typography>
            {eventType.description && (
              <Typography variant="body1" color="text.secondary">
                {eventType.description}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>

      {/* Contact Information */}
      <Box sx={{ textAlign: 'center', mt: 6 }}>
        <Typography variant="body2" color="text.secondary">
          Need help choosing? Contact us at{' '}
          <a href="tel:+63212345067" style={{ color: 'blue' }}>
            (02) 123-4567
          </a>{' '}
          or{' '}
          <a href="mailto:info@lifeplacealfonso.com" style={{ color: 'blue' }}>
            info@lifeplacealfonso.com
          </a>
        </Typography>
      </Box>
    </Container>
  );
};

// Main booking flow component
const BookingFlowContent: React.FC = () => {
  const { state } = useBooking();

  // Show loading state
  if (state.ui.isLoading && !state.currentFlow) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading booking flow...
        </Typography>
      </Container>
    );
  }

  // Show event type selection if no flow is selected
  if (!state.currentFlow) {
    return <EventTypeSelection />;
  }

  // Show the booking flow
  return (
    <BookingContainer>
      <StepRenderer />
    </BookingContainer>
  );
};

// Main booking page designed to work within PublicLayout
export const BookingPage: React.FC = () => {
  return (
    <BookingProvider>
      {/* No background styling here - handled by PublicLayout */}
      <BookingFlowContent />
    </BookingProvider>
  );
};

// Booking completion page designed to work within PublicLayout
export const BookingComplete: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    // No Box wrapper with minHeight - handled by PublicLayout
    <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
      <Paper
        elevation={0}
        sx={{
          p: 6,
          border: 2,
          borderColor: 'success.main',
          borderRadius: 4,
          backgroundColor: 'success.light',
          mb: 4,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 3, color: 'success.dark' }}>
          🎉 Booking Confirmed!
        </Typography>
        <Typography variant="h6" sx={{ mb: 3, color: 'success.dark' }}>
          Thank you for choosing LifePlace Alfonso. Your event has been successfully booked.
        </Typography>
        
        {sessionId && (
          <Box sx={{ 
            p: 2, 
            backgroundColor: 'success.main', 
            borderRadius: 2, 
            color: 'success.contrastText',
            mb: 2 
          }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Booking Reference: {sessionId.slice(-8).toUpperCase()}
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', textAlign: 'left', mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
          What's Next?
        </Typography>
        
        <Box component="ul" sx={{ pl: 0, listStyle: 'none' }}>
          <Box component="li" sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>
              1.
            </Typography>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Confirmation Email
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You'll receive a detailed confirmation email within the next few minutes.
              </Typography>
            </Box>
          </Box>
          
          <Box component="li" sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>
              2.
            </Typography>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Personal Contact
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Our event coordinator will contact you within 24 hours to finalize arrangements.
              </Typography>
            </Box>
          </Box>
          
          <Box component="li" sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>
              3.
            </Typography>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Event Preparation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We'll work with you to ensure every detail is perfect for your special day.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Need to contact us?
        </Typography>
        <Typography variant="body2">
          <strong>Phone:</strong> (02) 123-4567<br />
          <strong>Email:</strong> info@lifeplacealfonso.com<br />
          We're here to help make your event unforgettable!
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Box
          component="button"
          onClick={() => window.location.href = '/dashboard'}
          sx={{
            px: 4,
            py: 2,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            border: 'none',
            borderRadius: 2,
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            minWidth: 160,
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          }}
        >
          View Dashboard
        </Box>
        <Box
          component="button"
          onClick={() => window.location.href = '/'}
          sx={{
            px: 4,
            py: 2,
            backgroundColor: 'transparent',
            color: 'primary.main',
            border: 2,
            borderColor: 'primary.main',
            borderRadius: 2,
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            minWidth: 160,
            '&:hover': {
              backgroundColor: 'primary.light',
            },
          }}
        >
          Return Home
        </Box>
      </Box>
    </Container>
  );
};