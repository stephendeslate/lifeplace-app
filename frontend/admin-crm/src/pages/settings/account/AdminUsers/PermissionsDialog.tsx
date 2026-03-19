import React from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';
import { PermissionEditor } from '@/components/settings/PermissionEditor';
import type { AdminPermissions } from '@/types/permissions.types';
import type { AdminUser } from '@/types/settings.types';

interface PermissionsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedUser: AdminUser | null;
  editingPermissions: AdminPermissions;
  onPermissionsChange: React.Dispatch<React.SetStateAction<AdminPermissions>>;
  isUpdating: boolean;
}

export const PermissionsDialog: React.FC<PermissionsDialogProps> = ({
  open,
  onClose,
  onSave,
  selectedUser,
  editingPermissions,
  onPermissionsChange,
  isUpdating,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <SecurityIcon color="primary" />
      Edit Permissions
    </DialogTitle>
    <DialogContent sx={{ position: 'relative' }}>
      {isUpdating && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 10,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      {selectedUser && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Edit permissions for:{' '}
            <strong>
              {selectedUser.first_name} {selectedUser.last_name}
            </strong>{' '}
            ({selectedUser.email})
          </Typography>
          <PermissionEditor
            value={editingPermissions}
            onChange={onPermissionsChange}
            disabled={isUpdating}
            defaultExpanded
          />
        </Box>
      )}
    </DialogContent>
    <DialogActions sx={{ p: 2, gap: 1 }}>
      <Button onClick={onClose} disabled={isUpdating}>
        Cancel
      </Button>
      <Button
        onClick={onSave}
        variant="contained"
        disabled={isUpdating}
        startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : <SecurityIcon />}
      >
        {isUpdating ? 'Saving...' : 'Save Permissions'}
      </Button>
    </DialogActions>
  </Dialog>
);
