// pages/about/components/AboutHero.tsx

import React from 'react';
import { Box, Typography, alpha, Stack } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { GradientBackground } from '../../../design-system/components/GradientBackground';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';

export const AboutHero: React.FC = () => {
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        py: { xs: 9, md: 14 },
        mt: { xs: '-120px', md: '-140px' },
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: '100%',
          px: { xs: 3, sm: 4, md: 6 },
          textAlign: 'center',
        }}
      >
        <Stack spacing={{ xs: 5, md: 9 }} alignItems="center" sx={{ width: '100%' }}>
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
                LifePlace Alfonso
                <Box component="span" sx={{ display: 'block', color: alpha('#fff', 0.9), mt: 2 }}>
                  Retreat & Event Center
                </Box>
              </Typography>
            </Box>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={200}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <GlassCard
                variant="light"
                intensity="medium"
                sx={{
                  maxWidth: 700,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    fontStyle: 'italic',
                    opacity: 0.95,
                    fontWeight: 400,
                    color: 'white',
                    lineHeight: 1.6,
                  }}
                >
                  "I have come that they may have life, and have it to the full."
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.8, mt: 2, color: 'white' }}>
                  John 10:10b
                </Typography>
              </GlassCard>
            </Box>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={300}>
            <Typography
              variant="h6"
              sx={{
                maxWidth: 800,
                opacity: 0.9,
                fontWeight: 400,
                lineHeight: 1.6,
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                textAlign: 'center',
              }}
            >
              Located in the peaceful hills of Alfonso, Cavite, near Tagaytay,
              we provide a sanctuary for life's most meaningful celebrations and gatherings.
            </Typography>
          </AnimatedElement>
        </Stack>
      </Box>

      {/* Scroll indicator */}
      <Box
        onClick={scrollToContent}
        sx={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          cursor: 'pointer',
          animation: 'bounce 2s infinite',
          '@keyframes bounce': {
            '0%, 100%': { transform: 'translateX(-50%) translateY(0)' },
            '50%': { transform: 'translateX(-50%) translateY(-10px)' },
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
    </GradientBackground>
  );
};
