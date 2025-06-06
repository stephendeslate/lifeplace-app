// frontend/admin-crm/src/components/layout/AppLayout.tsx

import React from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useLayout } from '../../contexts/LayoutContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const {
    sidebarOpen,
    sidebarCollapsed,
    setSidebarOpen,
    drawerWidth,
    collapsedDrawerWidth,
    headerHeight,
  } = useLayout();

  // Calculate main content margin based on sidebar state
  const getMainContentMarginLeft = () => {
    if (isMobile) {
      return 0; // No margin on mobile (sidebar is overlay)
    }
    
    if (!sidebarOpen) {
      return 0; // Sidebar is closed
    }
    
    return sidebarCollapsed ? collapsedDrawerWidth : drawerWidth;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Header */}
      <Header />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginTop: `${headerHeight}px`,
          marginLeft: `${getMainContentMarginLeft()}px`,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          minHeight: `calc(100vh - ${headerHeight}px)`,
          backgroundColor: 'grey.50',
          position: 'relative',
        }}
      >
        {/* Content Container */}
        <Box
          sx={{
            height: '100%',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: headerHeight,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: theme.zIndex.drawer - 1,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </Box>
  );
}