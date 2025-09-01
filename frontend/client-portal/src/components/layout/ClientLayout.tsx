// components/layout/ClientLayout.tsx

import React from 'react';
import { Box, Container, useTheme, alpha } from '@mui/material';
import { ClientHeader } from './ClientHeader';

interface ClientLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  fullWidth?: boolean;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ 
  children, 
  maxWidth = 'lg',
  disableGutters = false,
  fullWidth = false,
}) => {
  const theme = useTheme();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        backgroundImage: `
          radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.light, 0.1)} 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.light, 0.1)} 0%, transparent 50%)
        `,
      }}
    >
      {/* Header */}
      <ClientHeader />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: { xs: 9, sm: 10 }, // Account for fixed header
          pb: 4,
          position: 'relative',
        }}
      >
        {fullWidth ? (
          <Box sx={{ width: '100%', px: disableGutters ? 0 : { xs: 2, sm: 3, md: 4 } }}>
            {children}
          </Box>
        ) : (
          <Container 
            maxWidth={maxWidth} 
            disableGutters={disableGutters}
            sx={{
              px: { xs: 2, sm: 3, md: 4 },
            }}
          >
            {children}
          </Container>
        )}
      </Box>
    </Box>
  );
};