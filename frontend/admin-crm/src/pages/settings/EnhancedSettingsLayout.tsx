import React, { useState } from 'react';
import {
  Box,
  Drawer,
  useTheme,
  useMediaQuery,
  Fab,
  Container,
} from '@mui/material';
import { 
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { EnhancedSettingsNavigation } from '../../components/settings/EnhancedSettingsNavigation';
import { EnhancedSettingsProvider } from '../../contexts/EnhancedSettingsContext';

interface EnhancedSettingsLayoutProps {
  children: React.ReactNode;
}

export const EnhancedSettingsLayout: React.FC<EnhancedSettingsLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(prev => !prev);
  };

  const handleMobileItemClick = () => {
    setMobileDrawerOpen(false);
  };

  const handleToggleCollapse = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const navigationContent = (
    <EnhancedSettingsNavigation 
      onItemClick={isMobile ? handleMobileItemClick : undefined}
      collapsed={!isMobile && sidebarCollapsed}
      onToggleCollapse={!isMobile ? handleToggleCollapse : undefined}
    />
  );

  return (
    <EnhancedSettingsProvider>
      <Box 
        sx={{ 
          display: 'flex', 
          minHeight: '100%',
          bgcolor: 'grey.50',
          position: 'relative',
        }}
      >
        {/* Mobile Floating Action Button */}
        {isMobile && (
          <Fab
            onClick={handleDrawerToggle}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: theme.zIndex.fab,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              color: 'white',
              boxShadow: theme.shadows[8],
              '&:hover': {
                boxShadow: theme.shadows[12],
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <SettingsIcon />
          </Fab>
        )}

        {/* Navigation Sidebar */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileDrawerOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              '& .MuiDrawer-paper': {
                width: 320,
                boxSizing: 'border-box',
                borderRadius: '0 16px 16px 0',
              },
            }}
          >
            {navigationContent}
          </Drawer>
        ) : (
          <Box
            sx={{
              width: sidebarCollapsed ? 80 : 320,
              flexShrink: 0,
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Box
              sx={{
                width: sidebarCollapsed ? 80 : 320,
                height: 'calc(100vh - 64px)', // Account for header height
                position: 'fixed',
                left: 0,
                top: 64, // Start below the header (header height is typically 64px)
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: theme.zIndex.drawer - 1, // Lower z-index than header
                borderRight: '1px solid',
                borderColor: 'divider',
              }}
            >
              {navigationContent}
            </Box>
          </Box>
        )}

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Container
            maxWidth={false}
            sx={{
              flex: 1,
              px: { xs: 2, sm: 3, md: 4 }, // 8px grid system
              py: { xs: 3, sm: 4, md: 5 },  // 8px grid system  
              maxWidth: 'min(1200px, 100%)', // Responsive max-width that adapts to available space
              ml: 0, // Left-align to avoid gap after sidebar
              mr: 'auto',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              '@keyframes fadeInUp': {
                from: { 
                  opacity: 0, 
                  transform: 'translateY(20px)' 
                },
                to: { 
                  opacity: 1, 
                  transform: 'translateY(0)' 
                },
              },
            }}
          >
            {children}
          </Container>
        </Box>
      </Box>
    </EnhancedSettingsProvider>
  );
};