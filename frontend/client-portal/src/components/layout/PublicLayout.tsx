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
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <PublicHeader 
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToRegister={onNavigateToRegister}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          ...(fullHeight && {
            minHeight: '100vh',
          }),
          position: 'relative',
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <PublicFooter />
    </Box>
  );
};