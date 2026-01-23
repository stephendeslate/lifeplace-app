// pages/reviews/components/TestimonialCard.tsx
// Testimonial card using Modern Organic Luxury design system

import React from 'react';
import { Box, Typography, Stack, Avatar } from '@mui/material';
import { Star } from '@mui/icons-material';
import { ModernCard, AnimatedElement, tokens } from '../../../design-system';
import type { TestimonialCardProps } from '../types/reviews.types';

export const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonial, index = 0 }) => {
  // Generate initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a consistent color based on name for avatar
  const getAvatarColor = (name: string): string => {
    const colors = [
      tokens.color.base.sage[500],
      tokens.color.base.terracotta[500],
      tokens.color.base.olive[500],
      tokens.color.base.clay[500],
      tokens.color.base.gold[600],
    ];
    const colorIndex = name.charCodeAt(0) % colors.length;
    return colors[colorIndex];
  };

  return (
    <AnimatedElement animation="slideUp" delay={100 + index * 50} duration={500}>
      <ModernCard variant="elevated" size="large" hover sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={tokens.spacing.space[5]} sx={{ height: '100%' }}>
          {/* 5-Star Rating */}
          <Box
            role="img"
            aria-label="5 star rating"
            sx={{
              display: 'flex',
              gap: tokens.spacing.space[1],
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                sx={{
                  fontSize: '1.25rem',
                  color: tokens.color.base.gold[500],
                  filter: 'drop-shadow(0 1px 2px rgba(212, 165, 116, 0.2))',
                }}
                aria-hidden="true"
              />
            ))}
          </Box>

          {/* Review Text - Quote Style */}
          <Typography
            sx={{
              ...tokens.typography.styles.quote,
              color: tokens.color.base.neutral[800],
              flex: 1,
              fontSize: { xs: '1.125rem', md: '1.25rem' },
              lineHeight: 1.7,
            }}
          >
            "{testimonial.review}"
          </Typography>

          {/* Author Info */}
          <Stack
            direction="row"
            spacing={tokens.spacing.space[3]}
            sx={{
              pt: tokens.spacing.space[4],
              borderTop: `1px solid ${tokens.color.base.neutral[200]}`,
              alignItems: 'center'
            }}
          >
            {/* Avatar */}
            <Avatar
              sx={{
                backgroundColor: getAvatarColor(testimonial.name),
                color: '#FFFFFF',
                width: 52,
                height: 52,
                fontWeight: tokens.typography.weights.semibold,
                fontSize: tokens.typography.sizes.md,
                boxShadow: tokens.shadow.elevation.sm,
              }}
            >
              {getInitials(testimonial.name)}
            </Avatar>

            {/* Author Details */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  ...tokens.typography.styles.h5,
                  fontSize: { xs: '1.125rem', md: '1.25rem' },
                  color: tokens.color.base.neutral[900],
                  mb: tokens.spacing.space[1],
                }}
              >
                {testimonial.name}
              </Typography>
              {testimonial.organization && (
                <Typography
                  sx={{
                    ...tokens.typography.styles.bodySmall,
                    color: tokens.color.base.neutral[600],
                    mb: testimonial.eventDate ? tokens.spacing.space[0.5] : 0,
                  }}
                >
                  {testimonial.organization}
                </Typography>
              )}
              {testimonial.eventDate && (
                <Typography
                  sx={{
                    ...tokens.typography.styles.caption,
                    color: tokens.color.base.neutral[500],
                  }}
                >
                  {testimonial.eventDate}
                </Typography>
              )}
            </Box>
          </Stack>
        </Stack>
      </ModernCard>
    </AnimatedElement>
  );
};
