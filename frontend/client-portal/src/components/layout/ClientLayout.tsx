// components/layout/ClientLayout.tsx

import React, { useState } from 'react';
import { Box, useTheme, alpha, useMediaQuery } from '@mui/material';
import { ClientHeader } from './ClientHeader';
import { ClientSidebar } from './ClientSidebar';
import { GradientBackground } from '../../design-system/components/GradientBackground';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const sidebarWidth = 280;

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <GradientBackground
      gradient="mist"
      animated={false}
      overlay={true}
      sx={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
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
            radial-gradient(circle at 15% 15%, ${alpha(theme.palette.primary.main, 0.04)} 0%, transparent 35%),
            radial-gradient(circle at 85% 85%, ${alpha(theme.palette.secondary.main, 0.03)} 0%, transparent 35%),
            radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.light, 0.02)} 0%, transparent 40%)
          `,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Header */}
      <ClientHeader onMenuClick={handleSidebarToggle} sidebarOpen={sidebarOpen} />

      {/* Sidebar */}
      <ClientSidebar
        open={sidebarOpen}
        onClose={handleSidebarToggle}
        width={sidebarWidth}
        variant={isMobile ? 'temporary' : 'persistent'}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: { xs: 'calc(100vh - 72px)', md: 'calc(100vh - 96px)' },
          marginTop: { xs: '72px', md: '96px' },
          marginLeft: !isMobile && sidebarOpen ? `${sidebarWidth}px` : 0,
          transition: theme.transitions.create(['margin-left'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Content Container with glass morphism */}
        <Box
          sx={{
            backgroundColor: alpha('#fff', 0.02),
            backdropFilter: 'blur(1px)',
            borderRadius: { xs: 0, sm: 3 },
            mx: { xs: 0, sm: 2, md: 3 },
            my: { xs: 0, sm: 2, md: 3 },
            minHeight: 'calc(100vh - 96px)',
            border: `1px solid ${alpha('#fff', 0.05)}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
            p: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: theme.zIndex.drawer - 1,
          }}
          onClick={handleSidebarToggle}
        />
      )}
    </GradientBackground>
  );
};
