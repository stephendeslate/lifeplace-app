// pages/contact/components/ContactInfo.tsx

import React from 'react';
import { Box, Typography, Stack, Button, alpha, useTheme } from '@mui/material';
import { Phone, Email, LocationOn, AccessTime } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';

export const ContactInfo: React.FC = () => {
  const theme = useTheme();

  const contactDetails = [
    {
      icon: <Phone sx={{ fontSize: 32, color: 'primary.main' }} />,
      title: 'Phone Numbers',
      lines: ['(046) 889 0844', '+63 993 526 0943', '(0962) 275 3145'],
      action: {
        label: 'Call Now',
        href: 'tel:+639935260943',
      },
    },
    {
      icon: <Email sx={{ fontSize: 32, color: 'primary.main' }} />,
      title: 'Email Address',
      lines: ['reservations.lifeplace@gmail.com'],
      action: {
        label: 'Send Email',
        href: 'mailto:reservations.lifeplace@gmail.com',
      },
    },
    {
      icon: <LocationOn sx={{ fontSize: 32, color: 'primary.main' }} />,
      title: 'Address',
      lines: ['Patutong Malaki North', 'Alfonso, Cavite 4120', 'Philippines'],
      action: {
        label: 'Get Directions',
        href: 'https://maps.google.com/?q=Patutong+Malaki+North+Alfonso+Cavite',
      },
    },
    {
      icon: <AccessTime sx={{ fontSize: 32, color: 'primary.main' }} />,
      title: 'Office Hours',
      lines: ['Monday - Sunday', '8:00 AM - 6:00 PM', 'Available for inquiries'],
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: 'background.paper',
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Stack spacing={6}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
              <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Get in Touch
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 700 }}
              >
                Reach out to us through any of these channels. We're ready to help
                you plan your perfect event.
              </Typography>
            </Stack>
          </AnimatedElement>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
              },
              gap: 4,
            }}
          >
            {contactDetails.map((detail, index) => (
              <AnimatedElement key={index} animation="fadeIn" delay={200 + index * 100}>
                <GlassCard variant="light" intensity="medium" hover sx={{ height: '100%' }}>
                  <Stack spacing={3} sx={{ p: 4 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        width: 'fit-content',
                      }}
                    >
                      {detail.icon}
                    </Box>

                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                        {detail.title}
                      </Typography>
                      {detail.lines.map((line, idx) => (
                        <Typography key={idx} variant="body1" color="text.secondary">
                          {line}
                        </Typography>
                      ))}
                    </Box>

                    {detail.action && (
                      <Button
                        variant="outlined"
                        href={detail.action.href}
                        target={detail.action.href.startsWith('http') ? '_blank' : undefined}
                        sx={{
                          mt: 'auto',
                          borderWidth: 2,
                          '&:hover': {
                            borderWidth: 2,
                          },
                        }}
                      >
                        {detail.action.label}
                      </Button>
                    )}
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
