// components/layout/ClientHeader.tsx

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  Notifications,
  AccountCircle,
  Settings,
  ExitToApp,
  Dashboard,
  Event,
  Receipt,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';

export const ClientHeader: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    handleClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    handleClose();
  };

  const navigationItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
    { label: 'My Events', path: '/events', icon: <Event /> },
    { label: 'Bookings', path: '/bookings', icon: <Receipt /> },
  ];

  return (
    <AnimatedElement animation="fadeIn" delay={0}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.paper, 0.95)}, 
            ${alpha(theme.palette.background.paper, 0.9)})`,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          {/* Logo */}
          <Typography
            variant="h6"
            component="div"
            onClick={() => navigate('/dashboard')}
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              cursor: 'pointer',
              color: 'primary.main',
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              '&:hover': {
                opacity: 0.8,
              },
              transition: 'opacity 0.2s',
            }}
          >
            LifePlace Alfonso
          </Typography>

          {/* Desktop Navigation */}
          <Box sx={{ 
            display: { xs: 'none', md: 'flex' }, 
            gap: 1, 
            mr: 3,
            alignItems: 'center',
          }}>
            {navigationItems.map((item) => (
              <Button
                key={item.label}
                onClick={() => handleNavigation(item.path)}
                startIcon={item.icon}
                sx={{
                  color: location.pathname === item.path ? 'primary.main' : 'text.primary',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                  ...(location.pathname === item.path && {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  }),
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Notifications */}
          <IconButton
            size="large"
            aria-label="notifications"
            color="inherit"
            onClick={handleNotifications}
            sx={{ 
              mr: 1,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* User Menu */}
          <GlassCard 
            variant="light" 
            intensity="subtle"
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              px: 2,
              py: 0.5,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-1px)',
              },
            }}
            onClick={handleMenu}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                }}
              >
                {user?.first_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {user?.first_name || user?.email}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Client Portal
                </Typography>
              </Box>
            </Box>
          </GlassCard>

          {/* User Menu Dropdown */}
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              sx: {
                background: `linear-gradient(135deg, 
                  ${alpha(theme.palette.background.paper, 0.95)}, 
                  ${alpha(theme.palette.background.paper, 0.9)})`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                minWidth: 200,
                mt: 1,
              },
            }}
          >
            <MenuItem onClick={() => handleNavigation('/profile')}>
              <AccountCircle sx={{ mr: 2 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={() => handleNavigation('/settings')}>
              <Settings sx={{ mr: 2 }} />
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 2 }} />
              Sign Out
            </MenuItem>
          </Menu>

          {/* Notifications Menu */}
          <Menu
            anchorEl={notificationAnchor}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationClose}
            PaperProps={{
              sx: {
                background: `linear-gradient(135deg, 
                  ${alpha(theme.palette.background.paper, 0.95)}, 
                  ${alpha(theme.palette.background.paper, 0.9)})`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                maxWidth: 320,
                mt: 1,
              },
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Notifications
              </Typography>
            </Box>
            <MenuItem>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Booking Confirmed
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Your wedding event booking has been confirmed for March 15th
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Payment Reminder
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Final payment is due in 7 days
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Event Update
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Your event coordinator has shared new details
                </Typography>
              </Box>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
    </AnimatedElement>
  );
};