// frontend/client-portal/src/components/booking/steps/EventTypeSelection.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  Event as EventIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useBookingFlowContext } from '../../../contexts/BookingFlowContext';
import type { EventType, PublicBookingFlow } from '../../../types/booking.types';

interface EventTypeSelectionProps {
  onEventTypeSelected?: (eventType: EventType, flow: PublicBookingFlow) => void;
  onContinueWithoutEventType?: (flow: PublicBookingFlow) => void;
}

const EventTypeSelection: React.FC<EventTypeSelectionProps> = ({
  onEventTypeSelected,
  onContinueWithoutEventType,
}) => {
  const {
    eventTypes,
    availableFlows,
    selectedFlow,
    selectEventType,
    selectFlow,
    isLoadingEventTypes,
    isLoadingFlows,
    flowError,
    clearError,
  } = useBookingFlowContext();

  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Auto-select if only one event type is available
  useEffect(() => {
    if (eventTypes && eventTypes.length === 1 && !selectedEventTypeId) {
      const singleEventType = eventTypes[0];
      setSelectedEventTypeId(singleEventType.id);
      selectEventType(singleEventType.id);
    }
  }, [eventTypes, selectedEventTypeId, selectEventType]);

  // Auto-select flow if only one is available for selected event type
  useEffect(() => {
    if (availableFlows && availableFlows.length === 1 && !selectedFlow && selectedEventTypeId) {
      const singleFlow = availableFlows[0];
      handleFlowSelection(singleFlow);
    }
  }, [availableFlows, selectedFlow, selectedEventTypeId]);

  const handleEventTypeSelection = async (eventType: EventType) => {
    try {
      setIsSelecting(true);
      setSelectedEventTypeId(eventType.id);
      selectEventType(eventType.id);
      clearError();
    } catch (error) {
      console.error('Error selecting event type:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleFlowSelection = async (flow: PublicBookingFlow) => {
    try {
      setIsSelecting(true);
      await selectFlow(flow.id);
      
      // Find the selected event type
      const eventType = eventTypes?.find(et => et.id === selectedEventTypeId);
      
      if (eventType && onEventTypeSelected) {
        onEventTypeSelected(eventType, flow);
      } else if (!eventType && onContinueWithoutEventType) {
        onContinueWithoutEventType(flow);
      }
      
      clearError();
    } catch (error) {
      console.error('Error selecting flow:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleUniversalFlowSelection = async () => {
    // Look for universal flows (those without specific event type)
    const universalFlows = availableFlows?.filter(flow => !flow.event_type_name || flow.event_type_name === 'Any Event Type');
    
    if (universalFlows && universalFlows.length > 0) {
      const universalFlow = universalFlows[0];
      try {
        setIsSelecting(true);
        await selectFlow(universalFlow.id);
        
        if (onContinueWithoutEventType) {
          onContinueWithoutEventType(universalFlow);
        }
        
        clearError();
      } catch (error) {
        console.error('Error selecting universal flow:', error);
      } finally {
        setIsSelecting(false);
      }
    }
  };

  const handleRetry = () => {
    clearError();
    // The queries will automatically retry due to React Query
  };

  // Show loading skeleton
  if (isLoadingEventTypes || isLoadingFlows) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Typography variant="h4" sx={{ mb: 4, textAlign: 'center' }}>
          <Skeleton width="60%" sx={{ mx: 'auto' }} />
        </Typography>
        
        <Stack spacing={3}>
          {[1, 2, 3].map((index) => (
            <Card key={index}>
              <CardContent>
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="text" width="80%" height={24} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }

  // Show error state
  if (flowError) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetry}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
          sx={{ mb: 3 }}
        >
          Unable to load booking options. Please try again.
        </Alert>
      </Box>
    );
  }

  // Show event type selection if no event type is selected
  if (!selectedEventTypeId && eventTypes && eventTypes.length > 1) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 2, 
            textAlign: 'center',
            fontWeight: 600,
            color: 'primary.main'
          }}
        >
          What type of event are you planning?
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 4, 
            textAlign: 'center',
            color: 'text.secondary',
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          Choose the type of event that best describes what you're planning so we can provide you with the most relevant options.
        </Typography>

        <Stack spacing={3}>
          {eventTypes.map((eventType) => (
            <Card 
              key={eventType.id}
              sx={{ 
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleEventTypeSelection(eventType)}
                disabled={isSelecting}
                sx={{ p: 3 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EventIcon 
                    sx={{ 
                      fontSize: 40, 
                      color: 'primary.main',
                      flexShrink: 0
                    }} 
                  />
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600,
                        mb: 1,
                        color: 'text.primary'
                      }}
                    >
                      {eventType.name}
                    </Typography>
                    
                    {eventType.description && (
                      <Typography 
                        variant="body2" 
                        sx={{ color: 'text.secondary' }}
                      >
                        {eventType.description}
                      </Typography>
                    )}
                  </Box>
                  
                  <ArrowForwardIcon 
                    sx={{ 
                      color: 'primary.main',
                      flexShrink: 0
                    }} 
                  />
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Stack>

        {/* Option to continue without selecting specific event type */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Don't see your event type?
          </Typography>
          
          <Button
            variant="outlined"
            onClick={handleUniversalFlowSelection}
            disabled={isSelecting}
            sx={{ minWidth: 200 }}
          >
            {isSelecting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Loading...
              </>
            ) : (
              'Continue with General Booking'
            )}
          </Button>
        </Box>

        {isSelecting && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>
    );
  }

  // Show flow selection if multiple flows are available for selected event type
  if (selectedEventTypeId && availableFlows && availableFlows.length > 1) {
    const selectedEventType = eventTypes?.find(et => et.id === selectedEventTypeId);
    
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            mb: 2, 
            textAlign: 'center',
            fontWeight: 600,
            color: 'primary.main'
          }}
        >
          {selectedEventType?.name} Booking Options
        </Typography>
        
        <Typography 
          variant="body1" 
          sx={{ 
            mb: 4, 
            textAlign: 'center',
            color: 'text.secondary',
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          We have multiple booking options available for {selectedEventType?.name?.toLowerCase()}. 
          Choose the one that best fits your needs.
        </Typography>

        <Stack spacing={3}>
          {availableFlows.map((flow) => (
            <Card 
              key={flow.id}
              sx={{ 
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleFlowSelection(flow)}
                disabled={isSelecting}
                sx={{ p: 3 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EventIcon 
                    sx={{ 
                      fontSize: 40, 
                      color: 'primary.main',
                      flexShrink: 0
                    }} 
                  />
                  
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600,
                          color: 'text.primary'
                        }}
                      >
                        {flow.name}
                      </Typography>
                      
                      <Chip 
                        label={`${flow.total_steps} steps`}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                    
                    {flow.description && (
                      <Typography 
                        variant="body2" 
                        sx={{ color: 'text.secondary', mb: 1 }}
                      >
                        {flow.description}
                      </Typography>
                    )}
                    
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {flow.allow_guest_booking && (
                        <Chip 
                          label="Guest Booking"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                      
                      {flow.enable_progress_saving && (
                        <Chip 
                          label="Save Progress"
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                  
                  <ArrowForwardIcon 
                    sx={{ 
                      color: 'primary.main',
                      flexShrink: 0
                    }} 
                  />
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Stack>

        {/* Back button to change event type */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="text"
            onClick={() => {
              setSelectedEventTypeId(null);
              clearError();
            }}
            disabled={isSelecting}
          >
            Choose Different Event Type
          </Button>
        </Box>

        {isSelecting && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>
    );
  }

  // Show loading state when selection is being processed
  if (isSelecting) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Setting up your booking...
        </Typography>
      </Box>
    );
  }

  // Fallback for no event types or flows available
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        No booking options are currently available. Please contact us directly to schedule your event.
      </Alert>
      
      <Button
        variant="outlined"
        onClick={handleRetry}
        startIcon={<RefreshIcon />}
      >
        Refresh
      </Button>
    </Box>
  );
};

export default EventTypeSelection;