// frontend/admin-crm/src/pages/settings/account/AdminUsers.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  AdminPanelSettings,
  PersonAdd,
  Delete,
  Email,
  Cancel,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAdminUsers } from '../../../hooks/useSettings';
// Simple date formatter utility

interface InviteAdminFormData {
  email: string;
  first_name: string;
  last_name: string;
}

export const AdminUsers: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  // const { showSuccess, showError } = useToastActions();

  const {
    adminUsers,
    invitations,
    isLoadingAdminUsers,
    isLoadingInvitations,
    isCreatingInvitation,
    isDeletingInvitation,
    isDeletingUser,
    createInvitation,
    deleteInvitation,
    deleteAdminUser,
    adminUsersError,
    invitationsError,
  } = useAdminUsers();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState<InviteAdminFormData>({
    email: '',
    first_name: '',
    last_name: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<InviteAdminFormData>>({});

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Account Management' },
      { label: 'Admin Users' },
    ]);
  }, [setBreadcrumbs]);

  const validateForm = (): boolean => {
    const errors: Partial<InviteAdminFormData> = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInviteSubmit = () => {
    if (!validateForm()) return;

    createInvitation(formData, {
      onSuccess: () => {
        setInviteDialogOpen(false);
        setFormData({ email: '', first_name: '', last_name: '' });
        setFormErrors({});
      },
    });
  };

  const handleDeleteUser = () => {
    if (!selectedUserId) return;

    deleteAdminUser(selectedUserId, {
      onSuccess: () => {
        setDeleteUserDialogOpen(false);
        setSelectedUserId(null);
      },
    });
  };

  const handleDeleteInvitation = (invitationId: string) => {
    deleteInvitation(invitationId);
  };

  const openDeleteUserDialog = (userId: number) => {
    setSelectedUserId(userId);
    setDeleteUserDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInvitationStatusChip = (invitation: any) => {
    if (invitation.is_accepted) {
      return (
        <Chip
          icon={<CheckCircle />}
          label="Accepted"
          color="success"
          size="small"
          variant="outlined"
        />
      );
    }

    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return (
        <Chip
          icon={<Cancel />}
          label="Expired"
          color="error"
          size="small"
          variant="outlined"
        />
      );
    }

    return (
      <Chip
        icon={<Schedule />}
        label="Pending"
        color="warning"
        size="small"
        variant="outlined"
      />
    );
  };

  if (adminUsersError || invitationsError) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load admin users data. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <AdminPanelSettings color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                Admin Users
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Manage administrator accounts and send invitations
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setInviteDialogOpen(true)}
            sx={{ minWidth: 160 }}
          >
            Invite Admin
          </Button>
        </Box>
      </Box>

      <Stack spacing={4}>
        {/* Current Admin Users */}
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Current Admin Users
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {isLoadingAdminUsers ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : adminUsers.length === 0 ? (
              <Alert severity="info">
                No admin users found.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date Joined</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {adminUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : 'No name provided'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Email fontSize="small" color="action" />
                            <Typography variant="body2">
                              {user.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'Active' : 'Inactive'}
                            color={user.is_active ? 'success' : 'default'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(user.date_joined)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Delete User">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openDeleteUserDialog(user.id)}
                              disabled={isDeletingUser}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Pending Invitations
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {isLoadingInvitations ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : invitations.length === 0 ? (
              <Alert severity="info">
                No pending invitations.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Invited By</TableCell>
                      <TableCell>Expires</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {invitation.first_name} {invitation.last_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Email fontSize="small" color="action" />
                            <Typography variant="body2">
                              {invitation.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {getInvitationStatusChip(invitation)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {invitation.invited_by}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(invitation.expires_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Cancel Invitation">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteInvitation(invitation.id)}
                              disabled={isDeletingInvitation || invitation.is_accepted}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Invite Admin Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => !isCreatingInvitation && setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <PersonAdd color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Invite New Admin
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (formErrors.email) {
                  setFormErrors({ ...formErrors, email: undefined });
                }
              }}
              error={!!formErrors.email}
              helperText={formErrors.email}
              fullWidth
              disabled={isCreatingInvitation}
            />
            <Box display="flex" gap={2}>
              <TextField
                label="First Name"
                value={formData.first_name}
                onChange={(e) => {
                  setFormData({ ...formData, first_name: e.target.value });
                  if (formErrors.first_name) {
                    setFormErrors({ ...formErrors, first_name: undefined });
                  }
                }}
                error={!!formErrors.first_name}
                helperText={formErrors.first_name}
                fullWidth
                disabled={isCreatingInvitation}
              />
              <TextField
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => {
                  setFormData({ ...formData, last_name: e.target.value });
                  if (formErrors.last_name) {
                    setFormErrors({ ...formErrors, last_name: undefined });
                  }
                }}
                error={!!formErrors.last_name}
                helperText={formErrors.last_name}
                fullWidth
                disabled={isCreatingInvitation}
              />
            </Box>
            <Alert severity="info">
              An invitation email will be sent to the specified address. The invitation will expire in 7 days.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setInviteDialogOpen(false)}
            disabled={isCreatingInvitation}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleInviteSubmit}
            disabled={isCreatingInvitation}
            startIcon={isCreatingInvitation ? <CircularProgress size={20} /> : <Email />}
          >
            {isCreatingInvitation ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteUserDialogOpen}
        onClose={() => !isDeletingUser && setDeleteUserDialogOpen(false)}
        maxWidth="sm"
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Confirm User Deletion
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to deactivate this admin user? This action cannot be undone.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            The user will lose admin access immediately and will no longer be able to access the admin dashboard.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setDeleteUserDialogOpen(false)}
            disabled={isDeletingUser}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteUser}
            disabled={isDeletingUser}
            startIcon={isDeletingUser ? <CircularProgress size={20} /> : <Delete />}
          >
            {isDeletingUser ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};