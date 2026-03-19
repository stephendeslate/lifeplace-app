import React from 'react';
import { Box, Typography, Button, Avatar, alpha, useTheme, Stack } from '@mui/material';
import { Support as SupportIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

export const ContactSupport: React.FC = () => {
  const theme = useTheme();

  return (
    <AnimatedElement animation="slideUp" delay={400}>
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            p: 4,
            maxWidth: 600,
            mx: 'auto',
            backgroundColor: alpha(theme.palette.info.main, 0.05),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <Avatar
            sx={{
              backgroundColor: alpha(theme.palette.info.main, 0.15),
              color: theme.palette.info.main,
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
            }}
          >
            <SupportIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Still need help?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Our support team is here to assist you with any questions or concerns.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.9),
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            >
              Contact Support
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                backgroundColor: alpha('#fff', 0.1),
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.2),
                },
              }}
            >
              Live Chat
            </Button>
          </Stack>
        </GlassCard>
      </Box>
    </AnimatedElement>
  );
};
