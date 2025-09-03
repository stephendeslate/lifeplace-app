// components/layout/ClientLayout.tsx

import React from 'react';
import { Box, Container, useTheme, alpha } from '@mui/material';
import { ClientHeader } from './ClientHeader';
import { GradientBackground } from '../../design-system/components/GradientBackground';

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
    <GradientBackground 
      gradient="mist" 
      animated={false}
      overlay={true}
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* Glass overlay for enhanced depth */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, ${alpha(theme.palette.secondary.main, 0.05)} 0%, transparent 40%),
            radial-gradient(circle at 40% 60%, ${alpha(theme.palette.primary.light, 0.03)} 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Header */}
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        <ClientHeader onMenuClick={() => {}} sidebarOpen={false} />
      </Box>

      {/* Main Content with glass morphism container */}
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: { xs: 9, sm: 10 }, // Account for fixed header
          pb: 4,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Box
          sx={{
            backgroundColor: alpha('#fff', 0.02),
            backdropFilter: 'blur(1px)',
            borderRadius: { xs: 0, sm: 3 },
            mx: { xs: 0, sm: 2, md: 3 },
            minHeight: 'calc(100vh - 120px)',
            border: `1px solid ${alpha('#fff', 0.05)}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
          }}
        >
          {fullWidth ? (
            <Box sx={{ 
              width: '100%', 
              px: disableGutters ? 0 : { xs: 2, sm: 3, md: 4 },
              py: { xs: 2, sm: 3 },
            }}>
              {children}
            </Box>
          ) : (
            <Container 
              maxWidth={maxWidth} 
              disableGutters={disableGutters}
              sx={{
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 2, sm: 3 },
              }}
            >
              {children}
            </Container>
          )}
        </Box>
      </Box>
    </GradientBackground>
  );
};