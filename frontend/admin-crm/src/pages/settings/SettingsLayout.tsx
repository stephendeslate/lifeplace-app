// frontend/admin-crm/src/pages/settings/SettingsLayout.tsx

import React, { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { SettingsNavigation } from '../../components/settings/SettingsNavigation';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const drawerWidth = 320;

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(prev => !prev);
  };

  const handleMobileItemClick = () => {
    setMobileDrawerOpen(false);
  };

  const navigationContent = (
    <SettingsNavigation onItemClick={isMobile ? handleMobileItemClick : undefined} />
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100%' }}>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: theme.zIndex.fab,
          }}
        >
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 2,
              '&:hover': {
                bgcolor: 'background.paper',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      )}

      {/* Navigation Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {navigationContent}
        </Drawer>
      ) : (
        <Box
          sx={{
            width: drawerWidth,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: drawerWidth,
              height: '100%',
              position: 'fixed',
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
          p: { xs: 2, sm: 3, md: 4 },
          pl: isMobile ? { xs: 2, sm: 3, md: 4 } : 0, // Remove left padding on desktop
          mt: isMobile ? 7 : 0, // Account for mobile menu button
          minHeight: '100%',
          backgroundColor: 'grey.50',
        }}
      >
        {children}
      </Box>

      {/* Mobile Overlay */}
      {isMobile && mobileDrawerOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: theme.zIndex.drawer - 1,
          }}
          onClick={handleDrawerToggle}
        />
      )}
    </Box>
  );
};