import React from 'react';
import {
  Box,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { tokens } from '@/design-system';
import { createTransition } from '@/design-system/utils/animations';
import { navigationItems } from './navigationConfig';

interface MobileNavigationProps {
  open: boolean;
  headerHeight: number;
  isDark: boolean;
  onNavigate: (path: string) => void;
  isActiveRoute: (path: string) => boolean;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  open,
  headerHeight,
  isDark,
  onNavigate,
  isActiveRoute,
}) => {
  return (
    <Collapse in={open} timeout="auto" unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: headerHeight,
          left: 0,
          right: 0,
          zIndex: 1299,
          background: isDark ? tokens.color.neutral[900] : 'white',
          borderBottom: isDark
            ? `1px solid ${tokens.color.neutral[800]}`
            : `1px solid ${tokens.color.neutral[200]}`,
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
                  onClick={() => onNavigate(item.path)}
                  sx={{
                    borderRadius: tokens.spacing.radius.md,
                    py: 1.5,
                    transition: createTransition(['background'], 'fast'),
                    background: isActive ? tokens.color.primary[50] : 'transparent',
                    '&:hover': {
                      background: isActive ? tokens.color.primary[100] : tokens.color.neutral[100],
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon
                      sx={{
                        color: isActive
                          ? tokens.color.primary[600]
                          : isDark
                            ? tokens.color.neutral[400]
                            : tokens.color.neutral[600],
                        fontSize: 22,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? tokens.color.primary[700]
                        : isDark
                          ? tokens.color.neutral[200]
                          : tokens.color.neutral[800],
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
  );
};
