// Forgot Password Page
// Public page for requesting password reset

import React from 'react';
import { Box, Typography } from '@mui/material';
import { ModernPageLayout, ModernGlassCard } from '../../components/common';
import { ForgotPasswordForm } from '../../components/auth';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

export const ForgotPassword: React.FC = () => {
  return (
    <ModernPageLayout
      backgroundPattern="vibrant"
      maxWidth={false}
      disableGutters
      paddingY={0}
      sx={{
        minHeight: '100vh',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        p: 0,
        m: 0,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 460,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 3, sm: 4 },
          position: 'relative',
          mx: 'auto',
          py: { xs: 4, sm: 6 },
          px: { xs: 3, sm: 4 },
          minWidth: { xs: 300, sm: 360 },
        }}
      >
        {/* Main Card */}
        <ModernGlassCard
          size="large"
          color="primary"
          animation="none"
          borderRadius="xxl"
          sx={{
            width: '100%',
            position: 'relative',
            overflow: 'hidden',

            ...glassPresets.strong,
            border: `1px solid ${tokens.color.borders.glass}`,

            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.secondary[500]}06 50%, ${tokens.color.success[500]}04 100%)`,
              pointerEvents: 'none',
              zIndex: 0,
            },

            '& > *': {
              position: 'relative',
              zIndex: 1,
            },
          }}
        >
          <ForgotPasswordForm />
        </ModernGlassCard>

        {/* Support Footer */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 460,
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xl,
            border: `1px solid ${tokens.color.borders.glass}`,
            p: { xs: 2.5, sm: 3 },
            textAlign: 'center',
            position: 'relative',

            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(135deg, ${tokens.color.neutral[500]}02 0%, ${tokens.color.neutral[600]}01 100%)`,
              borderRadius: tokens.spacing.radius.xl,
              pointerEvents: 'none',
            },

            '& > *': {
              position: 'relative',
              zIndex: 1,
            },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: tokens.color.neutral[600],
              fontWeight: 500,
              letterSpacing: '0.025em',
            }}
          >
            Need help? Contact your system administrator
          </Typography>
        </Box>
      </Box>
    </ModernPageLayout>
  );
};
