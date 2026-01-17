// pages/about/components/LocationContact.tsx

import React from 'react';
import { Box, Typography, Stack, Button, IconButton, alpha, useTheme } from '@mui/material';
import {
  LocationOn,
  Phone,
  Email,
  ArrowForward,
  Facebook,
  Instagram,
  MusicNote,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { ContactInfo, SocialLink, AboutPageProps } from '../types/about.types';

export const LocationContact: React.FC<Pick<AboutPageProps, 'onNavigateToBooking'>> = ({
  onNavigateToBooking,
}) => {
  const theme = useTheme();

  const contactInfo: ContactInfo[] = [
    {
      type: 'location',
      label: 'Location',
      value: 'Patutong Malaki North, Alfonso, Cavite 4120',
      icon: <LocationOn sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
    },
    {
      type: 'phone',
      label: 'Phone',
      value: '(046) 889 0844 / (0962) 275 3145 / +639935260943',
      icon: <Phone sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
    },
    {
      type: 'email',
      label: 'Email',
      value: 'reservations.lifeplace@gmail.com',
      icon: <Email sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
    },
  ];

  const socialLinks: SocialLink[] = [
    {
      platform: 'Facebook',
      url: 'https://facebook.com/lifeplacealfonso',
      icon: <Facebook />,
    },
    {
      platform: 'Instagram',
      url: 'https://instagram.com/lifeplacealfonso',
      icon: <Instagram />,
    },
    {
      platform: 'TikTok',
      url: 'https://tiktok.com/@lifeplacealfonso',
      icon: <MusicNote />,
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        background: theme.palette.primary.main,
        color: 'white',
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Stack spacing={6}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={3} alignItems="center">
              <Typography variant="h2" sx={{ fontWeight: 600, textAlign: 'center' }}>
                Visit Us
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 700, textAlign: 'center' }}>
                We're located near Tagaytay, easily accessible from Metro Manila.
                Come visit us or get in touch to start planning your event.
              </Typography>
            </Stack>
          </AnimatedElement>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {contactInfo.map((contact, index) => (
              <AnimatedElement key={contact.type} animation="fadeIn" delay={200 + index * 100}>
                <GlassCard
                  variant="light"
                  intensity="medium"
                  hover={false}
                  sx={{
                    height: '100%',
                    backgroundColor: alpha('#fff', 0.1),
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Stack spacing={2} alignItems="center" sx={{ p: 3, textAlign: 'center' }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: '50%',
                        backgroundColor: alpha('#fff', 0.15),
                      }}
                    >
                      {contact.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'white' }}>
                        {contact.label}
                      </Typography>
                      <Typography variant="body1" sx={{ opacity: 0.9, color: 'white' }}>
                        {contact.value}
                      </Typography>
                    </Box>
                  </Stack>
                </GlassCard>
              </AnimatedElement>
            ))}
          </Box>

          <AnimatedElement animation="fadeIn" delay={500}>
            <Stack spacing={3} alignItems="center" sx={{ mt: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Follow Us
              </Typography>
              <Stack direction="row" spacing={2}>
                {socialLinks.map((social) => (
                  <IconButton
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      backgroundColor: alpha('#fff', 0.15),
                      color: 'white',
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.25),
                        transform: 'translateY(-4px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {social.icon}
                  </IconButton>
                ))}
              </Stack>
            </Stack>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={600}>
            <Stack alignItems="center" sx={{ mt: 4 }}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={onNavigateToBooking}
                sx={{
                  backgroundColor: 'white',
                  color: theme.palette.primary.main,
                  px: 5,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.9),
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Start Planning Your Event
              </Button>
            </Stack>
          </AnimatedElement>
        </Stack>
      </Box>
    </Box>
  );
};
