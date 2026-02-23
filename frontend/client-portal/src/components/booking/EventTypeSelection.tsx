// frontend/client-portal/src/components/booking/EventTypeSelection.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogContent,
  useTheme,
  alpha,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Event as EventIcon,
  People as PeopleIcon,
  AttachMoney as PriceIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Star as StarIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { GlassSpinner } from '../loading';
import { BookingCoreApi } from '../../apis/booking/core.api';
import type { EventType } from '../../types/booking';

interface EventTypeSelectionProps {
  onSelectEventType: (eventType: EventType) => Promise<void>;
}

interface EventTypeFeature {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const getEventTypeFeatures = (eventType: EventType): EventTypeFeature[] => {
  // Return features based on actual event type data
  const features: EventTypeFeature[] = [];

  // Add capacity if available in event type data
  if (eventType.description) {
    features.push({
      icon: <PeopleIcon fontSize="small" />,
      label: 'Event Type',
      description: eventType.description,
    });
  }

  // Add basic venue feature
  features.push({
    icon: <LocationIcon fontSize="small" />,
    label: 'Venue',
    description: 'Professional event space',
  });

  return features;
};

const DEFAULT_COLOR = '#5a7c47'; // Forest Green fallback

const getEventTypeColor = (eventType: EventType) => {
  // Use the color from the API if available, otherwise use default
  return eventType.color || DEFAULT_COLOR;
};

export const EventTypeSelection: React.FC<EventTypeSelectionProps> = ({ onSelectEventType }) => {
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
        if (import.meta.env.DEV) console.error('Failed to load event types:', err);
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
      if (import.meta.env.DEV) console.error('Failed to select event type:', error);
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
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <GlassSpinner size={60} message="Loading event types..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <AnimatedElement animation="slideUp" delay={100}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}
          >
            <Avatar
              sx={{
                backgroundColor: alpha(theme.palette.error.main, 0.15),
                color: theme.palette.error.main,
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
              }}
            >
              <InfoIcon sx={{ fontSize: 32 }} />
            </Avatar>

            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Unable to Load Event Types
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {error}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Please contact us directly for assistance:
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<PhoneIcon />}
                href="tel:+63212345067"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                }}
              >
                (02) 123-4567
              </Button>
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                href="mailto:info@lifeplacealfonso.com"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                }}
              >
                Email Us
              </Button>
            </Box>
          </GlassCard>
        </AnimatedElement>
      </Container>
    );
  }

  if (eventTypes.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <AnimatedElement animation="slideUp" delay={100}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              No Event Types Available
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We're currently updating our event offerings. Please check back later or contact us
              directly.
            </Typography>
          </GlassCard>
        </AnimatedElement>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        pt: 0, // Remove top padding - BookingLayout handles spacing
        pb: 6,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <AnimatedElement animation="slideDown" delay={100}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                mb: 2,
                color: 'primary.main',
                textShadow: '0 2px 10px rgba(0,0,0,0.1)',
              }}
            >
              Choose Your Event Type
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}
            >
              Select the perfect event type for your special occasion at LifePlace Alfonso
            </Typography>
          </Box>
        </AnimatedElement>

        {/* Event Type Cards */}
        <Box
          sx={{
            display: 'grid',
            gap: 4,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, 1fr)',
              lg: eventTypes.length >= 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            },
            maxWidth: 1200,
            mx: 'auto',
            mb: 6,
          }}
        >
          {eventTypes.map((eventType, index) => {
            const eventColor = getEventTypeColor(eventType);
            const features = getEventTypeFeatures(eventType);

            return (
              <AnimatedElement key={eventType.id} animation="slideUp" delay={200 + index * 100}>
                <GlassCard
                  variant="light"
                  intensity="medium"
                  hover
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${eventType.name} event type. ${eventType.description || ''}`}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCardClick(eventType);
                    }
                  }}
                  sx={{
                    height: '100%',
                    backgroundColor: alpha('#fff', 0.08),
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover, &:focus': {
                      transform: 'translateY(-8px)',
                      backgroundColor: alpha('#fff', 0.15),
                      border: `1px solid ${alpha(eventColor, 0.3)}`,
                      boxShadow: `0 20px 60px ${alpha(eventColor, 0.2)}`,
                      outline: 'none',
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${eventColor}`,
                      outlineOffset: '2px',
                    },
                  }}
                  onClick={() => handleCardClick(eventType)}
                >
                  <Box sx={{ p: 4 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 3 }}>
                      <Avatar
                        sx={{
                          backgroundColor: alpha(eventColor, 0.15),
                          color: eventColor,
                          width: 64,
                          height: 64,
                        }}
                      >
                        <EventIcon sx={{ fontSize: 32 }} />
                      </Avatar>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                          {eventType.name}
                        </Typography>

                        {eventType.is_active && (
                          <Chip
                            label="Available"
                            size="small"
                            icon={<StarIcon />}
                            sx={{
                              backgroundColor: alpha(theme.palette.warning.main, 0.15),
                              color: theme.palette.warning.main,
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Description */}
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ mb: 3, lineHeight: 1.6, minHeight: 48 }}
                    >
                      {eventType.description ||
                        `Perfect for ${eventType.name.toLowerCase()} celebrations with elegant venue settings and comprehensive service packages.`}
                    </Typography>

                    {/* Features */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                      {features.map((feature, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              backgroundColor: alpha(eventColor, 0.1),
                              color: eventColor,
                              width: 32,
                              height: 32,
                            }}
                          >
                            {feature.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {feature.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {feature.description}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Price Range */}
                    {
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: alpha(eventColor, 0.05),
                          borderRadius: 2,
                          border: `1px solid ${alpha(eventColor, 0.1)}`,
                          mb: 3,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <PriceIcon sx={{ color: eventColor, fontSize: 20 }} />
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600, color: eventColor }}
                          >
                            Starting Price
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                          Starting from ₱15,000
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          *Final pricing based on selections
                        </Typography>
                      </Box>
                    }

                    {/* Action Button */}
                    <Button
                      variant="contained"
                      fullWidth
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        backgroundColor: alpha(eventColor, 0.9),
                        backdropFilter: 'blur(10px)',
                        py: 1.5,
                        fontWeight: 600,
                        textTransform: 'none',
                        fontSize: '1rem',
                        boxShadow: `0 8px 25px ${alpha(eventColor, 0.3)}`,
                        '&:hover': {
                          backgroundColor: eventColor,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 12px 35px ${alpha(eventColor, 0.4)}`,
                        },
                        transition: 'all 0.3s ease',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(eventType);
                      }}
                    >
                      Learn More & Select
                    </Button>
                  </Box>
                </GlassCard>
              </AnimatedElement>
            );
          })}
        </Box>

        {/* Contact Information */}
        <AnimatedElement animation="slideUp" delay={600}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              p: 4,
              textAlign: 'center',
              maxWidth: 600,
              mx: 'auto',
              backgroundColor: alpha('#fff', 0.05),
              border: `1px solid ${alpha('#fff', 0.1)}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Need Help Choosing?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Our event specialists are here to help you find the perfect event type for your
              special occasion.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<PhoneIcon />}
                href="tel:+63212345067"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                }}
              >
                (02) 123-4567
              </Button>
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                href="mailto:info@lifeplacealfonso.com"
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                }}
              >
                info@lifeplacealfonso.com
              </Button>
            </Box>
          </GlassCard>
        </AnimatedElement>
      </Container>

      {/* Event Type Detail Dialog */}
      <Dialog
        open={isDetailDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            backgroundImage: 'none',
          },
        }}
      >
        {selectedEventType && (
          <Fade in timeout={300}>
            <Box>
              <GlassCard
                variant="light"
                intensity="strong"
                sx={{
                  backgroundColor: alpha('#fff', 0.95),
                  backdropFilter: 'blur(25px)',
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                  boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <DialogContent sx={{ p: 0 }}>
                  {/* Header */}
                  <Box
                    sx={{
                      p: 4,
                      background: `linear-gradient(135deg, ${alpha(getEventTypeColor(selectedEventType), 0.1)}, ${alpha(getEventTypeColor(selectedEventType), 0.05)})`,
                      borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 3,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Avatar
                          sx={{
                            backgroundColor: alpha(getEventTypeColor(selectedEventType), 0.15),
                            color: getEventTypeColor(selectedEventType),
                            width: 80,
                            height: 80,
                          }}
                        >
                          <EventIcon sx={{ fontSize: 40 }} />
                        </Avatar>

                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            {selectedEventType.name}
                          </Typography>

                          {selectedEventType.is_active && (
                            <Chip
                              label="Available"
                              size="small"
                              icon={<StarIcon />}
                              sx={{
                                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                                color: theme.palette.warning.main,
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      <IconButton
                        onClick={handleCloseDialog}
                        sx={{
                          backgroundColor: alpha('#fff', 0.1),
                          '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                        }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>

                    <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                      {selectedEventType.description ||
                        `Create unforgettable memories with our ${selectedEventType.name.toLowerCase()} package. Our experienced team will ensure every detail is perfect for your special day.`}
                    </Typography>
                  </Box>

                  {/* Content */}
                  <Box sx={{ p: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                      What's Included
                    </Typography>

                    {/* Features Grid */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 3,
                        mb: 4,
                      }}
                    >
                      {getEventTypeFeatures(selectedEventType).map((feature, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Avatar
                            sx={{
                              backgroundColor: alpha(getEventTypeColor(selectedEventType), 0.1),
                              color: getEventTypeColor(selectedEventType),
                              width: 40,
                              height: 40,
                            }}
                          >
                            {feature.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {feature.label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {feature.description}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    {/* Additional Features */}
                    <Box
                      sx={{
                        p: 3,
                        backgroundColor: alpha('#fff', 0.1),
                        borderRadius: 2,
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                        mb: 4,
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Premium Amenities
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 1,
                        }}
                      >
                        {[
                          'Professional event coordination',
                          'Setup and cleanup services',
                          'Basic audio/visual equipment',
                          'Tables, chairs, and linens',
                          'Parking facilities',
                          'Security and safety measures',
                        ].map((amenity, idx) => (
                          <Typography
                            key={idx}
                            variant="body2"
                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                          >
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: getEventTypeColor(selectedEventType),
                              }}
                            />
                            {amenity}
                          </Typography>
                        ))}
                      </Box>
                    </Box>

                    {/* Pricing */}
                    {
                      <Box
                        sx={{
                          p: 3,
                          backgroundColor: alpha(getEventTypeColor(selectedEventType), 0.05),
                          borderRadius: 2,
                          border: `1px solid ${alpha(getEventTypeColor(selectedEventType), 0.1)}`,
                          mb: 4,
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Starting at
                        </Typography>
                        <Typography
                          variant="h3"
                          sx={{
                            fontWeight: 700,
                            color: getEventTypeColor(selectedEventType),
                            mb: 1,
                          }}
                        >
                          Starting from ₱15,000
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Final pricing will be calculated based on your specific selections
                        </Typography>
                      </Box>
                    }

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
                        endIcon={
                          isSelecting ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <ArrowForwardIcon />
                          )
                        }
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
                </DialogContent>
              </GlassCard>
            </Box>
          </Fade>
        )}
      </Dialog>
    </Box>
  );
};
