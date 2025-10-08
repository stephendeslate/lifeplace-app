// pages/home/components/VenuesSection.tsx

import React from 'react';
import { Box, Typography, Stack, alpha, useTheme } from '@mui/material';
import {
  Church,
  Home as HomeIcon,
  Nature,
  Hotel,
  Landscape,
  Groups,
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
      title: 'Sanctuary',
      description: 'Chapel - Suitable for church weddings',
      capacity: '',
    },
    {
      id: 'cabanas',
      icon: <Hotel sx={{ fontSize: 48, color: theme.palette.info.main }} />,
      title: 'Cabanas',
      description: '4 total - Each accommodates 6-10 people',
      capacity: '',
    },
    {
      id: 'pavilion',
      icon: <HomeIcon sx={{ fontSize: 48, color: theme.palette.secondary.main }} />,
      title: 'The Pavilion',
      description: 'Multipurpose hall - Capacity: 100-200 people (depending on setup)',
      capacity: '',
    },
    {
      id: 'open-field',
      icon: <Landscape sx={{ fontSize: 48, color: theme.palette.success.main }} />,
      title: 'Open-Field',
      description: 'For larger gatherings',
      capacity: '',
    },
    {
      id: 'angelic-field',
      icon: <Nature sx={{ fontSize: 48, color: '#4CAF50' }} />,
      title: 'Angelic Field',
      description: 'Outdoor event space',
      capacity: '',
    },
    {
      id: 'havila',
      icon: <Groups sx={{ fontSize: 48, color: '#FF9800' }} />,
      title: 'Havila',
      description: '(newly opened) - Hostel - Accommodates 150-300 people for overnight stays',
      capacity: '',
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'background.default', width: '100vw' }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack spacing={6}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main', textAlign: 'center' }}>
              Facilities & Amenities
            </Typography>
          </AnimatedElement>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 3,
            }}
          >
            {venues.map((venue, index) => (
              <AnimatedElement key={venue.id} animation="fadeIn" delay={200 + index * 100}>
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
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                        {venue.title}
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