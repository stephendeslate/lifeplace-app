// Modern Header Component with Glassmorphism and Navigation
// Complete modern header with navigation menu and mobile dropdown

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
  useMediaQuery,
  useTheme,
  Avatar,
  Tooltip,
  Badge,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  ExitToApp,
  DarkMode,
  LightMode,
  Brightness4,
  Dashboard,
  Analytics,
  Assignment,
  Event,
  People,
  Payment,
  Settings,
  Close,
  CalendarMonth,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToastActions } from '../../../contexts/ToastContext';
import { useTheme as useAppTheme } from '../../../contexts/ThemeContext';
import { NotificationBadge } from '../../notifications/NotificationBadge';
import { tokens } from '../../../design-system';
import { createGlassEffect, glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

// Navigation items configuration
const navigationItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Dashboard },
  { label: 'Analytics', path: '/analytics', icon: Analytics },
  { label: 'Tasks', path: '/tasks', icon: Assignment },
  { label: 'Events', path: '/events', icon: Event },
  { label: 'Calendar', path: '/calendar', icon: CalendarMonth },
  { label: 'Clients', path: '/clients', icon: People },
  { label: 'Payments', path: '/payments', icon: Payment },
  { label: 'Settings', path: '/settings', icon: Settings },
];

// Modern header with enhanced glass morphism effects
export const ModernHeader: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  // Safe context access with fallbacks
  const layoutContext = useLayout();
  const authContext = useAuth();
  const toastContext = useToastActions();
  const appTheme = useAppTheme();
  
  const { 
    headerHeight = 64
  } = layoutContext || {};
  const { user, logout } = authContext || {};
  const { showInfo } = toastContext || {};
  
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Enhanced glass effect styles for header - theme aware
  const headerGlassStyle = (() => {
    const isDark = appTheme.effectiveMode === 'dark';
    
    try {
      const baseStyle = createGlassEffect({
        opacity: isDark ? 0.9 : 0.85,
        blur: 20,
        saturation: 1.1,
        borderOpacity: isDark ? 0.15 : 0.2,
        shadowIntensity: isDark ? 'medium' : 'light'
      });
      
      return {
        ...baseStyle,
        borderBottom: isDark 
          ? `1px solid ${tokens.color.neutral[800]}` 
          : '1px solid rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        background: isDark 
          ? 'rgba(10, 10, 10, 0.9)' 
          : 'rgba(255, 255, 255, 0.85)',
        boxShadow: isDark 
          ? '0 2px 8px 0 rgba(0, 0, 0, 0.3)' 
          : '0 2px 8px 0 rgba(0, 0, 0, 0.04)',
      };
    } catch {
      // Fallback styling if glass effect fails
      return {
        borderBottom: isDark 
          ? `1px solid ${tokens.color.neutral[800]}` 
          : '1px solid rgba(0, 0, 0, 0.12)',
        backdropFilter: 'blur(20px) saturate(1.1)',
        background: isDark 
          ? 'rgba(26, 26, 26, 0.95)' 
          : 'rgba(255, 255, 255, 0.95)',
      };
    }
  })();

  // User menu handlers
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    if (logout) {
      logout();
    }
    if (showInfo) {
      showInfo('Logged Out', 'You have been successfully logged out.');
    }
  };

  const handleSettingsClick = () => {
    handleUserMenuClose();
    navigate('/settings');
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

  const handleThemeToggle = () => {
    appTheme.toggleMode();
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          ...headerGlassStyle,
          zIndex: 1300,
          height: headerHeight,
          transition: createTransition(['background', 'backdrop-filter', 'box-shadow'], 'fast'),
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.02) 0%, rgba(16, 185, 129, 0.02) 100%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Toolbar 
          sx={{ 
            px: { xs: 2, sm: 3, lg: 4 },
            height: headerHeight,
            minHeight: `${headerHeight}px !important`,
          }}
        >
          {/* Left Section: Brand + Navigation (Desktop) / Mobile Menu (Mobile) */}
          <Box display="flex" alignItems="center" flex={1} minWidth={0} gap={2}>
            {/* Mobile Menu Toggle */}
            {isMobile && (
              <Tooltip title="Menu">
                <IconButton
                  edge="start"
                  onClick={toggleMobileMenu}
                  sx={{ 
                    ...glassPresets.light,
                    borderRadius: tokens.spacing.radius.xl,
                    width: 44,
                    height: 44,
                    transition: createTransition(['all'], 'fast'),
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      ...glassPresets.medium,
                      transform: 'translateY(-2px) scale(1.05)',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                      background: 'rgba(255, 255, 255, 0.8)',
                    },
                    '&:active': {
                      transform: 'scale(0.95)',
                    }
                  }}
                >
                  {mobileMenuOpen ? <Close /> : <MenuIcon />}
                </IconButton>
              </Tooltip>
            )}

            {/* Enhanced Brand with Gradient */}
            <Box
              display="flex"
              alignItems="center"
              sx={{ 
                cursor: 'pointer',
                transition: createTransition('all', 'fast'),
                '&:hover': {
                  transform: 'scale(1.03) translateY(-1px)',
                }
              }}
              onClick={() => navigate('/dashboard')}
            >
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  whiteSpace: 'nowrap',
                  fontSize: { xs: '1.1rem', md: '1.35rem' },
                  letterSpacing: '-0.02em',
                  textShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              >
                LifePlace Admin
              </Typography>
            </Box>

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 1, ml: 4 }}>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.path);
                  
                  return (
                    <Button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      startIcon={<Icon sx={{ fontSize: 18 }} />}
                      sx={{
                        color: isActive ? tokens.color.primary[700] : tokens.color.neutral[700],
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.875rem',
                        px: 2,
                        py: 1,
                        borderRadius: tokens.spacing.radius.lg,
                        position: 'relative',
                        transition: createTransition(['all'], 'fast'),
                        background: isActive 
                          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)'
                          : 'transparent',
                        '&:hover': {
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)'
                            : 'rgba(0, 0, 0, 0.04)',
                          transform: 'translateY(-1px)',
                        },
                        '&::after': isActive ? {
                          content: '""',
                          position: 'absolute',
                          bottom: -8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 24,
                          height: 3,
                          borderRadius: tokens.spacing.radius.full,
                          background: tokens.color.primary[600],
                        } : {},
                      }}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </Box>
            )}

          </Box>

          {/* Right Section: Enhanced Actions + Notifications + User */}
          <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.5 }}>
            {/* Enhanced Notifications */}
            <Box sx={{ position: 'relative' }}>
              <NotificationBadge />
            </Box>

            {/* Enhanced User Profile Menu */}
            <Tooltip title="User Menu">
              <IconButton
                onClick={handleUserMenuOpen}
                sx={{
                  p: 0,
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: tokens.color.success[500],
                        border: '2px solid white',
                      }}
                    />
                  }
                >
                  <Avatar
                    sx={{
                      bgcolor: 'transparent',
                      color: 'white',
                      width: 42,
                      height: 42,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: `2px solid rgba(255, 255, 255, 0.9)`,
                      transition: createTransition(['all'], 'fast'),
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      '&:hover': {
                        transform: 'translateY(-2px) scale(1.05)',
                        boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
                      },
                    }}
                  >
                    {getInitials(user?.first_name, user?.last_name, user?.email)}
                  </Avatar>
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Enhanced User Menu - Simplified for stability */}
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
              onClick={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  minWidth: 240,
                  borderRadius: tokens.spacing.radius.xl,
                  boxShadow: appTheme.effectiveMode === 'dark' 
                    ? '0 8px 32px rgba(0, 0, 0, 0.5)' 
                    : '0 8px 32px rgba(0, 0, 0, 0.12)',
                  border: appTheme.effectiveMode === 'dark'
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(255, 255, 255, 0.8)',
                  background: appTheme.effectiveMode === 'dark'
                    ? 'rgba(26, 26, 26, 0.95)'
                    : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  overflow: 'hidden',
                },
              }}
            >
              {/* User Info Header */}
              <Box 
                sx={{ 
                  px: 2.5, 
                  py: 2.5,
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%)',
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar
                    sx={{
                      width: 52,
                      height: 52,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontWeight: 600,
                      fontSize: '1rem',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    {getInitials(user?.first_name, user?.last_name, user?.email)}
                  </Avatar>
                  <Box flex={1}>
                    <Typography 
                      variant="subtitle2" 
                      fontWeight="bold" 
                      sx={{ 
                        color: appTheme.effectiveMode === 'dark' 
                          ? tokens.color.neutral[50] 
                          : tokens.color.neutral[900],
                        fontSize: '0.95rem',
                      }}
                    >
                      {user?.first_name || user?.last_name 
                        ? `${user?.first_name} ${user?.last_name}`.trim()
                        : user?.email}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: appTheme.effectiveMode === 'dark' 
                          ? tokens.color.neutral[300] 
                          : tokens.color.neutral[600],
                        fontSize: '0.8rem',
                      }}
                    >
                      {user?.email}
                    </Typography>
                    {user?.role && (
                      <Chip
                        label={user.role}
                        size="small"
                        sx={{
                          mt: 0.5,
                          height: 20,
                          fontSize: '0.7rem',
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                          color: tokens.color.primary[700],
                          border: 'none',
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
              
              <Divider sx={{ opacity: 0.1 }} />

              {/* Menu Items with Enhanced Hover */}
              <Box sx={{ py: 1 }}>
                <MenuItem 
                  onClick={handleSettingsClick}
                  sx={{
                    mx: 1,
                    borderRadius: tokens.spacing.radius.lg,
                    transition: createTransition(['all'], 'fast'),
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)',
                      transform: 'translateX(4px)',
                    }
                  }}
                >
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" sx={{ color: tokens.color.primary[600] }} />
                  </ListItemIcon>
                  <ListItemText>Account Settings</ListItemText>
                </MenuItem>

                {/* Enhanced Theme Toggle */}
                <MenuItem 
                  onClick={handleThemeToggle}
                  sx={{
                    mx: 1,
                    borderRadius: tokens.spacing.radius.lg,
                    transition: createTransition(['all'], 'fast'),
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)',
                      transform: 'translateX(4px)',
                    }
                  }}
                >
                  <ListItemIcon>
                    {appTheme.mode === 'light' && (
                      <DarkMode fontSize="small" sx={{ color: tokens.color.neutral[600] }} />
                    )}
                    {appTheme.mode === 'dark' && (
                      <LightMode fontSize="small" sx={{ color: tokens.color.warning[500] }} />
                    )}
                    {appTheme.mode === 'system' && (
                      <Brightness4 fontSize="small" sx={{ color: tokens.color.info[500] }} />
                    )}
                  </ListItemIcon>
                  <ListItemText>
                    {appTheme.mode === 'light' && "Switch to Dark"}
                    {appTheme.mode === 'dark' && "Follow System"}
                    {appTheme.mode === 'system' && "Switch to Light"}
                  </ListItemText>
                  <Box sx={{ ml: 1, opacity: 0.6, fontSize: '0.75rem' }}>
                    {appTheme.effectiveMode === 'dark' ? '🌙' : '☀️'}
                  </Box>
                </MenuItem>

                <Divider sx={{ opacity: 0.1, my: 1 }} />

                {/* Logout with Enhanced Hover */}
                <MenuItem 
                  onClick={handleLogout}
                  sx={{
                    mx: 1,
                    borderRadius: tokens.spacing.radius.lg,
                    transition: createTransition(['all'], 'fast'),
                    '&:hover': {
                      background: `linear-gradient(135deg, ${tokens.color.error[500]}15 0%, ${tokens.color.error[500]}08 100%)`,
                      color: tokens.color.error[600],
                      transform: 'translateX(4px)',
                      '& .MuiListItemIcon-root': {
                        color: tokens.color.error[600],
                      }
                    }
                  }}
                >
                  <ListItemIcon>
                    <ExitToApp fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Dropdown */}
      {isMobile && (
        <Collapse in={mobileMenuOpen} timeout="auto" unmountOnExit>
          <Box
            sx={{
              position: 'fixed',
              top: headerHeight,
              left: 0,
              right: 0,
              zIndex: 1299,
              ...headerGlassStyle,
              background: appTheme.effectiveMode === 'dark'
                ? 'rgba(26, 26, 26, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(30px)',
              boxShadow: appTheme.effectiveMode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                : '0 8px 32px rgba(0, 0, 0, 0.12)',
              borderTop: 'none',
              maxHeight: `calc(100vh - ${headerHeight}px)`,
              overflowY: 'auto',
            }}
          >
            <List sx={{ py: 2 }}>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                
                return (
                  <ListItem key={item.path} disablePadding sx={{ px: 2, py: 0.5 }}>
                    <ListItemButton
                      onClick={() => handleNavigate(item.path)}
                      sx={{
                        borderRadius: tokens.spacing.radius.lg,
                        py: 1.5,
                        transition: createTransition(['all'], 'fast'),
                        background: isActive 
                          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)'
                          : 'transparent',
                        '&:hover': {
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)'
                            : 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Icon sx={{ 
                          color: isActive 
                            ? tokens.color.primary[600] 
                            : (appTheme.effectiveMode === 'dark' 
                                ? tokens.color.neutral[400] 
                                : tokens.color.neutral[600]),
                          fontSize: 22,
                        }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.label}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 600 : 500,
                          color: isActive 
                            ? tokens.color.primary[700] 
                            : (appTheme.effectiveMode === 'dark' 
                                ? tokens.color.neutral[200] 
                                : tokens.color.neutral[800]),
                          fontSize: '0.95rem',
                        }}
                      />
                      {isActive && (
                        <Box
                          sx={{
                            width: 4,
                            height: 24,
                            borderRadius: tokens.spacing.radius.full,
                            background: tokens.color.primary[600],
                            ml: 'auto',
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
              
            </List>
          </Box>
        </Collapse>
      )}
    </>
  );
};