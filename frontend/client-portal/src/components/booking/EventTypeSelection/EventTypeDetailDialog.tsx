import React from 'react';
import {
  Box,
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
  Close as CloseIcon,
  Star as StarIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { EventType } from '@/types/booking';
import { getEventTypeColor, getEventTypeFeatures } from './eventTypeUtils';

interface EventTypeDetailDialogProps {
  open: boolean;
  eventType: EventType | null;
  isSelecting: boolean;
  onClose: () => void;
  onSelect: (eventType: EventType) => void;
}

export const EventTypeDetailDialog: React.FC<EventTypeDetailDialogProps> = ({
  open,
  eventType,
  isSelecting,
  onClose,
  onSelect,
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
      {eventType && (
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
                    background: `linear-gradient(135deg, ${alpha(getEventTypeColor(eventType), 0.1)}, ${alpha(getEventTypeColor(eventType), 0.05)})`,
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
                          backgroundColor: alpha(getEventTypeColor(eventType), 0.15),
                          color: getEventTypeColor(eventType),
                          width: 80,
                          height: 80,
                        }}
                      >
                        <EventIcon sx={{ fontSize: 40 }} />
                      </Avatar>

                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
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

                    <IconButton
                      onClick={onClose}
                      sx={{
                        backgroundColor: alpha('#fff', 0.1),
                        '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    {eventType.description ||
                      `Create unforgettable memories with our ${eventType.name.toLowerCase()} package. Our experienced team will ensure every detail is perfect for your special day.`}
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
                    {getEventTypeFeatures(eventType).map((feature, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Avatar
                          sx={{
                            backgroundColor: alpha(getEventTypeColor(eventType), 0.1),
                            color: getEventTypeColor(eventType),
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
                              backgroundColor: getEventTypeColor(eventType),
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
                        backgroundColor: alpha(getEventTypeColor(eventType), 0.05),
                        borderRadius: 2,
                        border: `1px solid ${alpha(getEventTypeColor(eventType), 0.1)}`,
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
                          color: getEventTypeColor(eventType),
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
                      onClick={onClose}
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
                      onClick={() => onSelect(eventType)}
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
                        backgroundColor: alpha(getEventTypeColor(eventType), 0.9),
                        backdropFilter: 'blur(10px)',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: getEventTypeColor(eventType),
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
  );
};
