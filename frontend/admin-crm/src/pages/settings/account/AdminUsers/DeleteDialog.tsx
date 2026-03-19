import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import type { AdminUser, AdminInvitation } from '@/types/settings.types';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  menuType: 'user' | 'invitation';
  selectedUser: AdminUser | null;
  selectedInvitation: AdminInvitation | null;
  isDeleting: boolean;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  menuType,
  selectedUser,
  selectedInvitation,
  isDeleting,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'error.main' }}>
      <DeleteIcon color="error" />
      {menuType === 'user' ? 'Deactivate Admin User' : 'Cancel Invitation'}
    </DialogTitle>
    <DialogContent>
      {isDeleting && (
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
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Are you sure you want to {menuType === 'user' ? 'deactivate' : 'cancel'}{' '}
        {menuType === 'user'
          ? `${selectedUser?.first_name} ${selectedUser?.last_name}`
          : `the invitation for ${selectedInvitation?.first_name} ${selectedInvitation?.last_name}`}
        ?
      </Typography>
      {(selectedUser || selectedInvitation) && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: 'error.50',
            border: 1,
            borderColor: 'error.200',
          }}
        >
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Name:</strong>{' '}
              {selectedUser
                ? `${selectedUser.first_name} ${selectedUser.last_name}`
                : `${selectedInvitation?.first_name} ${selectedInvitation?.last_name}`}
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {selectedUser?.email || selectedInvitation?.email}
            </Typography>
          </Stack>
        </Box>
      )}
    </DialogContent>
    <DialogActions sx={{ p: 2, gap: 1 }}>
      <Button onClick={onClose} disabled={isDeleting}>
        Cancel
      </Button>
      <Button
        onClick={onConfirm}
        color="error"
        variant="contained"
        disabled={isDeleting}
        startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
      >
        {isDeleting ? 'Deleting...' : menuType === 'user' ? 'Deactivate' : 'Cancel Invitation'}
      </Button>
    </DialogActions>
  </Dialog>
);
