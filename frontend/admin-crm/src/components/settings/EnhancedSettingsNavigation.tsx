import React, { useState } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  Collapse,
  Tooltip,
  Chip,
  alpha,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { settingsNavigationConfig } from '../../config/settings-navigation';
import { useEnhancedSettings } from '../../contexts/EnhancedSettingsContext';
import type { SettingsNavigationGroup, SettingsNavigationItem } from '../../types/settings.types';

interface EnhancedSettingsNavigationProps {
  onItemClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const EnhancedSettingsNavigation: React.FC<EnhancedSettingsNavigationProps> = ({ 
  onItemClick,
  collapsed = false,
  onToggleCollapse 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    favorites,
    addFavorite,
    removeFavorite,
  } = useEnhancedSettings();

  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => 
    settingsNavigationConfig.map(g => g.id)
  );

  const handleItemClick = (item: SettingsNavigationItem) => {
    navigate(item.path);
    onItemClick?.();
  };

  const isItemActive = (item: SettingsNavigationItem) => {
    return location.pathname === item.path;
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isFavorite = (itemId: string) => {
    return favorites.some(fav => fav.id === itemId);
  };

  const toggleFavorite = (item: SettingsNavigationItem, event: React.MouseEvent) => {
    event.stopPropagation();
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite({
        id: item.id,
        path: item.path,
        label: item.label,
        addedAt: new Date().toISOString(),
      });
    }
  };

  const filteredConfig = settingsNavigationConfig;

  const renderNavigationItem = (item: SettingsNavigationItem, showFavoriteButton = true) => {
    const IconComponent = item.icon;
    const isActive = isItemActive(item);
    const isFav = isFavorite(item.id);

    return (
      <ListItem 
        key={item.id} 
        disablePadding
        secondaryAction={
          !collapsed && showFavoriteButton && (
            <Zoom in={true}>
              <IconButton
                edge="end"
                size="small"
                onClick={(e) => toggleFavorite(item, e)}
                sx={{
                  opacity: isFav ? 1 : 0,
                  '&:hover': { opacity: 1 },
                  color: isFav ? 'warning.main' : 'action.disabled',
                  transition: 'all 0.2s',
                }}
              >
                {isFav ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              </IconButton>
            </Zoom>
          )
        }
        sx={{
          '&:hover .MuiIconButton-root': {
            opacity: 1,
          },
        }}
      >
        <ListItemButton
          selected={isActive}
          onClick={() => handleItemClick(item)}
          sx={{
            borderRadius: 1,
            mx: 1,
            mb: 0.5,
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateX(4px)',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
            },
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: theme.shadows[2],
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'translateX(4px)',
              },
              '& .MuiListItemIcon-root': {
                color: 'inherit',
              },
            },
          }}
        >
          <Tooltip title={collapsed ? item.label : ''} placement="right">
            <ListItemIcon
              sx={{
                minWidth: collapsed ? 24 : 40,
                color: isActive ? 'inherit' : 'text.secondary',
                transition: 'all 0.2s',
              }}
            >
              <IconComponent fontSize="small" />
            </ListItemIcon>
          </Tooltip>
          {!collapsed && (
            <Fade in={!collapsed}>
              <ListItemText
                primary={item.label}
                secondary={!isMobile ? item.description : undefined}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 400,
                  },
                  '& .MuiListItemText-secondary': {
                    fontSize: '0.75rem',
                    lineHeight: 1.2,
                    mt: 0.5,
                    color: isActive ? 'inherit' : 'text.secondary',
                    opacity: isActive ? 0.9 : 1,
                  },
                }}
              />
            </Fade>
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const renderNavigationGroup = (group: SettingsNavigationGroup) => {
    const isExpanded = expandedGroups.includes(group.id);
    const hasActiveItem = group.items.some(item => isItemActive(item));

    return (
      <Box key={group.id} sx={{ mb: 2 }}>
        <ListItemButton
          onClick={() => toggleGroup(group.id)}
          sx={{
            px: collapsed ? 1 : 2,
            py: 1,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          {collapsed ? (
            <Tooltip title={group.label} placement="right">
              <Box
                sx={{
                  width: 4,
                  height: 24,
                  bgcolor: hasActiveItem ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  mx: 'auto',
                }}
              />
            </Tooltip>
          ) : (
            <>
              <Typography
                variant="overline"
                sx={{
                  flex: 1,
                  color: 'text.secondary',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                {group.label}
              </Typography>
              {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </>
          )}
        </ListItemButton>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List disablePadding>
            {group.items.map(item => renderNavigationItem(item))}
          </List>
        </Collapse>
      </Box>
    );
  };

  const renderQuickAccess = () => {
    if (collapsed) return null;

    return (
      <Box sx={{ px: 2, pb: 2 }}>
        {/* Favorites Section */}
        {favorites.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                fontWeight: 600,
                mb: 1,
              }}
            >
              <StarIcon fontSize="small" sx={{ color: 'warning.main' }} />
              Favorites
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {favorites.slice(0, 3).map(fav => {
                const item = settingsNavigationConfig
                  .flatMap(g => g.items)
                  .find(i => i.id === fav.id);
                return item ? (
                  <Chip
                    key={fav.id}
                    label={item.label}
                    size="small"
                    onClick={() => handleItemClick(item)}
                    sx={{
                      justifyContent: 'flex-start',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                      },
                    }}
                  />
                ) : null;
              })}
            </Box>
          </Box>
        )}

      </Box>
    );
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        transition: 'width 0.3s ease',
        width: collapsed ? 64 : 320,
        position: 'relative',
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          p: collapsed ? 1 : 2, 
          borderBottom: 1, 
          borderColor: 'divider', 
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {collapsed ? (
          <IconButton size="small" onClick={onToggleCollapse}>
            <ChevronRightIcon />
          </IconButton>
        ) : (
          <>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                System Configuration
              </Typography>
            </Box>
            {!isMobile && (
              <IconButton size="small" onClick={onToggleCollapse}>
                <ChevronLeftIcon />
              </IconButton>
            )}
          </>
        )}
      </Box>


      {/* Quick Access */}
      {renderQuickAccess()}

      {/* Navigation Items */}
      <Box sx={{ flex: 1, overflow: 'auto', pt: 2, pb: 6 }}>
        {filteredConfig.map((group, index) => (
          <React.Fragment key={group.id}>
            {renderNavigationGroup(group)}
            {index < filteredConfig.length - 1 && !collapsed && (
              <Divider sx={{ mx: 2, my: 1 }} />
            )}
          </React.Fragment>
        ))}
        
      </Box>

      {/* Quick Stats (when not collapsed) */}
      {!collapsed && (
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Chip
              icon={<DashboardIcon fontSize="small" />}
              label={`${settingsNavigationConfig.length} Categories`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<TrendingIcon fontSize="small" />}
              label={`${settingsNavigationConfig.reduce((acc, g) => acc + g.items.length, 0)} Settings`}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};