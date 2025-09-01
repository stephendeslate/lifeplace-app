// frontend/client-portal/src/components/layout/ClientHeader.tsx

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  ExitToApp,
  Home,
  Person,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';

export const ClientHeader: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  
  const { user, logout } = useAuth();
  const { showInfo } = useToastActions();
  
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    showInfo('Logged Out', 'You have been successfully logged out.');
    navigate('/');
  };

  const handleGoHome = () => {
    handleUserMenuClose();
    navigate('/');
  };

  const handleProfile = () => {
    handleUserMenuClose();
    navigate('/profile');
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Left Section: Brand */}
        <Box
          display="flex"
          alignItems="center"
          sx={{ 
            cursor: 'pointer',
            mr: 4,
          }}
          onClick={() => navigate('/dashboard')}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              letterSpacing: '-0.02em',
            }}
          >
            LifePlace
          </Typography>
          <Typography
            variant="body2"
            sx={{
              ml: 1,
              opacity: 0.7,
              fontWeight: 500,
            }}
          >
            Client Portal
          </Typography>
        </Box>

        {/* Center: Page Title */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Welcome back, {user?.first_name || user?.email}!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your bookings and events
          </Typography>
        </Box>

        {/* Right Section: User Menu */}
        <Box display="flex" alignItems="center">
          <IconButton
            onClick={handleUserMenuOpen}
            sx={{
              p: 0.5,
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.875rem',
                fontWeight: 'bold',
              }}
            >
              {getInitials(user?.first_name, user?.last_name, user?.email)}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            onClick={handleUserMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1,
                },
              },
            }}
          >
            {/* User Info */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {user?.first_name || user?.last_name 
                  ? `${user?.first_name} ${user?.last_name}`.trim()
                  : user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            
            <Divider />

            {/* Back to Website */}
            <MenuItem onClick={handleGoHome}>
              <ListItemIcon>
                <Home fontSize="small" />
              </ListItemIcon>
              <ListItemText>Back to Website</ListItemText>
            </MenuItem>

            {/* Profile */}
            <MenuItem onClick={handleProfile}>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              <ListItemText>My Profile</ListItemText>
            </MenuItem>

            <Divider />

            {/* Logout */}
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <ExitToApp fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};