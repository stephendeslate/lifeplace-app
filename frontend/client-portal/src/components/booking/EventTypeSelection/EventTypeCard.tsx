import React from 'react';
import { Box, Typography, Button, Avatar, Chip, useTheme, alpha } from '@mui/material';
import {
  Event as EventIcon,
  AttachMoney as PriceIcon,
  Star as StarIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { EventType } from '@/types/booking';
import { getEventTypeColor, getEventTypeFeatures } from './eventTypeUtils';

interface EventTypeCardProps {
  eventType: EventType;
  index: number;
  onCardClick: (eventType: EventType) => void;
}

export const EventTypeCard: React.FC<EventTypeCardProps> = ({ eventType, index, onCardClick }) => {
  const theme = useTheme();
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
            onCardClick(eventType);
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
        onClick={() => onCardClick(eventType)}
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
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: eventColor }}>
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
              onCardClick(eventType);
            }}
          >
            Learn More & Select
          </Button>
        </Box>
      </GlassCard>
    </AnimatedElement>
  );
};
