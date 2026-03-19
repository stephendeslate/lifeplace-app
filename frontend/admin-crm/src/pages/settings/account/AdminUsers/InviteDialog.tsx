import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { Email, Person, PersonAdd, Security as SecurityIcon } from '@mui/icons-material';
import { PermissionEditor } from '@/components/settings/PermissionEditor';
import { FULL_ADMIN_PERMISSIONS } from '@/types/permissions.types';
import type { InviteAdminFormData } from '@/types/settings.types';

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  inviteForm: InviteAdminFormData;
  onFormChange: React.Dispatch<React.SetStateAction<InviteAdminFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isCreating: boolean;
}

export const InviteDialog: React.FC<InviteDialogProps> = ({
  open,
  onClose,
  inviteForm,
  onFormChange,
  onSubmit,
  isCreating,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <PersonAdd color="primary" />
      Invite Admin User
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter the details for the new administrator. They will receive an invitation email with
        instructions to set up their account.
      </Typography>

      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={3}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              label="First Name"
              value={inviteForm.first_name}
              onChange={(e) => onFormChange((prev) => ({ ...prev, first_name: e.target.value }))}
              required
              disabled={isCreating}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="primary" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={inviteForm.last_name}
              onChange={(e) => onFormChange((prev) => ({ ...prev, last_name: e.target.value }))}
              required
              disabled={isCreating}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={inviteForm.email}
            onChange={(e) => onFormChange((prev) => ({ ...prev, email: e.target.value }))}
            required
            disabled={isCreating}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="primary" />
                </InputAdornment>
              ),
            }}
          />

          {/* Permission Editor */}
          <Box sx={{ mt: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <SecurityIcon sx={{ fontSize: '1rem' }} color="primary" />
              Permission Level
            </Typography>
            <PermissionEditor
              value={inviteForm.permissions || FULL_ADMIN_PERMISSIONS}
              onChange={(permissions) => onFormChange((prev) => ({ ...prev, permissions }))}
              disabled={isCreating}
            />
          </Box>

          <Alert severity="info">
            An invitation email will be sent to this address with instructions to set up their admin
            account.
          </Alert>
        </Stack>
      </Box>
    </DialogContent>
    <DialogActions sx={{ p: 2, gap: 1 }}>
      <Button onClick={onClose} disabled={isCreating}>
        Cancel
      </Button>
      <Button
        onClick={onSubmit}
        variant="contained"
        disabled={isCreating}
        startIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : <Email />}
      >
        {isCreating ? 'Sending...' : 'Send Invitation'}
      </Button>
    </DialogActions>
  </Dialog>
);
