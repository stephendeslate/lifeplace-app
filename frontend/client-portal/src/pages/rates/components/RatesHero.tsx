// pages/rates/components/RatesHero.tsx

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { GradientBackground } from '../../../design-system/components/GradientBackground';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';

export const RatesHero: React.FC = () => {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    });
  };

  return (
    <GradientBackground
      gradient="forest"
      animated={true}
      sx={{
        minHeight: { xs: 'calc(100vh - 120px)', md: 'calc(100vh - 140px)' },
        color: 'white',
        mt: { xs: '-120px', md: '-140px' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: 'calc(100vh - 120px)', md: 'calc(100vh - 140px)' },
          width: '100%',
        }}
      >
        {/* Main content - centered */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            px: { xs: 3, sm: 4, md: 6 },
            py: { xs: 9, md: 14 },
            textAlign: 'center',
          }}
        >
          <Stack spacing={{ xs: 4, md: 6 }} alignItems="center" sx={{ width: '100%' }}>
            <AnimatedElement animation="fadeIn" delay={100}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '4rem', lg: '5rem' },
                    fontWeight: 700,
                    maxWidth: 900,
                    lineHeight: 1.1,
                    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    textAlign: 'center',
                  }}
                >
                  Rates & Packages
                </Typography>
              </Box>
            </AnimatedElement>

            <AnimatedElement animation="fadeIn" delay={200}>
              <Typography
                variant="h5"
                sx={{
                  maxWidth: 700,
                  opacity: 0.95,
                  fontWeight: 400,
                  lineHeight: 1.6,
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  textAlign: 'center',
                }}
              >
                Transparent pricing for all our services. Choose the package that best fits
                your event needs and budget.
              </Typography>
            </AnimatedElement>
          </Stack>
        </Box>

        {/* Scroll indicator - at bottom */}
        <Box
          onClick={scrollToContent}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pb: 4,
            cursor: 'pointer',
            animation: 'bounce 2s infinite',
            '@keyframes bounce': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-10px)' },
            },
          }}
        >
          <KeyboardArrowDown
            sx={{
              fontSize: 48,
              color: 'white',
              opacity: 0.8,
              '&:hover': {
                opacity: 1,
              },
            }}
          />
        </Box>
      </Box>
    </GradientBackground>
  );
};
