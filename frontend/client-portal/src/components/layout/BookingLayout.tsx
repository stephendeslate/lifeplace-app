// components/layout/BookingLayout.tsx

import React from 'react';
import { Box, useTheme, alpha } from '@mui/material';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface BookingLayoutProps {
  children: React.ReactNode;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

export const BookingLayout: React.FC<BookingLayoutProps> = ({ 
  children, 
  onNavigateToLogin,
  onNavigateToRegister,
}) => {
  const theme = useTheme();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh', 
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
        // Original lighter background like PublicLayout had before
        background: `
          linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.98)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)
        `,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 10% 20%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 50%),
            radial-gradient(circle at 90% 80%, ${alpha(theme.palette.secondary.main, 0.02)} 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      {/* Header */}
      <Box sx={{ position: 'relative', zIndex: 2 }}>
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
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          pt: { xs: '120px', md: '140px' }, // Account for fixed header height + generous breathing room
          pb: { xs: '60px', md: '80px' }, // Add generous bottom spacing
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