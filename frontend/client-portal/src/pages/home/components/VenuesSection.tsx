// pages/home/components/VenuesSection.tsx

import React from 'react';
import { Box, Typography, Stack, alpha, useTheme } from '@mui/material';
import {
  Church,
  Home as HomeIcon,
  Groups,
  Nature,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { VenueInfo } from '../types/home.types';

export const VenuesSection: React.FC = () => {
  const theme = useTheme();

  const venues: VenueInfo[] = [
    {
      id: 'sanctuary',
      icon: <Church sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      title: 'Sanctuary Chapel',
      description: 'Say your vows in our picturesque chapel, designed for a truly unforgettable wedding ceremony.',
      capacity: 'Up to 150 guests',
    },
    {
      id: 'pavilion',
      icon: <HomeIcon sx={{ fontSize: 48, color: theme.palette.secondary.main }} />,
      title: 'The Pavilion',
      description: 'A spacious multipurpose hall perfect for larger celebrations and events.',
      capacity: 'Up to 200 guests',
    },
    {
      id: 'fields',
      icon: <Nature sx={{ fontSize: 48, color: theme.palette.success.main }} />,
      title: 'Open Fields',
      description: 'The Open-Field and Angelic Field offer stunning natural surroundings for outdoor events.',
      capacity: 'Flexible outdoor space',
    },
    {
      id: 'accommodations',
      icon: <Groups sx={{ fontSize: 48, color: theme.palette.info.main }} />,
      title: 'Cabanas & Hostel',
      description: '4 comfortable cabanas (10 guests each) and Havila hostel for overnight accommodations.',
      capacity: '40+ overnight guests',
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'background.default', width: '100vw' }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack spacing={6}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={3} textAlign="center">
              <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Our Beautiful Venues
              </Typography>
              <Typography variant="h6" color="text.secondary">
                From intimate ceremonies to grand celebrations, we have the perfect space for your special occasion
              </Typography>
            </Stack>
          </AnimatedElement>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { 
                xs: '1fr', 
                md: 'repeat(2, 1fr)',
              },
              gap: 3,
            }}
          >
            {venues.map((venue, index) => (
              <AnimatedElement key={venue.id} animation="fadeIn" delay={200 + (index * 100)}>
                <GlassCard 
                  variant="light" 
                  intensity="medium"
                  hover={true}
                  sx={{ height: '100%' }}
                >
                  <Stack spacing={3} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      }}
                    >
                      {venue.icon}
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                        {venue.title}
                      </Typography>
                      <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500, mb: 2 }}>
                        {venue.capacity}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {venue.description}
                      </Typography>
                    </Box>
                  </Stack>
                </GlassCard>
              </AnimatedElement>
            ))}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};