// frontend/admin-crm/src/components/settings/SettingsNavigation.tsx

import React from 'react';
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
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { settingsNavigationConfig } from '../../config/settings-navigation';
import type { SettingsNavigationGroup, SettingsNavigationItem } from '../../types/settings.types';

interface SettingsNavigationProps {
  onItemClick?: () => void;
}

export const SettingsNavigation: React.FC<SettingsNavigationProps> = ({ onItemClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const handleItemClick = (item: SettingsNavigationItem) => {
    navigate(item.path);
    onItemClick?.(); // Close mobile drawer if needed
  };

  const isItemActive = (item: SettingsNavigationItem) => {
    return location.pathname === item.path;
  };

  const renderNavigationItem = (item: SettingsNavigationItem) => {
    const IconComponent = item.icon;
    const isActive = isItemActive(item);

    return (
      <ListItem key={item.id} disablePadding>
        <ListItemButton
          selected={isActive}
          onClick={() => handleItemClick(item)}
          sx={{
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
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 40,
              color: isActive ? 'inherit' : 'text.secondary',
            }}
          >
            <IconComponent fontSize="small" />
          </ListItemIcon>
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
              },
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const renderNavigationGroup = (group: SettingsNavigationGroup) => {
    return (
      <Box key={group.id} sx={{ mb: 2 }}>
        <Typography
          variant="overline"
          sx={{
            px: 2,
            py: 1,
            display: 'block',
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        >
          {group.label}
        </Typography>
        <List disablePadding>
          {group.items.map(renderNavigationItem)}
        </List>
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
        borderLeft: 1,
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Typography variant="h6" fontWeight="bold">
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your LifePlace configuration
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', pt: 2, pb: 6 }}>
        {settingsNavigationConfig.map((group, index) => (
          <React.Fragment key={group.id}>
            {renderNavigationGroup(group)}
            {index < settingsNavigationConfig.length - 1 && (
              <Divider sx={{ mx: 2, my: 1 }} />
            )}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};