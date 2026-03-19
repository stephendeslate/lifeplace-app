import React from 'react';
import { Box, Button, Typography, Stack, useTheme, alpha } from '@mui/material';
import { ArrowBack, Error as ErrorIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

interface InvalidTokenStateProps {
  tokenError: string;
  onBackToHome: () => void;
  onBackToLogin: () => void;
  onRequestNewLink: () => void;
}

const InvalidTokenState: React.FC<InvalidTokenStateProps> = ({
  tokenError,
  onBackToHome,
  onBackToLogin,
  onRequestNewLink,
}) => {
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
              <Button
                startIcon={<ArrowBack />}
                onClick={onBackToHome}
                sx={{
                  alignSelf: 'flex-start',
                  mb: 2,
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.2),
                  },
                }}
              >
                Back to Home
              </Button>

              <ErrorIcon
                sx={{
                  fontSize: 80,
                  color: theme.palette.error.light,
                  mx: 'auto',
                  filter: 'drop-shadow(0 4px 20px rgba(255,0,0,0.4))',
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
                Invalid Reset Link
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: alpha('#fff', 0.9),
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}
              >
                {tokenError}
              </Typography>
            </Stack>
          </AnimatedElement>

          <AnimatedElement animation="slideUp" delay={200}>
            <GlassCard
              variant="light"
              intensity="strong"
              sx={{
                p: 4,
                backdropFilter: 'blur(20px)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }}
            >
              <Stack spacing={3}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={onRequestNewLink}
                  sx={{
                    py: 2,
                    fontSize: '1rem',
                    fontWeight: 600,
                    backgroundColor: 'white',
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: alpha('#fff', 0.9),
                    },
                  }}
                >
                  Request New Reset Link
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={onBackToLogin}
                  sx={{
                    py: 2,
                    borderColor: alpha('#fff', 0.5),
                    color: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: alpha('#fff', 0.1),
                    },
                  }}
                >
                  Back to Login
                </Button>
              </Stack>
            </GlassCard>
          </AnimatedElement>
        </Stack>
      </Box>
    </Box>
  );
};

export default InvalidTokenState;
