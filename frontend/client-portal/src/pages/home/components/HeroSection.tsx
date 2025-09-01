// pages/home/components/HeroSection.tsx

import React from 'react';
import { Box, Typography, Button, Stack, alpha, useTheme } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { GradientBackground } from '../../../design-system/components/GradientBackground';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { HeroSectionProps } from '../types/home.types';

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigateToLogin,
  onNavigateToRegister: _onNavigateToRegister,
  onNavigateToBooking,
}) => {
  const { isAuthenticated, user } = useAuth();
  const theme = useTheme();

  const handleBookNow = () => {
    onNavigateToBooking?.();
  };

  return (
    <GradientBackground 
      gradient="forest" 
      animated={true}
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
      }}
    >
      <Box
        sx={{
          width: '100%',
          px: { xs: 2, sm: 3, md: 4 },
          textAlign: 'center',
        }}
      >
        <Stack spacing={4} alignItems="center" sx={{ width: '100%' }}>
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
                Celebrate Life's Most
                <Box component="span" sx={{ display: 'block', color: alpha('#fff', 0.9) }}>
                  Precious Moments
                </Box>
              </Typography>
            </Box>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={200}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
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
                Experience the cozy ambience and peaceful environment at LifePlace Alfonso. 
                Our breathtaking venue offers the perfect blend of beauty and luxury for your special occasions.
              </Typography>
            </Box>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={300}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <GlassCard 
                variant="light" 
                intensity="medium" 
                sx={{ 
                  maxWidth: 600,
                  textAlign: 'center',
                }}
              >
              <Typography
                variant="h6"
                sx={{
                  fontStyle: 'italic',
                  opacity: 0.9,
                  fontWeight: 400,
                  color: 'white',
                }}
              >
                "I have come that they may have life, and have it to the full."
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, mt: 1, color: 'white' }}>
                John 10:10b
              </Typography>
              </GlassCard>
            </Box>
          </AnimatedElement>

          <AnimatedElement animation="fadeIn" delay={400}>
            {!isAuthenticated ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                sx={{ 
                  mt: 4, 
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleBookNow}
                  endIcon={<ArrowForward />}
                  sx={{
                    backgroundColor: 'white',
                    color: theme.palette.primary.main,
                    px: 4,
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
                  Book Your Event
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onNavigateToLogin}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderWidth: 2,
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: alpha('#fff', 0.15),
                      borderWidth: 2,
                      transform: 'translateY(-3px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Client Portal
                </Button>
              </Stack>
            ) : (
              <Stack spacing={3} alignItems="center" sx={{ width: '100%' }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    opacity: 0.95,
                    textAlign: 'center',
                  }}
                >
                  Welcome back, {user?.first_name || user?.email}! 🌿
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={3}
                  sx={{ 
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleBookNow}
                    endIcon={<ArrowForward />}
                    sx={{
                      backgroundColor: 'white',
                      color: theme.palette.primary.main,
                      px: 4,
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
                    Book Your Event
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => window.location.href = '/dashboard'}
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      px: 4,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      borderWidth: 2,
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: alpha('#fff', 0.15),
                        borderWidth: 2,
                        transform: 'translateY(-3px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Go to Dashboard
                  </Button>
                </Stack>
              </Stack>
            )}
          </AnimatedElement>
        </Stack>
      </Box>
    </GradientBackground>
  );
};