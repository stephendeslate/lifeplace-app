// pages/services/components/ServiceCard.tsx

import React from 'react';
import { Box, Typography, Stack, Button, alpha, useTheme } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { ServiceCardProps } from '../types/services.types';

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleLearnMore = () => {
    navigate('/booking');
  };

  return (
    <AnimatedElement animation="fadeIn" delay={200 + index * 100}>
      <GlassCard
        variant="light"
        intensity="medium"
        hover={true}
        sx={{ height: '100%' }}
      >
        <Stack spacing={3} sx={{ p: 4, height: '100%' }}>
          {/* Icon */}
          <Box
            sx={{
              p: 3,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              width: 'fit-content',
            }}
          >
            {service.icon}
          </Box>

          {/* Title */}
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {service.name}
          </Typography>

          {/* Description */}
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {service.description}
          </Typography>

          {/* Features */}
          <Stack spacing={1} sx={{ flex: 1 }}>
            {service.features.map((feature, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {feature}
                </Typography>
              </Box>
            ))}
          </Stack>

          {/* CTA Button */}
          <Button
            variant="outlined"
            color="primary"
            endIcon={<ArrowForward />}
            onClick={handleLearnMore}
            sx={{
              mt: 'auto',
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2,
              },
            }}
          >
            {service.ctaText || 'Book Now'}
          </Button>
        </Stack>
      </GlassCard>
    </AnimatedElement>
  );
};
