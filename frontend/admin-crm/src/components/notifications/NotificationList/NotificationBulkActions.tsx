import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import { MoreVert, MarkEmailRead, MarkEmailUnread, Delete } from '@mui/icons-material';

interface NotificationBulkActionsProps {
  selectedCount: number;
  bulkMenuAnchor: null | HTMLElement;
  isPerformingAction: boolean;
  onBulkMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onBulkMenuClose: () => void;
  onBulkAction: (action: 'mark_read' | 'mark_unread' | 'delete') => void;
}

export const NotificationBulkActions: React.FC<NotificationBulkActionsProps> = ({
  selectedCount,
  bulkMenuAnchor,
  isPerformingAction,
  onBulkMenuOpen,
  onBulkMenuClose,
  onBulkAction,
}) => {
  if (selectedCount === 0) return null;

  return (
    <Card sx={{ mb: 2, bgcolor: 'primary.50', borderLeft: 4, borderColor: 'primary.main' }}>
      <CardContent sx={{ py: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="primary.main" fontWeight="medium">
            {selectedCount} notification{selectedCount !== 1 ? 's' : ''} selected
          </Typography>

          <Box>
            <IconButton onClick={onBulkMenuOpen} disabled={isPerformingAction} color="primary">
              <MoreVert />
            </IconButton>

            <Menu
              anchorEl={bulkMenuAnchor}
              open={Boolean(bulkMenuAnchor)}
              onClose={onBulkMenuClose}
            >
              <MenuItem onClick={() => onBulkAction('mark_read')}>
                <ListItemIcon>
                  <MarkEmailRead fontSize="small" />
                </ListItemIcon>
                <ListItemText>Mark as Read</ListItemText>
              </MenuItem>

              <MenuItem onClick={() => onBulkAction('mark_unread')}>
                <ListItemIcon>
                  <MarkEmailUnread fontSize="small" />
                </ListItemIcon>
                <ListItemText>Mark as Unread</ListItemText>
              </MenuItem>

              <MenuItem onClick={() => onBulkAction('delete')} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <Delete fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
