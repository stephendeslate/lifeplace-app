import React from 'react';
import { Box, Typography, Stack, useTheme, alpha, CircularProgress } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

const SuccessState: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 360px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        width: '100%',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Stack spacing={4}>
          <AnimatedElement animation="fadeIn" delay={100}>
            <Stack spacing={2} textAlign="center">
              <CheckCircle
                sx={{
                  fontSize: 100,
                  color: theme.palette.success.light,
                  mx: 'auto',
                  filter: 'drop-shadow(0 4px 20px rgba(0,255,0,0.4))',
                }}
              />

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 600,
                  color: 'white',
                  textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                Password Reset Successful!
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: alpha('#fff', 0.9),
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}
              >
                Your password has been reset successfully
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: alpha('#fff', 0.8),
                }}
              >
                Redirecting to login...
              </Typography>
            </Stack>
          </AnimatedElement>

          <AnimatedElement animation="slideUp" delay={200}>
            <CircularProgress size={40} sx={{ color: 'white', mx: 'auto', display: 'block' }} />
          </AnimatedElement>
        </Stack>
      </Box>
    </Box>
  );
};

export default SuccessState;
