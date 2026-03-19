import React from 'react';
import { Box, Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { tokens } from '@/design-system';
import { createTransition } from '@/design-system/utils/animations';
import type { HeaderNavItem } from './navigationConfig';

interface DesktopNavigationProps {
  visibleItems: HeaderNavItem[];
  overflowItems: HeaderNavItem[];
  hasActiveOverflow: boolean;
  isAboveLg: boolean;
  isAboveXl: boolean;
  isDark: boolean;
  moreMenuAnchor: null | HTMLElement;
  setMoreMenuAnchor: (el: null | HTMLElement) => void;
  navigate: (path: string) => void;
  isActiveRoute: (path: string) => boolean;
}

const navButtonActiveSx = {
  content: '""',
  position: 'absolute',
  bottom: -8,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 24,
  height: 3,
  borderRadius: tokens.spacing.radius.full,
  background: tokens.color.primary[600],
};

export const DesktopNavigation: React.FC<DesktopNavigationProps> = ({
  visibleItems,
  overflowItems,
  hasActiveOverflow,
  isAboveLg,
  isAboveXl,
  isDark,
  moreMenuAnchor,
  setMoreMenuAnchor,
  navigate,
  isActiveRoute,
}) => {
  return (
    <Box
      data-tour="main-navigation"
      sx={{
        display: 'flex',
        gap: isAboveLg ? 1 : 0.5,
        ml: isAboveXl ? 3 : isAboveLg ? 2.5 : 2,
      }}
    >
      {visibleItems.map((item) => {
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
              px: 1.5,
              py: 1,
              whiteSpace: 'nowrap',
              borderRadius: tokens.spacing.radius.md,
              position: 'relative',
              transition: createTransition(['background', 'color'], 'fast'),
              background: isActive ? tokens.color.primary[50] : 'transparent',
              '&:hover': {
                background: isActive ? tokens.color.primary[100] : tokens.color.neutral[100],
              },
              '&::after': isActive ? navButtonActiveSx : {},
            }}
          >
            {item.label}
          </Button>
        );
      })}

      {overflowItems.length > 0 && (
        <>
          <Button
            onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
            endIcon={<KeyboardArrowDown />}
            sx={{
              color: hasActiveOverflow ? tokens.color.primary[700] : tokens.color.neutral[700],
              fontWeight: hasActiveOverflow ? 600 : 500,
              fontSize: '0.875rem',
              px: 1.5,
              py: 1,
              whiteSpace: 'nowrap',
              borderRadius: tokens.spacing.radius.md,
              position: 'relative',
              transition: createTransition(['background', 'color'], 'fast'),
              background: hasActiveOverflow ? tokens.color.primary[50] : 'transparent',
              '&:hover': {
                background: hasActiveOverflow
                  ? tokens.color.primary[100]
                  : tokens.color.neutral[100],
              },
              '&::after': hasActiveOverflow ? navButtonActiveSx : {},
            }}
          >
            More
          </Button>
          <Menu
            anchorEl={moreMenuAnchor}
            open={Boolean(moreMenuAnchor)}
            onClose={() => setMoreMenuAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                borderRadius: tokens.spacing.radius.lg,
                border: isDark
                  ? `1px solid ${tokens.color.neutral[700]}`
                  : `1px solid ${tokens.color.neutral[200]}`,
                background: isDark ? tokens.color.neutral[900] : 'white',
              },
            }}
          >
            {overflowItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.path);

              return (
                <MenuItem
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMoreMenuAnchor(null);
                  }}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: tokens.spacing.radius.md,
                    transition: createTransition(['background'], 'fast'),
                    background: isActive ? tokens.color.primary[50] : 'transparent',
                    '&:hover': {
                      background: isActive ? tokens.color.primary[100] : tokens.color.neutral[100],
                    },
                  }}
                >
                  <ListItemIcon>
                    <Icon
                      sx={{
                        color: isActive ? tokens.color.primary[600] : tokens.color.neutral[600],
                        fontSize: 20,
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.875rem',
                      color: isActive ? tokens.color.primary[700] : undefined,
                    }}
                  >
                    {item.label}
                  </ListItemText>
                </MenuItem>
              );
            })}
          </Menu>
        </>
      )}
    </Box>
  );
};
