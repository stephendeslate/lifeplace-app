// pages/about/components/FacilitiesGrid.tsx

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
import type { FacilityInfo } from '../types/about.types';

export const FacilitiesGrid: React.FC = () => {
  const theme = useTheme();

  const facilities: FacilityInfo[] = [
    {
      id: 'sanctuary',
      name: 'Sanctuary',
      description: 'Chapel - Suitable for church weddings',
      capacity: '',
      icon: <Church sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
    },
    {
      id: 'cabanas',
      name: 'Cabanas',
      description: '4 total - Each accommodates 6-10 people',
      capacity: '',
      icon: <Hotel sx={{ fontSize: 48, color: theme.palette.info.main }} />,
    },
    {
      id: 'pavilion',
      name: 'The Pavilion',
      description: 'Multipurpose hall - Capacity: 100-200 people (depending on setup)',
      capacity: '',
      icon: <HomeIcon sx={{ fontSize: 48, color: theme.palette.secondary.main }} />,
    },
    {
      id: 'open-field',
      name: 'Open-Field',
      description: 'For larger gatherings',
      capacity: '',
      icon: <Landscape sx={{ fontSize: 48, color: theme.palette.success.main }} />,
    },
    {
      id: 'angelic-field',
      name: 'Angelic Field',
      description: 'Outdoor event space',
      capacity: '',
      icon: <Nature sx={{ fontSize: 48, color: '#4CAF50' }} />,
    },
    {
      id: 'havila',
      name: 'Havila',
      description: '(newly opened) - Hostel - Accommodates 150-300 people for overnight stays',
      capacity: '',
      icon: <Groups sx={{ fontSize: 48, color: '#FF9800' }} />,
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: 'background.paper',
        width: '100vw',
      }}
    >
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
            {facilities.map((facility, index) => (
              <AnimatedElement key={facility.id} animation="fadeIn" delay={200 + index * 100}>
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
                      {facility.icon}
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                        {facility.name}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {facility.description}
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
