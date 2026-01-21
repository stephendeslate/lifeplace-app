// components/layout/PublicLayout.tsx

import React from 'react';
import { Box } from '@mui/material';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

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
        background: 'linear-gradient(135deg, #2d5016 0%, #5a7c47 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradient 15s ease infinite',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          backgroundPosition: '0% 50%',
        },
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255,255,255,0.05) 0%, transparent 50%)
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
          pt: { xs: '120px', md: '140px' }, // Account for fixed header height + generous breathing room
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
