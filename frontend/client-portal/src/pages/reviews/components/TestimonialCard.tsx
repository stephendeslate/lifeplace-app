// pages/reviews/components/TestimonialCard.tsx

import React from 'react';
import { Box, Typography, Stack, Avatar, alpha, useTheme } from '@mui/material';
import { FormatQuote } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { TestimonialCardProps } from '../types/reviews.types';

export const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonial, index = 0 }) => {
  const theme = useTheme();

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a consistent color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <AnimatedElement animation="fadeIn" delay={200 + index * 50}>
      <GlassCard variant="light" intensity="medium" hover sx={{ height: '100%' }}>
        <Stack spacing={3} sx={{ p: 4, height: '100%' }}>
          {/* Quote Icon */}
          <FormatQuote
            sx={{
              fontSize: 40,
              color: alpha(theme.palette.primary.main, 0.3),
              transform: 'rotate(180deg)',
            }}
          />

          {/* Review Text */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              lineHeight: 1.8,
              fontStyle: 'italic',
              flex: 1,
            }}
          >
            "{testimonial.review}"
          </Typography>

          {/* Author Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Avatar
              sx={{
                backgroundColor: getAvatarColor(testimonial.name),
                width: 48,
                height: 48,
                fontWeight: 600,
              }}
            >
              {getInitials(testimonial.name)}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {testimonial.name}
              </Typography>
              {testimonial.organization && (
                <Typography variant="body2" color="text.secondary">
                  {testimonial.organization}
                </Typography>
              )}
              {testimonial.eventDate && (
                <Typography variant="caption" color="text.secondary">
                  {testimonial.eventDate}
                </Typography>
              )}
            </Box>
          </Box>
        </Stack>
      </GlassCard>
    </AnimatedElement>
  );
};
