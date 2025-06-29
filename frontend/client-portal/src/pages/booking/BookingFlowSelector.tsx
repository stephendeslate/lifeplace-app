// frontend/client-portal/src/pages/booking/BookingFlowSelector.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Event as EventIcon,
  ArrowForward,
  People,
  Schedule,
  Info,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useBookingFlows, useStartBookingSession } from '../../hooks/useBookingFlow';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';
import type { BookingFlow } from '../../types/bookingflow.types';

interface BookingFlowSelectorProps {
  onFlowSelected?: (flowId: number, sessionId: string) => void;
  preselectedEventType?: string;
}

const BookingFlowSelector: React.FC<BookingFlowSelectorProps> = ({
  onFlowSelected,
  preselectedEventType,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showInfo } = useToastActions();
  
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null);
  
  const {
    data: bookingFlows = [],
    isLoading: isLoadingFlows,
    error: flowsError,
  } = useBookingFlows();

  const startSessionMutation = useStartBookingSession();

  // Filter flows by preselected event type if provided
  const filteredFlows = React.useMemo(() => {
    if (!preselectedEventType) return bookingFlows;
    
    return bookingFlows.filter(flow => 
      flow.event_type_name?.toLowerCase().includes(preselectedEventType.toLowerCase()) ||
      !flow.event_type_name // Include "Any Event Type" flows
    );
  }, [bookingFlows, preselectedEventType]);

  const handleSelectFlow = async (flow: BookingFlow) => {
    if (!isAuthenticated && flow.require_account_creation) {
      showInfo(
        'Account Required',
        'This booking flow requires an account. Please sign in or create an account to continue.'
      );
      navigate('/login', { state: { from: { pathname: '/booking' } } });
      return;
    }

    setSelectedFlowId(flow.id);

    try {
      const session = await startSessionMutation.mutateAsync(flow.id);
      
      if (onFlowSelected) {
        onFlowSelected(flow.id, session.session_id);
      } else {
        // Navigate to booking wizard with session ID
        navigate(`/booking/${flow.id}/${session.session_id}`);
      }
    } catch (error) {
      console.error('Failed to start booking session:', error);
      setSelectedFlowId(null);
    }
  };

  // @ts-ignore
  const getFlowIcon = (eventTypeName: string | null) => {
    // Return appropriate icon based on event type
    return <EventIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />;
  };

  if (isLoadingFlows) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          gap: 3,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary">
          Loading booking options...
        </Typography>
      </Box>
    );
  }

  if (flowsError) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Unable to Load Booking Options
          </Typography>
          <Typography variant="body2">
            We're having trouble loading the available booking flows. 
            Please refresh the page or try again later.
          </Typography>
        </Alert>
        <Button
          variant="outlined"
          onClick={() => window.location.reload()}
          fullWidth
        >
          Refresh Page
        </Button>
      </Box>
    );
  }

  if (filteredFlows.length === 0) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
          No Booking Options Available
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {preselectedEventType
            ? `No booking flows are currently available for "${preselectedEventType}" events.`
            : 'No booking flows are currently available.'
          }
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Please contact us directly to discuss your event needs.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: 'primary.main',
            fontSize: { xs: '2rem', md: '3rem' },
          }}
        >
          Choose Your Event Type
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ maxWidth: 700, mx: 'auto', lineHeight: 1.6 }}
        >
          Select the type of event you'd like to book. Each option is tailored 
          to provide you with the perfect experience for your special occasion.
        </Typography>
        {preselectedEventType && (
          <Chip
            label={`Filtered by: ${preselectedEventType}`}
            color="primary"
            variant="outlined"
            sx={{ mt: 2 }}
          />
        )}
      </Box>

      {/* Booking Flow Cards */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          justifyContent: { xs: 'center', md: 'flex-start' },
        }}
      >
        {filteredFlows.map((flow) => (
          <Box
            key={flow.id}
            sx={{
              flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)', lg: '1 1 calc(33.333% - 16px)' },
              maxWidth: { xs: '100%', md: 'calc(50% - 12px)', lg: 'calc(33.333% - 16px)' },
              minWidth: { xs: '100%', sm: 320 },
            }}
          >
            <Card
              elevation={2}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'visible',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: theme.shadows[12],
                  '& .flow-card-action': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                  },
                },
                ...(selectedFlowId === flow.id && {
                  boxShadow: theme.shadows[12],
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    right: -2,
                    bottom: -2,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    borderRadius: Number(theme.shape.borderRadius) + 2,
                    zIndex: -1,
                  },
                }),
              }}
            >
              {/* Loading Overlay */}
              {selectedFlowId === flow.id && startSessionMutation.status === 'pending' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: alpha('#fff', 0.9),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    borderRadius: 1,
                  }}
                >
                  <Stack alignItems="center" spacing={2}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary">
                      Starting your booking...
                    </Typography>
                  </Stack>
                </Box>
              )}

              <CardContent sx={{ flex: 1, p: 3 }}>
                <Stack spacing={3}>
                  {/* Icon and Title */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        p: 2,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        mb: 2,
                      }}
                    >
                      {getFlowIcon(flow.event_type_name)}
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        color: 'text.primary',
                      }}
                    >
                      {flow.name}
                    </Typography>
                    <Chip
                      label={flow.event_type_name || 'Any Event Type'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  {/* Description */}
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.6,
                      textAlign: 'center',
                      minHeight: 48, // Ensure consistent card heights
                    }}
                  >
                    {flow.description || 'Experience our comprehensive booking process tailored for your perfect event.'}
                  </Typography>

                  {/* Features */}
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Schedule sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {flow.total_steps} step booking process
                      </Typography>
                    </Box>
                    
                    {!flow.require_account_creation && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <People sx={{ fontSize: 20, color: 'success.main' }} />
                        <Typography variant="body2" color="success.main">
                          No account required
                        </Typography>
                      </Box>
                    )}

                    {flow.enable_progress_saving && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Info sx={{ fontSize: 20, color: 'info.main' }} />
                        <Typography variant="body2" color="info.main">
                          Save progress as you go
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Stack>
              </CardContent>

              <CardActions sx={{ p: 3, pt: 0 }}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => handleSelectFlow(flow)}
                  disabled={startSessionMutation.status === 'pending'}
                  className="flow-card-action"
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {selectedFlowId === flow.id && startSessionMutation.status === 'pending'
                    ? 'Starting...'
                    : 'Start Booking'
                  }
                </Button>
              </CardActions>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Help Text */}
      <Box
        sx={{
          mt: 6,
          p: 3,
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
          Need Help Choosing?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Our team is here to help you select the perfect option for your event. 
          Feel free to contact us if you have any questions.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
        >
          <Typography variant="body2" color="text.secondary">
            📞 (02) 123-4567
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ✉️ info@lifeplacealfonso.com
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default BookingFlowSelector;