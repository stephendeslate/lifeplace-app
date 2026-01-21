// pages/contact/components/ContactSocial.tsx

import React from 'react';
import { Box, Typography, Stack, IconButton, alpha, useTheme } from '@mui/material';
import { Facebook, Instagram } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';

// TikTok icon as SVG since MUI doesn't have it
const TikTokIcon: React.FC<{ sx?: object }> = ({ sx }) => (
  <Box
    component="svg"
    sx={{ width: 24, height: 24, ...sx }}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </Box>
);

export const ContactSocial: React.FC = () => {
  const theme = useTheme();

  const socialLinks = [
    {
      name: 'Facebook',
      url: 'https://facebook.com/lifeplacealfonso',
      icon: <Facebook sx={{ fontSize: 32 }} />,
      color: '#1877F2',
      handle: '@lifeplacealfonso',
    },
    {
      name: 'Instagram',
      url: 'https://instagram.com/lifeplacealfonso',
      icon: <Instagram sx={{ fontSize: 32 }} />,
      color: '#E4405F',
      handle: '@lifeplacealfonso',
    },
    {
      name: 'TikTok',
      url: 'https://tiktok.com/@lifeplacealfonso',
      icon: <TikTokIcon sx={{ fontSize: 32 }} />,
      color: '#000000',
      handle: '@lifeplacealfonso',
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 6, md: 8 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: alpha(theme.palette.primary.main, 0.03),
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <AnimatedElement animation="fadeIn" delay={100}>
          <GlassCard variant="light" intensity="medium">
            <Stack spacing={4} alignItems="center" sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Follow Us on Social Media
              </Typography>

              <Typography variant="body1" color="text.secondary">
                Stay connected and see the latest happenings at LifePlace Alfonso.
              </Typography>

              <Stack direction="row" spacing={4}>
                {socialLinks.map((social) => (
                  <Box key={social.name} sx={{ textAlign: 'center' }}>
                    <IconButton
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        width: 64,
                        height: 64,
                        backgroundColor: alpha(social.color, 0.1),
                        color: social.color,
                        '&:hover': {
                          backgroundColor: alpha(social.color, 0.2),
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {social.icon}
                    </IconButton>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      {social.handle}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </GlassCard>
        </AnimatedElement>
      </Box>
    </Box>
  );
};
