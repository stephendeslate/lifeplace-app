// Modern Smart Sidebar Component
// Completely redesigned with modern glassmorphism design system
// Maintains full functionality while enhancing visual consistency

import React, { useEffect, useState, useMemo } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Tooltip,
  useTheme,
  useMediaQuery,
  Collapse,
  Avatar,
  IconButton,
  Badge,
  Zoom,
  Fade,
} from '@mui/material';
import { 
  ExpandLess, 
  ExpandMore,
  AutoAwesome,
  Settings,
  Circle,
  Lightbulb,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAuth } from '../../../contexts/AuthContext';
import { filterNavigationByRole } from '../../../config/navigation';
import { tokens } from '../../../design-system';
import { 
  glassPresets, 
  createGlassNavigation,
  createGlassCard 
} from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';
import type { NavigationGroup, NavigationItem } from '../../../types/layout.types';

export const SmartSidebar: React.FC = () => {
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
    drawerWidth = 280,
    collapsedDrawerWidth = 64,
    headerHeight = 64,
  } = useLayout();

  const [expandedGroups, setExpandedGroups] = useState<string[]>(['main']);
  const [, setRecentActions] = useState<NavigationItem[]>([]);

  // Filter navigation based on user role (memoized to prevent useEffect dependency issues)
  const navigationGroups = useMemo(() => {
    return user?.role ? filterNavigationByRole(user.role) : [];
  }, [user?.role]);

  // Modern glass effect for sidebar - enhanced consistency
  const sidebarGlassStyle = {
    ...createGlassNavigation('sidebar'),
    background: 'rgba(248, 251, 255, 0.98)', // Slightly cooler tone
    backdropFilter: 'blur(40px) saturate(1.2)', // More intense blur
    borderRight: sidebarCollapsed ? 'none' : `1px solid ${tokens.color.borders.glass}`, // Remove border when collapsed
    position: 'relative' as const,
    overflow: 'hidden',
    
    // Subtle gradient overlay for depth
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(180deg, rgba(0, 135, 255, 0.015) 0%, rgba(16, 185, 129, 0.015) 50%, rgba(168, 85, 247, 0.01) 100%)',
      pointerEvents: 'none',
      zIndex: -1,
    },
  };

  // Set active item based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    for (const group of navigationGroups) {
      const matchingItem = group.items.find(item => {
        if (item.path === currentPath) return true;
        if (currentPath.startsWith(item.path) && item.path !== '/') return true;
        return false;
      });
      
      if (matchingItem) {
        setActiveItem(matchingItem.id);
        if (!expandedGroups.includes(group.id)) {
          setExpandedGroups(prev => [...prev, group.id]);
        }
        // Add to recent actions
        setRecentActions(prev => {
          const filtered = prev.filter(item => item.id !== matchingItem.id);
          return [matchingItem, ...filtered].slice(0, 3);
        });
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

  // Smart suggestions based on user behavior
  const getSmartSuggestions = (): NavigationItem[] => {
    const currentHour = new Date().getHours();
    const suggestions: NavigationItem[] = [];

    // Morning suggestions (6-12)
    if (currentHour >= 6 && currentHour < 12) {
      const dashboardItem = navigationGroups
        .flatMap(g => g.items)
        .find(item => item.id === 'dashboard');
      if (dashboardItem) suggestions.push(dashboardItem);
    }

    // Afternoon suggestions (12-18)
    if (currentHour >= 12 && currentHour < 18) {
      const analyticsItem = navigationGroups
        .flatMap(g => g.items)
        .find(item => item.id === 'analytics');
      if (analyticsItem) suggestions.push(analyticsItem);
    }

    return suggestions.slice(0, 2);
  };

  const renderNavigationItem = (item: NavigationItem, isChild = false, level = 0) => {
    const isActive = activeItem === item.id;
    const IconComponent = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isChildExpanded = hasChildren && expandedGroups.includes(item.id);

    const handleClick = () => {
      if (hasChildren && !sidebarCollapsed) {
        toggleGroupExpansion(item.id);
      } else {
        handleItemClick(item);
      }
    };

    const itemContent = (
      <ListItemButton
        selected={isActive}
        onClick={handleClick}
        disabled={item.disabled}
        sx={{
          minHeight: sidebarCollapsed ? 56 : 52, // More consistent height
          px: sidebarCollapsed ? 1.5 : (isChild ? 3.5 : 2.5),
          py: 1.25,
          borderRadius: tokens.spacing.radius.xxl, // More rounded
          mx: sidebarCollapsed ? 0.5 : 1,
          mb: 0.75,
          ml: isChild ? (sidebarCollapsed ? 0.5 : 2.5 + (level * 1.5)) : (sidebarCollapsed ? 0.5 : 1),
          transition: createTransition(['background', 'transform', 'box-shadow', 'border'], 'fast'),
          position: 'relative',
          overflow: 'visible', // Allow for glow effects
          border: '1px solid transparent',

          // Inactive state with refined hover
          '&:not(.Mui-selected)': {
            background: 'transparent',
            color: tokens.color.neutral[700],
            
            '&:hover': {
              ...glassPresets.medium,
              transform: sidebarCollapsed ? 'scale(1.05)' : 'translateX(6px)',
              border: `1px solid ${tokens.color.borders.glass}`,
              boxShadow: tokens.shadow.glass.light,
              
              '&::before': {
                opacity: 1,
                transform: 'scaleX(1)',
              },
              
              '&::after': {
                opacity: 0.6,
              }
            },
          },

          // Enhanced active state with modern styling
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${tokens.color.primary[500]}40`,
            color: tokens.color.primary[700],
            boxShadow: `0 8px 32px ${tokens.color.primary[500]}20, inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
            transform: sidebarCollapsed ? 'scale(1.1)' : 'translateX(8px)',
            fontWeight: 600,
            
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(0, 135, 255, 0.16) 0%, rgba(16, 185, 129, 0.12) 100%)',
              transform: sidebarCollapsed ? 'scale(1.12)' : 'translateX(8px) scale(1.02)',
              boxShadow: `0 12px 40px ${tokens.color.primary[500]}25, inset 0 1px 0 rgba(255, 255, 255, 0.4)`,
            },
            
            '& .MuiListItemIcon-root': {
              color: tokens.color.primary[600],
            },
            
            '&::after': {
              opacity: 1,
            }
          },

          // Disabled state
          '&.Mui-disabled': {
            opacity: 0.4,
            filter: 'grayscale(100%)',
          },

          // Left accent line for hover
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '50%',
            left: 0,
            width: 3,
            height: 0,
            background: `linear-gradient(180deg, ${tokens.color.primary[500]} 0%, ${tokens.color.success[500]} 100%)`,
            borderRadius: '0 2px 2px 0',
            opacity: 0,
            transform: 'translateY(-50%) scaleX(0)',
            transformOrigin: 'left center',
            transition: createTransition(['opacity', 'height', 'transform'], 'fast'),
            zIndex: 1,
          },

          // Glow effect for active items
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(ellipse at center, ${tokens.color.primary[500]}08 0%, transparent 70%)`,
            opacity: 0,
            transition: createTransition('opacity', 'fast'),
            pointerEvents: 'none',
            borderRadius: 'inherit',
          },

          '&:hover::before': {
            height: '70%',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: sidebarCollapsed ? 0 : 44,
            mr: sidebarCollapsed ? 0 : 1.5,
            justifyContent: 'center',
            color: 'inherit',
            transition: createTransition(['color', 'transform'], 'fast'),
            position: 'relative',
            zIndex: 2,
            
            '& .MuiSvgIcon-root': {
              fontSize: sidebarCollapsed ? '1.25rem' : '1.125rem',
              transition: createTransition(['font-size', 'transform'], 'fast'),
            },
          }}
        >
          <IconComponent />
        </ListItemIcon>
        
        {!sidebarCollapsed && (
          <>
            <ListItemText
              primary={item.label}
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: createTransition(['font-weight', 'color'], 'fast'),
                  color: 'inherit',
                  letterSpacing: '0.025em',
                },
                zIndex: 2,
                position: 'relative',
              }}
            />
            
            {item.badge && (
              <Zoom in timeout={200}>
                <Badge
                  badgeContent={item.badge}
                  sx={{
                    '& .MuiBadge-badge': {
                      ...glassPresets.medium,
                      background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.success[500]} 100%)`,
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      height: 18,
                      minWidth: 18,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      boxShadow: tokens.shadow.glass.primary,
                    }
                  }}
                >
                  <Circle sx={{ color: 'transparent', fontSize: 8 }} />
                </Badge>
              </Zoom>
            )}
            
            {hasChildren && (
              <IconButton
                size="small"
                sx={{ 
                  ml: 1,
                  color: 'inherit',
                  opacity: 0.8,
                  width: 28,
                  height: 28,
                  borderRadius: tokens.spacing.radius.lg,
                  transition: createTransition(['opacity', 'background', 'transform'], 'fast'),
                  
                  '&:hover': {
                    opacity: 1,
                    background: 'rgba(255, 255, 255, 0.15)',
                    transform: 'scale(1.1)',
                  }
                }}
              >
                {isChildExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </>
        )}
      </ListItemButton>
    );

    // Enhanced tooltip for collapsed state
    if (sidebarCollapsed) {
      return (
        <Tooltip
          key={item.id}
          title={
            <Box sx={{ p: 1 }}>
              <Typography 
                variant="subtitle2" 
                fontWeight="bold" 
                sx={{ 
                  color: tokens.color.neutral[800],
                  mb: item.badge ? 0.5 : 0 
                }}
              >
                {item.label}
              </Typography>
              {item.badge && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Circle sx={{ fontSize: 6, color: tokens.color.primary[500] }} />
                  <Typography variant="caption" sx={{ color: tokens.color.neutral[600] }}>
                    {item.badge} updates
                  </Typography>
                </Box>
              )}
              {item.disabled && (
                <Typography variant="caption" sx={{ 
                  color: tokens.color.neutral[500],
                  fontStyle: 'italic',
                  mt: 0.5,
                  display: 'block'
                }}>
                  Currently unavailable
                </Typography>
              )}
            </Box>
          }
          placement="right"
          arrow
          enterDelay={300}
          enterNextDelay={100}
          PopperProps={{
            sx: {
              zIndex: theme.zIndex.tooltip + 10, // Ensure tooltip is above header
              '& .MuiTooltip-tooltip': {
                ...glassPresets.strong,
                borderRadius: tokens.spacing.radius.xl,
                border: `1px solid ${tokens.color.borders.glass}`,
                boxShadow: tokens.shadow.component.tooltip,
                backdropFilter: 'blur(25px)',
                maxWidth: 200,
              },
              '& .MuiTooltip-arrow': {
                color: 'rgba(248, 250, 252, 0.95)',
              },
            },
          }}
        >
          <ListItem disablePadding>
            {itemContent}
          </ListItem>
        </Tooltip>
      );
    }

    const itemElement = (
      <ListItem key={item.id} disablePadding>
        {itemContent}
      </ListItem>
    );

    // If item has children and is not collapsed, show them
    if (hasChildren && !sidebarCollapsed) {
      return (
        <React.Fragment key={item.id}>
          {itemElement}
          <Collapse in={isChildExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {item.children!.map(child => renderNavigationItem(child, true, level + 1))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return itemElement;
  };

  const renderNavigationGroup = (group: NavigationGroup) => {
    const isExpanded = expandedGroups.includes(group.id);
    const hasItems = group.items.length > 0;

    if (sidebarCollapsed) {
      // In collapsed mode, show items without group headers but with subtle dividers
      return (
        <React.Fragment key={group.id}>
          {group.items.map((item) => renderNavigationItem(item))}
          {hasItems && (
            <Box sx={{ 
              mx: 1.5, 
              my: 1.5, 
              height: 1, 
              background: `linear-gradient(90deg, transparent 0%, ${tokens.color.borders.glass} 50%, transparent 100%)`,
              opacity: 0.4 
            }} />
          )}
        </React.Fragment>
      );
    }

    return (
      <Box key={group.id} sx={{ mb: 3 }}>
        {/* Enhanced Group Header */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => toggleGroupExpansion(group.id)}
            sx={{
              minHeight: 44,
              px: 2.5,
              py: 1.25,
              borderRadius: tokens.spacing.radius.xl,
              mx: 1,
              mb: 1,
              transition: createTransition(['background', 'transform'], 'fast'),
              position: 'relative',
              overflow: 'hidden',
              
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(135deg, ${tokens.color.neutral[500]}02 0%, ${tokens.color.primary[500]}02 100%)`,
                opacity: 0,
                transition: createTransition('opacity', 'fast'),
              },
              
              '&:hover': {
                background: 'rgba(0, 0, 0, 0.015)',
                transform: 'translateX(2px)',
                
                '&::before': {
                  opacity: 1,
                },
              },
            }}
          >
            <ListItemText
              primary={group.label}
              sx={{
                '& .MuiListItemText-primary': {
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: tokens.color.neutral[500],
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  position: 'relative',
                  zIndex: 1,
                },
              }}
            />
            {hasItems && (
              <IconButton
                size="small"
                sx={{ 
                  color: tokens.color.neutral[400],
                  width: 24,
                  height: 24,
                  borderRadius: tokens.spacing.radius.md,
                  transition: createTransition(['color', 'background', 'transform'], 'fast'),
                  position: 'relative',
                  zIndex: 1,
                  
                  '&:hover': {
                    color: tokens.color.primary[600],
                    background: tokens.color.glass.primaryGlass,
                    transform: 'scale(1.1)',
                  }
                }}
              >
                {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            )}
          </ListItemButton>
        </ListItem>

        {/* Enhanced Group Items with Animation */}
        <Collapse 
          in={isExpanded} 
          timeout={{ enter: 300, exit: 200 }}
          unmountOnExit
        >
          <Fade in={isExpanded} timeout={400}>
            <List disablePadding sx={{ pl: 0.5 }}>
              {group.items.map((item, itemIndex) => (
                <Box
                  key={item.id}
                  sx={{
                    animation: isExpanded ? `slideIn 300ms ease-out ${itemIndex * 50}ms both` : 'none',
                    '@keyframes slideIn': {
                      '0%': {
                        opacity: 0,
                        transform: 'translateX(-20px)',
                      },
                      '100%': {
                        opacity: 1,
                        transform: 'translateX(0)',
                      },
                    },
                  }}
                >
                  {renderNavigationItem(item)}
                </Box>
              ))}
            </List>
          </Fade>
        </Collapse>
      </Box>
    );
  };

  // Enhanced Smart suggestions section
  const renderSmartSuggestions = () => {
    const suggestions = getSmartSuggestions();
    if (suggestions.length === 0 || sidebarCollapsed) return null;

    return (
      <Box sx={{ px: 2, py: 1.5, mb: 2.5 }}>
        <Box 
          sx={{ 
            ...createGlassCard('light', 'medium', tokens.spacing.radius.xxl),
            p: 2.5,
            border: `1px solid ${tokens.color.primary[500]}30`,
            background: `linear-gradient(135deg, ${tokens.color.primary[500]}06 0%, ${tokens.color.success[500]}04 50%, ${tokens.color.secondary[500]}03 100%)`,
            position: 'relative',
            overflow: 'hidden',
            
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -1,
              left: -1,
              right: -1,
              bottom: -1,
              background: `linear-gradient(135deg, ${tokens.color.primary[500]}20 0%, ${tokens.color.success[500]}15 100%)`,
              borderRadius: 'inherit',
              zIndex: -1,
            },
          }}
        >
          {/* Header with animation */}
          <Box display="flex" alignItems="center" gap={1.5} mb={2}>            
            <Box sx={{
              p: 1,
              borderRadius: tokens.spacing.radius.lg,
              background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.success[500]}10 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AutoAwesome sx={{ 
                fontSize: 18, 
                color: tokens.color.primary[600],
                animation: 'sparkle 2s ease-in-out infinite',
                '@keyframes sparkle': {
                  '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
                  '50%': { transform: 'scale(1.1) rotate(180deg)' },
                },
              }} />
            </Box>
            <Box>
              <Typography variant="caption" fontWeight="bold" sx={{ 
                color: tokens.color.primary[700],
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.7rem',
              }}>
                Smart Suggestions
              </Typography>
              <Typography variant="caption" sx={{ 
                color: tokens.color.neutral[600],
                display: 'block',
                fontSize: '0.65rem',
                fontStyle: 'italic',
              }}>
                Based on your activity
              </Typography>
            </Box>
          </Box>
          
          {/* Suggestions list */}
          {suggestions.map((item, index) => {
            const getTimeBasedIcon = () => {
              const hour = new Date().getHours();
              if (hour >= 6 && hour < 12) return TrendingUp;
              if (hour >= 12 && hour < 18) return Lightbulb;
              return Schedule;
            };
            
            const TimeIcon = getTimeBasedIcon();
            
            return (
              <Box
                key={item.id}
                onClick={() => handleItemClick(item)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: tokens.spacing.radius.xl,
                  cursor: 'pointer',
                  transition: createTransition(['background', 'transform'], 'fast'),
                  mb: index < suggestions.length - 1 ? 1 : 0,
                  border: '1px solid transparent',
                  
                  '&:hover': {
                    background: tokens.color.glass.primaryGlass,
                    transform: 'translateX(4px) scale(1.02)',
                    border: `1px solid ${tokens.color.primary[500]}20`,
                    boxShadow: `0 4px 20px ${tokens.color.primary[500]}15`,
                  }
                }}
              >
                <Box sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <item.icon sx={{ 
                    fontSize: 18, 
                    color: tokens.color.primary[600],
                    zIndex: 1,
                  }} />
                  <TimeIcon sx={{
                    fontSize: 10,
                    color: tokens.color.success[500],
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    background: 'white',
                    borderRadius: '50%',
                    p: 0.25,
                  }} />
                </Box>
                <Box flex={1}>
                  <Typography variant="caption" fontWeight="600" sx={{ 
                    color: tokens.color.primary[700],
                    display: 'block',
                    lineHeight: 1.3,
                  }}>
                    {item.label}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: tokens.color.neutral[500],
                    fontSize: '0.65rem',
                    fontStyle: 'italic',
                  }}>
                    Recommended now
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sidebarGlassStyle,
        position: 'relative',
        
        // Add top padding to account for header floating above
        paddingTop: isMobile ? 0 : `${headerHeight}px`,
        
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(0, 135, 255, 0.02) 0%, rgba(16, 185, 129, 0.02) 100%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Smart Suggestions */}
      {renderSmartSuggestions()}

      {/* Navigation Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          pt: sidebarCollapsed ? 2 : 0,
          pb: 2,
          // Hide internal scrollbar when collapsed to prevent visual artifacts
          '&::-webkit-scrollbar': {
            width: sidebarCollapsed ? '0px' : '6px',
            display: sidebarCollapsed ? 'none' : 'block',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: tokens.color.glass.medium,
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: tokens.color.glass.strong,
          },
        }}
      >
        <List disablePadding>
          {navigationGroups.map(renderNavigationGroup)}
        </List>
      </Box>

      {/* Modern Enhanced Footer */}
      <Fade in={!sidebarCollapsed} timeout={300}>
        <Box
          sx={{
            p: !sidebarCollapsed ? 2.5 : 0,
            borderTop: !sidebarCollapsed ? `1px solid ${tokens.color.borders.glass}` : 'none',
            ...glassPresets.strong,
            position: 'relative',
            overflow: 'hidden',
            
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent 0%, ${tokens.color.primary[500]}40 50%, transparent 100%)`,
            },
          }}
        >
          {!sidebarCollapsed && (
            <>
              {/* User Profile Section */}
              <Box 
                display="flex" 
                alignItems="center" 
                gap={2.5} 
                mb={2.5}
                sx={{
                  p: 1.5,
                  borderRadius: tokens.spacing.radius.xl,
                  background: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${tokens.color.borders.glass}`,
                  transition: createTransition(['background', 'transform'], 'fast'),
                  cursor: 'pointer',
                  
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.7)',
                    transform: 'translateY(-1px)',
                  }
                }}
                onClick={() => navigate('/settings/account')}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    background: tokens.color.backgrounds.primaryGradient,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    border: `2px solid ${tokens.color.borders.glass}`,
                    boxShadow: tokens.shadow.glass.primary,
                  }}
                >
                  {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    sx={{
                      display: 'block',
                      color: tokens.color.neutral[800],
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: '0.8rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {user?.first_name || user?.email?.split('@')[0] || 'User'}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: tokens.color.neutral[600],
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}>
                    <Circle sx={{ fontSize: 4 }} />
                    {user?.role || 'Admin'}
                  </Typography>
                </Box>
                <Tooltip title="Account Settings">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/settings');
                    }}
                    sx={{
                      ...glassPresets.light,
                      width: 32,
                      height: 32,
                      borderRadius: tokens.spacing.radius.lg,
                      transition: createTransition(['background', 'transform'], 'fast'),
                      
                      '&:hover': {
                        ...glassPresets.medium,
                        transform: 'scale(1.1)',
                      }
                    }}
                  >
                    <Settings sx={{ fontSize: 16, color: tokens.color.primary[600] }} />
                  </IconButton>
                </Tooltip>
              </Box>
              
              {/* Brand Footer */}
              <Box textAlign="center" sx={{ opacity: 0.8 }}>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: tokens.color.neutral[500],
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                    mb: 0.5,
                  }}
                >
                  LifePlace Admin
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: tokens.color.neutral[400],
                    fontSize: '0.65rem',
                    fontStyle: 'italic',
                  }}
                >
                  v1.0.0 • Modern Interface
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Fade>
    </Box>
  );

  // Mobile drawer (temporary) - still starts below header for mobile UX
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          zIndex: theme.zIndex.drawer + 2, // Above header on mobile for better UX
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            top: headerHeight, // Mobile keeps starting below header
            height: `calc(100vh - ${headerHeight}px)`,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop drawer (persistent) - FULL HEIGHT behind header
  return (
    <Drawer
      variant="persistent"
      open={sidebarOpen}
      sx={{
        width: sidebarCollapsed ? collapsedDrawerWidth : drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: sidebarCollapsed ? collapsedDrawerWidth : drawerWidth,
          top: 0, // FULL HEIGHT - header will float above with higher z-index
          height: '100vh', // FULL VIEWPORT HEIGHT
          transition: createTransition(['width', 'transform'], 'normal'),
          overflowX: 'hidden',
          overflowY: 'auto',
          zIndex: 1200, // Below header (1300) but above content (1100)
          border: 'none', // Remove default border
          boxShadow: 'none', // Remove default shadow
          
          // Enhanced scrollbar styling - hide when collapsed to prevent visual artifacts
          '&::-webkit-scrollbar': {
            width: sidebarCollapsed ? 0 : 6,
            display: sidebarCollapsed ? 'none' : 'block',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: tokens.color.glass.medium,
            borderRadius: 3,
            border: 'none',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: tokens.color.glass.strong,
          },
          
          // Smooth reveal animation
          transform: sidebarOpen ? 'translateX(0)' : `translateX(-${sidebarCollapsed ? collapsedDrawerWidth : drawerWidth}px)`,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};