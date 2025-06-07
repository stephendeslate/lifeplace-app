// frontend/admin-crm/src/components/layout/Sidebar.tsx

import React, { useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material';
import { 
  ExpandLess, 
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useAuth } from '../../contexts/AuthContext';
import { filterNavigationByRole } from '../../config/navigation';
import type { NavigationGroup, NavigationItem } from '../../types/layout.types';

export const Sidebar: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const {
    sidebarOpen,
    sidebarCollapsed,
    setSidebarOpen,
    activeItem,
    setActiveItem,
    drawerWidth,
    collapsedDrawerWidth,
    headerHeight,
  } = useLayout();

  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['main']);

  // Filter navigation based on user role
  const navigationGroups = user?.role 
    ? filterNavigationByRole(user.role) 
    : [];

  // Set active item based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    for (const group of navigationGroups) {
      const matchingItem = group.items.find(item => {
        if (item.path === currentPath) return true;
        // Also match if current path starts with item path (for nested routes)
        if (currentPath.startsWith(item.path) && item.path !== '/') return true;
        return false;
      });
      
      if (matchingItem) {
        setActiveItem(matchingItem.id);
        // Expand the group containing the active item
        if (!expandedGroups.includes(group.id)) {
          setExpandedGroups(prev => [...prev, group.id]);
        }
        break;
      }
    }
  }, [location.pathname, navigationGroups, setActiveItem, expandedGroups]);

  const handleItemClick = (item: NavigationItem) => {
    if (item.disabled) return;
    
    setActiveItem(item.id);
    navigate(item.path);
    
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = activeItem === item.id;
    const IconComponent = item.icon;

    const itemContent = (
      <ListItemButton
        selected={isActive}
        onClick={() => handleItemClick(item)}
        disabled={item.disabled}
        sx={{
          minHeight: 48,
          px: sidebarCollapsed ? 1.5 : 2,
          py: 1,
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '& .MuiListItemIcon-root': {
              color: 'inherit',
            },
          },
          '&.Mui-disabled': {
            opacity: 0.5,
          },
          '&:hover:not(.Mui-selected):not(.Mui-disabled)': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: sidebarCollapsed ? 0 : 40,
            mr: sidebarCollapsed ? 0 : 1,
            justifyContent: 'center',
            color: isActive ? 'inherit' : 'text.secondary',
          }}
        >
          <IconComponent fontSize="small" />
        </ListItemIcon>
        
        {!sidebarCollapsed && (
          <>
            <ListItemText
              primary={item.label}
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                },
              }}
            />
            {item.badge && (
              <Chip
                label={item.badge}
                size="small"
                color="primary"
                sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
              />
            )}
          </>
        )}
      </ListItemButton>
    );

    // Wrap with tooltip when collapsed
    if (sidebarCollapsed) {
      return (
        <Tooltip
          key={item.id}
          title={item.label}
          placement="right"
          arrow
        >
          <ListItem disablePadding>
            {itemContent}
          </ListItem>
        </Tooltip>
      );
    }

    return (
      <ListItem key={item.id} disablePadding>
        {itemContent}
      </ListItem>
    );
  };

  const renderNavigationGroup = (group: NavigationGroup) => {
    const isExpanded = expandedGroups.includes(group.id);
    const hasItems = group.items.length > 0;

    if (sidebarCollapsed) {
      // In collapsed mode, show items without group headers
      return (
        <React.Fragment key={group.id}>
          {group.items.map(renderNavigationItem)}
          {hasItems && <Divider sx={{ my: 1, mx: 2 }} />}
        </React.Fragment>
      );
    }

    return (
      <Box key={group.id} sx={{ mb: 1 }}>
        {/* Group Header */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => toggleGroupExpansion(group.id)}
            sx={{
              minHeight: 40,
              px: 2,
              py: 1,
              '&:hover': {
                bgcolor: 'transparent',
              },
            }}
          >
            <ListItemText
              primary={group.label}
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                },
              }}
            />
            {hasItems && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>

        {/* Group Items */}
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List disablePadding>
            {group.items.map(renderNavigationItem)}
          </List>
        </Collapse>
      </Box>
    );
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
      }}
    >
      {/* Navigation Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          pt: 2,
          pb: 2,
        }}
      >
        <List disablePadding>
          {navigationGroups.map(renderNavigationGroup)}
        </List>
      </Box>

      {/* Footer */}
      {!sidebarCollapsed && (
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            LifePlace Admin v1.0
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Mobile drawer (temporary)
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            top: headerHeight,
            height: `calc(100vh - ${headerHeight}px)`,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop drawer (persistent)
  return (
    <Drawer
      variant="persistent"
      open={sidebarOpen}
      sx={{
        width: sidebarCollapsed ? collapsedDrawerWidth : drawerWidth,
        '& .MuiDrawer-paper': {
          width: sidebarCollapsed ? collapsedDrawerWidth : drawerWidth,
          top: headerHeight,
          height: `calc(100vh - ${headerHeight}px)`,
          borderRight: `1px solid ${theme.palette.divider}`,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflowX: 'hidden',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};