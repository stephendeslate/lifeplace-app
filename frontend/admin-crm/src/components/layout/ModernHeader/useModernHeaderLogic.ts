import { useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayout } from '@/contexts/LayoutContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToastActions } from '@/contexts/ToastContext';
import { useTheme as useAppTheme } from '@/contexts/ThemeContext';
import { useWalkthrough } from '@/contexts/walkthrough';
import { tokens } from '@/design-system';
import { navigationItems } from './navigationConfig';

export function useModernHeaderLogic() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isAboveLg = useMediaQuery(theme.breakpoints.up('lg'));
  const isAboveXl = useMediaQuery(theme.breakpoints.up('xl'));
  const navigate = useNavigate();
  const location = useLocation();

  const layoutContext = useLayout();
  const authContext = useAuth();
  const toastContext = useToastActions();
  const appTheme = useAppTheme();
  const { startTour } = useWalkthrough();

  const { headerHeight = 64 } = layoutContext || {};
  const { user, logout } = authContext || {};
  const { showInfo } = toastContext || {};

  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);

  const isDark = appTheme.effectiveMode === 'dark';

  const headerStyle = {
    borderBottom: isDark
      ? `1px solid ${tokens.color.neutral[800]}`
      : `1px solid ${tokens.color.neutral[200]}`,
    background: isDark ? tokens.color.neutral[900] : 'white',
  };

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

  const handleStartTour = () => {
    handleUserMenuClose();
    startTour('welcome');
  };

  const visibleNavCount = isAboveXl ? navigationItems.length : isAboveLg ? 7 : 5;
  const visibleItems = navigationItems.slice(0, visibleNavCount);
  const overflowItems = navigationItems.slice(visibleNavCount);
  const hasActiveOverflow = overflowItems.some((item) => isActiveRoute(item.path));

  return {
    isMobile,
    isAboveLg,
    isAboveXl,
    navigate,
    headerHeight,
    headerStyle,
    isDark,
    user,
    appTheme,
    userMenuAnchor,
    mobileMenuOpen,
    moreMenuAnchor,
    setMoreMenuAnchor,
    handleUserMenuOpen,
    handleUserMenuClose,
    handleLogout,
    handleSettingsClick,
    handleThemeToggle,
    toggleMobileMenu,
    handleNavigate,
    isActiveRoute,
    getInitials,
    handleStartTour,
    visibleItems,
    overflowItems,
    hasActiveOverflow,
  };
}
