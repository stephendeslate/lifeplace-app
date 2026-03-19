import React from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Tooltip,
  Badge,
  Typography,
  Chip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  ExitToApp,
  DarkMode,
  LightMode,
  Brightness4,
  School as TourIcon,
} from '@mui/icons-material';
import { tokens } from '@/design-system';
import { createTransition } from '@/design-system/utils/animations';

interface UserMenuProps {
  user:
    | { first_name?: string; last_name?: string; email?: string; role?: string }
    | null
    | undefined;
  isDark: boolean;
  themeMode: 'light' | 'dark' | 'system';
  effectiveMode: 'light' | 'dark';
  userMenuAnchor: null | HTMLElement;
  onUserMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onUserMenuClose: () => void;
  onSettingsClick: () => void;
  onThemeToggle: () => void;
  onStartTour: () => void;
  onLogout: () => void;
  getInitials: (firstName?: string, lastName?: string, email?: string) => string;
}

const menuItemSx = {
  mx: 1,
  borderRadius: tokens.spacing.radius.md,
  transition: createTransition(['background'], 'fast'),
  '&:hover': {
    background: tokens.color.neutral[100],
  },
};

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  isDark,
  themeMode,
  effectiveMode,
  userMenuAnchor,
  onUserMenuOpen,
  onUserMenuClose,
  onSettingsClick,
  onThemeToggle,
  onStartTour,
  onLogout,
  getInitials,
}) => {
  return (
    <>
      <Tooltip title="User Menu">
        <IconButton
          data-tour="user-menu"
          onClick={onUserMenuOpen}
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
                bgcolor: tokens.color.primary[500],
                color: 'white',
                width: 42,
                height: 42,
                fontSize: '0.875rem',
                fontWeight: 600,
                border: `2px solid ${tokens.color.neutral[200]}`,
                transition: createTransition(['opacity'], 'fast'),
                '&:hover': {
                  opacity: 0.9,
                },
              }}
            >
              {getInitials(user?.first_name, user?.last_name, user?.email)}
            </Avatar>
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={onUserMenuClose}
        onClick={onUserMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 240,
            borderRadius: tokens.spacing.radius.lg,
            border: isDark
              ? `1px solid ${tokens.color.neutral[700]}`
              : `1px solid ${tokens.color.neutral[200]}`,
            background: isDark ? tokens.color.neutral[900] : 'white',
            overflow: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2.5,
            background: tokens.color.neutral[50],
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 52,
                height: 52,
                background: tokens.color.primary[500],
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              {getInitials(user?.first_name, user?.last_name, user?.email)}
            </Avatar>
            <Box flex={1}>
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                sx={{
                  color: isDark ? tokens.color.neutral[50] : tokens.color.neutral[900],
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
                  color: isDark ? tokens.color.neutral[300] : tokens.color.neutral[600],
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
                    background: tokens.color.primary[50],
                    color: tokens.color.primary[700],
                    border: `1px solid ${tokens.color.primary[200]}`,
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ opacity: 0.1 }} />

        <Box sx={{ py: 1 }}>
          <MenuItem onClick={onSettingsClick} sx={menuItemSx}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" sx={{ color: tokens.color.primary[600] }} />
            </ListItemIcon>
            <ListItemText>Account Settings</ListItemText>
          </MenuItem>

          <MenuItem onClick={onThemeToggle} sx={menuItemSx}>
            <ListItemIcon>
              {themeMode === 'light' && (
                <DarkMode fontSize="small" sx={{ color: tokens.color.neutral[600] }} />
              )}
              {themeMode === 'dark' && (
                <LightMode fontSize="small" sx={{ color: tokens.color.warning[500] }} />
              )}
              {themeMode === 'system' && (
                <Brightness4 fontSize="small" sx={{ color: tokens.color.info[500] }} />
              )}
            </ListItemIcon>
            <ListItemText>
              {themeMode === 'light' && 'Switch to Dark'}
              {themeMode === 'dark' && 'Follow System'}
              {themeMode === 'system' && 'Switch to Light'}
            </ListItemText>
            <Box sx={{ ml: 1, opacity: 0.6, fontSize: '0.75rem' }}>
              {effectiveMode === 'dark' ? '🌙' : '☀️'}
            </Box>
          </MenuItem>

          <MenuItem onClick={onStartTour} sx={menuItemSx}>
            <ListItemIcon>
              <TourIcon fontSize="small" sx={{ color: tokens.color.info[600] }} />
            </ListItemIcon>
            <ListItemText>Take a Tour</ListItemText>
          </MenuItem>

          <Divider sx={{ opacity: 0.1, my: 1 }} />

          <MenuItem
            onClick={onLogout}
            sx={{
              mx: 1,
              borderRadius: tokens.spacing.radius.md,
              transition: createTransition(['background', 'color'], 'fast'),
              '&:hover': {
                background: tokens.color.error[50],
                color: tokens.color.error[600],
                '& .MuiListItemIcon-root': {
                  color: tokens.color.error[600],
                },
              },
            }}
          >
            <ListItemIcon>
              <ExitToApp fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Box>
      </Menu>
    </>
  );
};
