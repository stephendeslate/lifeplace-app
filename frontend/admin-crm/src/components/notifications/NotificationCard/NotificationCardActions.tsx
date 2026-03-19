// frontend/admin-crm/src/components/notifications/NotificationCard/NotificationCardActions.tsx

import React from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  MoreVert,
  Delete,
  OpenInNew,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import type { NavigateFunction } from 'react-router-dom';
import type { Notification } from '@/types/notifications.types';

interface NotificationCardActionsProps {
  notification: Notification;
  menuAnchor: null | HTMLElement;
  navigate: NavigateFunction;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onMenuClose: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
}

export const NotificationCardActions: React.FC<NotificationCardActionsProps> = ({
  notification,
  menuAnchor,
  navigate,
  onMenuOpen,
  onMenuClose,
  onMarkRead,
  onMarkUnread,
  onDelete,
}) => (
  <Box sx={{ ml: 1 }}>
    <Stack direction="row" spacing={0.5}>
      {/* Read/Unread Toggle */}
      <Tooltip title={notification.is_read ? 'Mark as unread' : 'Mark as read'}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            if (notification.is_read) {
              onMarkUnread();
            } else {
              onMarkRead();
            }
          }}
          sx={{
            color: notification.is_read ? 'text.secondary' : 'primary.main',
            opacity: 0.8,
            '&:hover': {
              opacity: 1,
              backgroundColor: notification.is_read ? 'action.hover' : 'primary.50',
            },
          }}
        >
          {notification.is_read ? (
            <RadioButtonUnchecked fontSize="small" />
          ) : (
            <CheckCircle fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      {/* Delete */}
      <Tooltip title="Delete notification">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          sx={{
            color: 'text.secondary',
            opacity: 0.7,
            '&:hover': {
              opacity: 1,
              color: 'error.main',
              backgroundColor: 'error.50',
            },
          }}
        >
          <Delete fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* More Actions Menu (overflow) */}
      <Tooltip title="More actions">
        <IconButton
          size="small"
          onClick={onMenuOpen}
          sx={{
            color: 'text.secondary',
            opacity: 0.6,
            '&:hover': { opacity: 1 },
          }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={onMenuClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {notification.action_url && (
          <MenuItem
            onClick={() => {
              onMenuClose();
              if (notification.action_url?.startsWith('http')) {
                window.open(notification.action_url, '_blank');
              } else if (notification.action_url) {
                navigate(notification.action_url);
              }
            }}
          >
            <ListItemIcon>
              <OpenInNew fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Stack>
  </Box>
);
