// components/layout/ClientSidebar.tsx

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Event as EventIcon,
  CalendarMonth as BookingIcon,
  Payment as PaymentIcon,
  Folder as DocumentsIcon,
  AssignmentTurnedIn as ActionCenterIcon,
  Person as ProfileIcon,
  HelpOutline as HelpIcon,
  Home as HomeIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { GlassCard } from '../../design-system/components/GlassCard';
import { useActionCount } from '../../hooks/useActionCenter';
import { useUnreadRecordsCount } from '../../hooks/useCommunications';

interface ClientSidebarProps {
  open: boolean;
  onClose: () => void;
  width: number;
  variant: 'temporary' | 'persistent';
}

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
  },
  {
    id: 'events',
    label: 'My Events',
    path: '/events',
    icon: <EventIcon />,
    // TODO: Replace with API-driven count
  },
  {
    id: 'records',
    label: 'Records',
    path: '/records',
    icon: <HistoryIcon />,
  },
  {
    id: 'actions',
    label: 'Action Center',
    path: '/actions',
    icon: <ActionCenterIcon />,
  },
  {
    id: 'payments',
    label: 'Payments & Invoices',
    path: '/payments',
    icon: <PaymentIcon />,
    // TODO: Replace with API-driven outstanding payments count
  },
  {
    id: 'documents',
    label: 'Documents',
    path: '/documents',
    icon: <DocumentsIcon />,
  },
];

const secondaryItems: NavigationItem[] = [
  {
    id: 'profile',
    label: 'My Profile',
    path: '/profile',
    icon: <ProfileIcon />,
  },
  {
    id: 'help',
    label: 'Help & Support',
    path: '/help',
    icon: <HelpIcon />,
  },
  {
    id: 'home',
    label: 'Back to Home',
    path: '/',
    icon: <HomeIcon />,
  },
];

export const ClientSidebar: React.FC<ClientSidebarProps> = ({
  open,
  onClose,
  width,
  variant,
}) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { count: actionCount } = useActionCount();
  const { count: unreadRecordsCount } = useUnreadRecordsCount();

  // Enhanced navigation items with dynamic badges
  const getEnhancedNavigationItems = (): NavigationItem[] => {
    return navigationItems.map(item => {
      if (item.id === 'actions') {
        return {
          ...item,
          badge: actionCount > 0 ? actionCount : undefined,
        };
      }
      if (item.id === 'records') {
        return {
          ...item,
          badge: unreadRecordsCount > 0 ? unreadRecordsCount : undefined,
        };
      }
      return item;
    });
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const renderNavigationItem = (item: NavigationItem, index: number) => (
    <AnimatedElement 
      key={item.id}
      animation="slideRight" 
      delay={100 + (index * 50)}
    >
      <ListItem disablePadding sx={{ mb: 0.5 }}>
        <ListItemButton
          onClick={() => handleNavigation(item.path)}
          disabled={item.disabled}
          sx={{
            borderRadius: 2,
            mx: 1,
            mb: 0.5,
            transition: 'all 0.2s ease',
            backgroundColor: isActive(item.path) 
              ? alpha(theme.palette.primary.main, 0.15)
              : 'transparent',
            color: isActive(item.path)
              ? theme.palette.primary.main
              : alpha(theme.palette.text.primary, 0.8),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
              transform: 'translateX(4px)',
            },
            '&.Mui-disabled': {
              color: alpha(theme.palette.text.disabled, 0.5),
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: 'inherit',
              minWidth: 40,
            }}
          >
            {item.badge ? (
              <Badge badgeContent={item.badge} color="error">
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>
          <ListItemText 
            primary={item.label}
            primaryTypographyProps={{
              fontWeight: isActive(item.path) ? 600 : 500,
              fontSize: '0.875rem',
            }}
          />
        </ListItemButton>
      </ListItem>
    </AnimatedElement>
  );

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        backgroundColor: alpha('#fff', 0.05),
        backdropFilter: 'blur(20px)',
        border: `1px solid ${alpha('#fff', 0.1)}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Book New Event */}
      <AnimatedElement animation="fadeIn" delay={50}>
        <Box sx={{ p: 2, pt: 3 }}>
          <GlassCard
            variant="light"
            intensity="subtle"
            onClick={() => handleNavigation('/booking')}
            sx={{
              p: 2,
              textAlign: 'center',
              border: `1px solid ${alpha('#fff', 0.15)}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <BookingIcon sx={{ color: theme.palette.primary.main }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.primary.main,
                  fontSize: '1rem',
                }}
              >
                Book New Event
              </Typography>
            </Box>
          </GlassCard>
        </Box>
      </AnimatedElement>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {getEnhancedNavigationItems().map((item, index) => renderNavigationItem(item, index))}
        </List>

        <Divider 
          sx={{ 
            mx: 2, 
            my: 2,
            borderColor: alpha('#fff', 0.1),
          }} 
        />

        {/* Secondary Navigation */}
        <List>
          {secondaryItems.map((item, index) => 
            renderNavigationItem(item, navigationItems.length + index)
          )}
        </List>
      </Box>

      {/* Footer */}
      <AnimatedElement animation="fadeIn" delay={800}>
        <Box sx={{ p: 2 }}>
          <Typography
            variant="caption"
            sx={{
              color: alpha(theme.palette.text.secondary, 0.6),
              display: 'block',
              textAlign: 'center',
            }}
          >
            Client Portal
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: alpha(theme.palette.text.secondary, 0.4),
              display: 'block',
              textAlign: 'center',
              fontSize: '0.75rem',
            }}
          >
            v2.0.0
          </Typography>
        </Box>
      </AnimatedElement>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          backgroundColor: 'transparent',
          borderRight: 'none',
          mt: variant === 'persistent' ? { xs: '72px', md: '96px' } : 0,
          height: variant === 'persistent' ? { xs: 'calc(100vh - 72px)', md: 'calc(100vh - 96px)' } : '100vh',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      {drawerContent}
    </Drawer>
  );
};