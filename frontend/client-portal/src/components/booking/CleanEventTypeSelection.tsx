// frontend/client-portal/src/components/booking/CleanEventTypeSelection.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CardContent,
  Dialog,
  DialogContent,
  CircularProgress,
  Alert,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { BookingCoreApi } from '../../apis/booking/core.api';
import type { EventType } from '../../types/booking';

interface CleanEventTypeSelectionProps {
  onSelectEventType: (eventType: EventType) => Promise<void>;
}

const getEventTypeColor = (eventType: EventType) => {
  const colors = [
    '#1976d2', // Blue
    '#2e7d32', // Green
    '#ed6c02', // Orange
    '#9c27b0', // Purple
    '#d32f2f', // Red
    '#0288d1', // Light Blue
  ];
  
  return colors[eventType.id % colors.length];
};

export const CleanEventTypeSelection: React.FC<CleanEventTypeSelectionProps> = ({
  onSelectEventType,
}) => {
  const theme = useTheme();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    const loadEventTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await BookingCoreApi.getEventTypes();
        setEventTypes(data);
      } catch (err) {
        console.error('Failed to load event types:', err);
        setError(BookingCoreApi.handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    loadEventTypes();
  }, []);

  const handleCardClick = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setIsDetailDialogOpen(true);
  };

  const handleSelectEventType = async (eventType: EventType) => {
    setIsSelecting(true);
    try {
      await onSelectEventType(eventType);
    } catch (error) {
      console.error('Failed to select event type:', error);
    } finally {
      setIsSelecting(false);
      setIsDetailDialogOpen(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDetailDialogOpen(false);
    setSelectedEventType(null);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center'
      }}>
        <CircularProgress size={48} sx={{ mb: 3 }} />
        <Typography variant="h6" color="text.secondary">
          Loading event types...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 8 }}>
        <Alert 
          severity="error" 
          sx={{
            backgroundColor: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
          }}
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <Box sx={{ 
        textAlign: 'center', 
        py: 8,
        maxWidth: 600,
        mx: 'auto'
      }}>
        <Typography variant="h5" gutterBottom>
          No Event Types Available
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please check back later or contact support for assistance.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pt: { xs: 3, md: 4 }, pb: { xs: 4, md: 5 } }}>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
              mx: 'auto',
              mb: 2,
            }}
          >
            <EventIcon sx={{ fontSize: 32 }} />
          </Avatar>
          
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Choose Your Event Type
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
            Select the type of event you'd like to book with us
          </Typography>
        </Box>
      </AnimatedElement>

      {/* Event Type Grid */}
      <Box sx={{ 
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 3,
        mb: 4 
      }}>
        {eventTypes.map((eventType, index) => (
          <AnimatedElement key={eventType.id} animation="slideUp" delay={200 + index * 100}>
              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  backgroundColor: alpha('#fff', 0.08),
                  border: `1px solid ${alpha('#fff', 0.1)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    backgroundColor: alpha(getEventTypeColor(eventType), 0.05),
                    border: `2px solid ${alpha(getEventTypeColor(eventType), 0.3)}`,
                    boxShadow: `0 12px 40px ${alpha(getEventTypeColor(eventType), 0.2)}`,
                  },
                }}
                onClick={() => handleCardClick(eventType)}
              >
                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Event Type Header */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 60,
                        height: 60,
                        backgroundColor: alpha(getEventTypeColor(eventType), 0.15),
                        color: getEventTypeColor(eventType),
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      <EventIcon sx={{ fontSize: 30 }} />
                    </Avatar>
                    
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                      {eventType.name}
                    </Typography>
                  </Box>

                  {/* Description */}
                  <Box sx={{ flex: 1, mb: 3 }}>
                    {eventType.description && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          lineHeight: 1.6,
                          textAlign: 'center'
                        }}
                      >
                        {eventType.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Action Button */}
                  <Button
                    variant="outlined"
                    fullWidth
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      mt: 'auto',
                      borderColor: alpha(getEventTypeColor(eventType), 0.5),
                      color: getEventTypeColor(eventType),
                      backgroundColor: alpha(getEventTypeColor(eventType), 0.05),
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: alpha(getEventTypeColor(eventType), 0.1),
                        borderColor: getEventTypeColor(eventType),
                      },
                    }}
                  >
                    Select This Type
                  </Button>
                </CardContent>
              </GlassCard>
            </AnimatedElement>
        ))}
      </Box>

      {/* Event Type Detail Dialog */}
      <Dialog
        open={isDetailDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: alpha('#fff', 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha('#fff', 0.2)}`,
            borderRadius: 3,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          },
        }}
      >
        <DialogContent sx={{ p: 4 }}>
          {selectedEventType && (
            <Box>
              {/* Header */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                mb: 4 
              }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      backgroundColor: alpha(getEventTypeColor(selectedEventType), 0.15),
                      color: getEventTypeColor(selectedEventType),
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <EventIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                  
                  <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    {selectedEventType.name}
                  </Typography>
                </Box>
                
                <Button
                  onClick={handleCloseDialog}
                  sx={{ 
                    minWidth: 'auto', 
                    p: 1,
                    color: 'text.secondary'
                  }}
                >
                  <CloseIcon />
                </Button>
              </Box>

              {/* Description */}
              {selectedEventType.description && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="body1" sx={{ lineHeight: 1.6, textAlign: 'center' }}>
                    {selectedEventType.description}
                  </Typography>
                </Box>
              )}

              {/* Additional event type properties can be shown here if needed */}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={handleCloseDialog}
                  sx={{
                    minWidth: 120,
                    backgroundColor: alpha('#fff', 0.1),
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  Back to Selection
                </Button>
                
                <Button
                  variant="contained"
                  onClick={() => handleSelectEventType(selectedEventType)}
                  disabled={isSelecting}
                  endIcon={isSelecting ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                  sx={{
                    minWidth: 160,
                    backgroundColor: alpha(getEventTypeColor(selectedEventType), 0.9),
                    backdropFilter: 'blur(10px)',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: getEventTypeColor(selectedEventType),
                    },
                  }}
                >
                  {isSelecting ? 'Starting...' : 'Start Booking'}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};