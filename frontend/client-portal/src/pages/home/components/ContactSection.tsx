// pages/home/components/ContactSection.tsx

import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import {
  LocationOn,
  Phone,
  Email,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { ContactSectionProps } from '../types/home.types';

export const ContactSection: React.FC<ContactSectionProps> = ({
  onNavigateToBooking,
  onNavigateToRegister,
}) => {
  const { isAuthenticated } = useAuth();

  const handleBookNow = () => {
    onNavigateToBooking?.();
  };

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 3, md: 4 }, backgroundColor: 'background.default', width: '100%' }}>
      <Box sx={{ maxWidth: 800, mx: 'auto', textAlign: 'center' }}>
        <AnimatedElement animation="fadeIn" delay={100}>
          <Stack spacing={4}>
            <Typography variant="h2" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Ready to Create Memories?
            </Typography>
            
            <Typography variant="h6" color="text.secondary">
              Contact us today to discuss your event and let us help bring your vision to life at LifePlace Alfonso.
            </Typography>
            
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 4,
                justifyContent: 'center',
                alignItems: 'center',
                my: 4,
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <LocationOn color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  Alfonso, Cavite
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Phone color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  (02) 123-4567
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Email color="primary" />
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  info@lifeplacealfonso.com
                </Typography>
              </Box>
            </Box>
            
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              justifyContent="center"
              sx={{ mt: 4 }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={handleBookNow}
                sx={{ 
                  px: 4, 
                  py: 2, 
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Book Your Event Now
              </Button>
              
              {!isAuthenticated && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onNavigateToRegister}
                  sx={{ 
                    px: 4, 
                    py: 2, 
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Create Account
                </Button>
              )}
            </Stack>
          </Stack>
        </AnimatedElement>
      </Box>
    </Box>
  );
};