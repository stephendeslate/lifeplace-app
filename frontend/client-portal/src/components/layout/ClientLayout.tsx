// frontend/client-portal/src/components/layout/ClientLayout.tsx

import React from 'react';
import { Box } from '@mui/material';
import { ClientHeader } from './ClientHeader';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const headerHeight = 80;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw' }}>
      {/* Header */}
      <ClientHeader />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          marginTop: `${headerHeight}px`,
          minHeight: `calc(100vh - ${headerHeight}px)`,
          backgroundColor: 'grey.50',
          width: '100vw',
        }}
      >
        <Box
          sx={{
            height: '100%',
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};