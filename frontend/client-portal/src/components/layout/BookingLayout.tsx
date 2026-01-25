// components/layout/BookingLayout.tsx

import React from 'react';
import { Box, useTheme, alpha } from '@mui/material';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface BookingLayoutProps {
  children: React.ReactNode;
}

export const BookingLayout: React.FC<BookingLayoutProps> = ({
  children,
}) => {
  const theme = useTheme();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        width: '100%',
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
        <PublicHeader />
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          pt: { xs: '96px', md: '120px' }, // Tighter than PublicLayout - just clears the fixed header
          pb: { xs: '40px', md: '60px' }, // Add reasonable bottom spacing
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