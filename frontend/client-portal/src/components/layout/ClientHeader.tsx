// components/layout/ClientHeader.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import { Menu as MenuIcon, ExitToApp, Person } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { NotificationCenter } from '../notifications';
import { GlobalSearch } from '../search';

interface ClientHeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [logoError, setLogoError] = useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleProfileMenuClose();
    navigate('/profile');
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await logout();
    navigate('/login');
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: alpha(theme.palette.primary.main, 0.95),
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${alpha('#fff', 0.2)}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
        {/* Menu Button */}
        <AnimatedElement animation="fadeIn" delay={100}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{
              mr: 2,
              color: '#ffffff',
              backgroundColor: alpha('#fff', 0.15),
              '&:hover': {
                backgroundColor: alpha('#fff', 0.25),
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <MenuIcon />
          </IconButton>
        </AnimatedElement>

        {/* Logo/Brand */}
        <AnimatedElement animation="slideRight" delay={200}>
          {!logoError ? (
            <Box
              component="img"
              src="/logo.png"
              alt="LifePlace Alfonso"
              onError={() => setLogoError(true)}
              sx={{
                height: { xs: 68, md: 88 },
                width: 'auto',
                objectFit: 'contain',
                maxWidth: { xs: '220px', md: '300px' },
                cursor: 'pointer',
              }}
              onClick={() => navigate('/dashboard')}
            />
          ) : (
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 600,
                color: theme.palette.primary.main,
                textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/dashboard')}
            >
              LifePlace
              <Typography
                component="span"
                variant="body2"
                sx={{
                  ml: 1,
                  color: alpha(theme.palette.primary.main, 0.7),
                  fontWeight: 400,
                }}
              >
                Client Portal
              </Typography>
            </Typography>
          )}
        </AnimatedElement>

        {/* Action Icons - Right Aligned */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          {/* Global Search */}
          <AnimatedElement animation="fadeIn" delay={250}>
            <GlobalSearch />
          </AnimatedElement>

          {/* Notifications */}
          <AnimatedElement animation="fadeIn" delay={300}>
            <NotificationCenter />
          </AnimatedElement>

          {/* Profile Menu */}
          <AnimatedElement animation="fadeIn" delay={400}>
            <Tooltip title="Account">
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{
                  ml: 1,
                  backgroundColor: alpha('#fff', 0.15),
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.25),
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    backgroundColor: '#ffffff',
                    color: theme.palette.primary.main,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {getInitials(user?.first_name, user?.last_name)}
                </Avatar>
              </IconButton>
            </Tooltip>
          </AnimatedElement>
        </Box>

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          onClick={handleProfileMenuClose}
          PaperProps={{
            sx: {
              backgroundColor: alpha('#fff', 0.95),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha('#fff', 0.2)}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              borderRadius: 2,
              mt: 1.5,
              minWidth: 200,
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* User Info */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>

          <Divider />

          {/* Profile */}
          <MenuItem onClick={handleProfileClick}>
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
      </Toolbar>
    </AppBar>
  );
};
