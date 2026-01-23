// components/layout/PublicLayout.tsx

import React from 'react';
import { Box } from '@mui/material';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { tokens } from '../../design-system';

interface PublicLayoutProps {
  children: React.ReactNode;
  fullHeight?: boolean;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  fullHeight = false,
  onNavigateToLogin,
  onNavigateToRegister,
}) => {

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        // Modern Organic Luxury background gradient - natural and sophisticated
        background: tokens.color.gradients.heroNatural,
        backgroundSize: '200% 200%',
        animation: 'gradient 15s ease infinite',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          backgroundPosition: '0% 50%',
        },
        // Use design system keyframe for gradient animation
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        // Radial gradient overlays for depth using design system tokens
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            ${tokens.color.gradients.radialSage},
            ${tokens.color.gradients.radialWarm}
          `,
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      {/* Header */}
      <Box
        component="header"
        role="banner"
        sx={{ position: 'relative', zIndex: 2 }}
      >
        <PublicHeader
          onNavigateToLogin={onNavigateToLogin}
          onNavigateToRegister={onNavigateToRegister}
        />
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          // Use design system tokens for content offset - maintains exact spacing
          pt: {
            xs: tokens.spacing.layoutComponents.contentOffset.mobile,  // 120px
            md: tokens.spacing.layoutComponents.contentOffset.desktop, // 140px
          },
          pb: 0, // No bottom spacing - let sections control their own spacing
          ...(fullHeight && {
            minHeight: '100vh',
          }),
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(0.5px)',
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <PublicFooter />
      </Box>
    </Box>
  );
};
