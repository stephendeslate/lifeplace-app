// pages/home/components/ServicesSection.tsx

import React from 'react';
import { Box, Typography, Stack, Card, CardContent, alpha, useTheme } from '@mui/material';
import {
  Favorite,
  Groups,
  Spa,
  Nature,
} from '@mui/icons-material';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { ServiceInfo } from '../types/home.types';

export const ServicesSection: React.FC = () => {
  const theme = useTheme();

  const services: ServiceInfo[] = [
    {
      id: 'weddings',
      title: 'Weddings',
      description: 'Create timeless memories in our beautiful venues with comprehensive wedding packages.',
      icon: <Favorite sx={{ fontSize: 48, color: '#E91E63' }} />,
    },
    {
      id: 'team-building',
      title: 'Team Building',
      description: 'Strengthen bonds and foster creativity through hands-on activities in a peaceful environment.',
      icon: <Groups sx={{ fontSize: 48, color: theme.palette.info.light }} />,
    },
    {
      id: 'retreats',
      title: 'Retreats',
      description: 'Connect with others and find spiritual renewal in our tranquil retreat setting.',
      icon: <Spa sx={{ fontSize: 48, color: '#9C27B0' }} />,
    },
    {
      id: 'camping',
      title: 'Camping',
      description: 'Experience nature and community in our safe and comfortable camping facilities.',
      icon: <Nature sx={{ fontSize: 48, color: '#4CAF50' }} />,
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'primary.main', color: 'white', width: '100vw' }}>
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Stack spacing={6}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={3} textAlign="center">
              <Typography variant="h2" sx={{ fontWeight: 600 }}>
                Our Services
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                We provide comprehensive packages for every type of celebration and gathering
              </Typography>
            </Stack>
          </AnimatedElement>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 3,
            }}
          >
            {services.map((service, index) => (
              <AnimatedElement key={service.id} animation="fadeIn" delay={200 + (index * 100)}>
                <Card
                  elevation={2}
                  sx={{
                    height: '100%',
                    backgroundColor: alpha('#fff', 0.1),
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha('#fff', 0.2)}`,
                    color: 'white',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      backgroundColor: alpha('#fff', 0.15),
                    },
                  }}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Stack spacing={3} alignItems="center">
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: '50%', 
                        backgroundColor: alpha('#fff', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {service.icon}
                      </Box>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                          {service.title}
                        </Typography>
                        <Typography variant="body1" sx={{ lineHeight: 1.7, opacity: 0.9 }}>
                          {service.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </AnimatedElement>
            ))}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};