// frontend/client-portal/src/components/layout/PublicLayout.tsx

import React from 'react';
import { Box } from '@mui/material';
import { PublicHeader } from './old_PublicHeader';
import { PublicFooter } from './old_PublicFooter';

interface PublicLayoutProps {
  children: React.ReactNode;
  fullHeight?: boolean; // For pages like home that need full viewport height
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ 
  children, 
  fullHeight = false 
}) => {
  const headerHeight = 80; // Header height

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw' }}>
      {/* Header */}
      <PublicHeader />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100vw',
          ...(fullHeight && {
            minHeight: '100vh',
          }),
          ...(!fullHeight && {
            paddingTop: `${headerHeight}px`,
          }),
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <PublicFooter />
    </Box>
  );
};