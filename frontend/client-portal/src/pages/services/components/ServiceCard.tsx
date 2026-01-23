// pages/services/components/ServiceCard.tsx
// Modern Organic Luxury redesigned service card

import React from 'react';
import { Box, Typography, Stack, Button } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ModernCard, AnimatedElement, tokens } from '../../../design-system';
import type { ServiceCardProps } from '../types/services.types';

/**
 * Get accent color based on service type
 * Maps service IDs to appropriate color schemes for visual variety
 */
const getServiceAccentColor = (serviceId: string) => {
  const colorMap: Record<string, { icon: string; bg: string }> = {
    'camps-retreats': {
      icon: tokens.color.base.sage[600],
      bg: tokens.color.base.neutral[100],
    },
    'team-building': {
      icon: tokens.color.base.terracotta[600],
      bg: tokens.color.base.neutral[100],
    },
    'workshops': {
      icon: tokens.color.base.olive[600],
      bg: tokens.color.base.neutral[100],
    },
    'weddings': {
      icon: tokens.color.base.terracotta[500],
      bg: tokens.color.base.neutral[100],
    },
  };

  return colorMap[serviceId] || colorMap['camps-retreats'];
};

/**
 * ServiceCard Component
 *
 * Displays individual service information using Modern Organic Luxury design system.
 *
 * Features:
 * - Modern elevated card with hover effects
 * - Service-type specific accent colors
 * - Circular icon background
 * - Feature list with bullet points
 * - CTA button with arrow icon
 * - Staggered slideUp animations
 * - WCAG AA compliant contrast ratios
 * - Responsive layout
 */
export const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  const navigate = useNavigate();
  const accentColors = getServiceAccentColor(service.id);

  const handleLearnMore = () => {
    navigate('/booking');
  };

  return (
    <AnimatedElement animation="slideUp" delay={200 + index * 100}>
      <ModernCard
        variant="elevated"
        size="large"
        hover
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack
          spacing={3}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Icon Container */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: tokens.spacing.radius.full,
              backgroundColor: accentColors.bg,
              transition: tokens.animation.transition.all,
              flexShrink: 0,
              color: accentColors.icon,
            }}
            aria-hidden="true"
          >
            {service.icon}
          </Box>

          {/* Service Name */}
          <Typography
            variant="h4"
            component="h3"
            sx={{
              fontWeight: tokens.typography.weights.semibold,
              color: tokens.color.base.sage[900],
              lineHeight: tokens.typography.lineHeights.tight,
            }}
          >
            {service.name}
          </Typography>

          {/* Service Description */}
          <Typography
            variant="body1"
            sx={{
              color: tokens.color.base.neutral[700],
              lineHeight: tokens.typography.lineHeights.relaxed,
            }}
          >
            {service.description}
          </Typography>

          {/* Features List */}
          <Stack
            spacing={2}
            sx={{
              flex: 1,
              pt: tokens.spacing.space[2],
            }}
          >
            {service.features.map((feature, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: tokens.spacing.space[2],
                }}
              >
                {/* Bullet Point */}
                <Box
                  sx={{
                    width: '6px',
                    height: '6px',
                    borderRadius: tokens.spacing.radius.full,
                    backgroundColor: accentColors.icon,
                    flexShrink: 0,
                    mt: '8px', // Align with first line of text
                  }}
                  aria-hidden="true"
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: tokens.color.base.neutral[600],
                    lineHeight: tokens.typography.lineHeights.relaxed,
                    flex: 1,
                  }}
                >
                  {feature}
                </Typography>
              </Box>
            ))}
          </Stack>

          {/* CTA Button */}
          <Box sx={{ mt: 'auto', pt: tokens.spacing.space[4] }}>
            <Button
              variant="outlined"
              fullWidth
              endIcon={<ArrowForward />}
              onClick={handleLearnMore}
              aria-label={`Learn more about ${service.name}`}
              sx={{
                color: tokens.color.base.sage[700],
                borderColor: tokens.color.base.sage[400],
                borderWidth: 2,
                borderRadius: tokens.spacing.radius.lg,
                fontWeight: tokens.typography.weights.semibold,
                fontSize: tokens.typography.sizes.sm,
                textTransform: 'none',
                px: tokens.spacing.space[4],
                py: tokens.spacing.space[2],
                transition: tokens.animation.transition.smooth,
                '&:hover': {
                  borderWidth: 2,
                  borderColor: tokens.color.base.sage[600],
                  backgroundColor: tokens.color.base.sage[50],
                  transform: 'translateY(-2px)',
                  boxShadow: tokens.shadow.elevation.md,
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              }}
            >
              {service.ctaText || 'Learn More'}
            </Button>
          </Box>
        </Stack>
      </ModernCard>
    </AnimatedElement>
  );
};
