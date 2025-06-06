// frontend/admin-crm/src/components/layout/Header.tsx

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
  Chip,
  Breadcrumbs,
  Link,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings,
  ExitToApp,
  AdminPanelSettings,
  ChevronRight,
  Home,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToastActions } from '../../contexts/ToastContext';

export const Header: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const { 
    toggleSidebar, 
    toggleSidebarCollapse, 
    breadcrumbs  } = useLayout();
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
  };

  const handleSettingsClick = () => {
    handleUserMenuClose();
    navigate('/settings');
  };

  const handleBreadcrumbClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
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
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Left Section: Menu Toggle + Brand + Breadcrumbs */}
        <Box display="flex" alignItems="center" flex={1} minWidth={0}>
          {/* Menu Toggle */}
          <IconButton
            edge="start"
            onClick={isMobile ? toggleSidebar : toggleSidebarCollapse}
            sx={{ 
              mr: 2,
              color: 'text.primary',
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Brand */}
          <Box
            display="flex"
            alignItems="center"
            sx={{ 
              cursor: 'pointer',
              mr: { xs: 2, md: 4 },
              minWidth: 0,
            }}
            onClick={() => navigate('/dashboard')}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 'bold',
                color: 'primary.main',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              LifePlace Admin
            </Typography>
          </Box>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && !isMobile && (
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Breadcrumbs
                separator={<ChevronRight fontSize="small" />}
                sx={{
                  '& .MuiBreadcrumbs-ol': {
                    flexWrap: 'nowrap',
                  },
                }}
              >
                <Link
                  color="inherit"
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleBreadcrumbClick('/dashboard');
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <Home sx={{ mr: 0.5, fontSize: 16 }} />
                  Dashboard
                </Link>
                {breadcrumbs.map((breadcrumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  
                  if (isLast || !breadcrumb.path) {
                    return (
                      <Typography
                        key={index}
                        color="text.primary"
                        sx={{
                          fontWeight: isLast ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 200,
                        }}
                      >
                        {breadcrumb.label}
                      </Typography>
                    );
                  }

                  return (
                    <Link
                      key={index}
                      color="inherit"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleBreadcrumbClick(breadcrumb.path);
                      }}
                      sx={{
                        textDecoration: 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 200,
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {breadcrumb.label}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            </Box>
          )}
        </Box>

        {/* Right Section: User Menu */}
        <Box display="flex" alignItems="center" gap={1}>
          {/* User Role Chip */}
          {user?.role && !isMobile && (
            <Chip
              icon={<AdminPanelSettings />}
              label={user.role}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mr: 1 }}
            />
          )}

          {/* User Menu */}
          <IconButton
            onClick={handleUserMenuOpen}
            sx={{
              p: 0,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              width: 40,
              height: 40,
              fontSize: '0.875rem',
              fontWeight: 'bold',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            {getInitials(user?.first_name, user?.last_name, user?.email)}
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

            {/* Settings */}
            <MenuItem onClick={handleSettingsClick}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
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