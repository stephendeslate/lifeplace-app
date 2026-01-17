// pages/contact/components/ContactMap.tsx

import React from 'react';
import { Box, Typography, Stack, Button, alpha, useTheme } from '@mui/material';
import { Map, OpenInNew, LocationOn } from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';

export const ContactMap: React.FC = () => {
  const theme = useTheme();

  const handleOpenMap = () => {
    window.open(
      'https://www.google.com/maps/search/?api=1&query=Patutong+Malaki+North+Alfonso+Cavite+4120',
      '_blank'
    );
  };

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4, md: 6 },
        backgroundColor: alpha(theme.palette.primary.main, 0.03),
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <AnimatedElement animation="fadeIn" delay={100}>
          <GlassCard variant="light" intensity="medium">
            <Stack spacing={4} sx={{ p: { xs: 4, md: 6 } }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Find Us
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                  Located in the serene hills of Alfonso, Cavite, near Tagaytay
                </Typography>
              </Box>

              {/* Map Placeholder */}
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 250, md: 350 },
                  backgroundColor: alpha(theme.palette.grey[500], 0.1),
                  borderRadius: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <Map sx={{ fontSize: 64, color: alpha(theme.palette.primary.main, 0.5) }} />
                <Stack spacing={1} alignItems="center">
                  <LocationOn color="primary" />
                  <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Patutong Malaki North
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Alfonso, Cavite 4120
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<OpenInNew />}
                  onClick={handleOpenMap}
                  sx={{ px: 4 }}
                >
                  Open in Google Maps
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Just a short drive from Tagaytay City, LifePlace Alfonso offers easy access
                while providing a peaceful retreat from the busy city life.
              </Typography>
            </Stack>
          </GlassCard>
        </AnimatedElement>
      </Box>
    </Box>
  );
};
