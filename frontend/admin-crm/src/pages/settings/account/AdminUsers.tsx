// frontend/admin-crm/src/pages/settings/account/AdminUsers.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Menu,
  MenuItem,
  Alert,
  Paper,
  Divider,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  PersonAdd as PersonAddIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAdminUsers } from '../../../hooks/useSettings';
import { useCommunications } from '../../../hooks/useCommunications';
import type { InviteAdminFormData, AdminUser, AdminInvitation } from '../../../types/settings.types';

export const AdminUsers: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewRecordsDialogOpen, setViewRecordsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<AdminInvitation | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuType, setMenuType] = useState<'user' | 'invitation'>('user');

  const [inviteForm, setInviteForm] = useState<InviteAdminFormData>({
    email: '',
    first_name: '',
    last_name: '',
  });

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
  } = useAdminUsers();

  const { useRecords } = useCommunications();

  // Get communication records for admin invitations
  const { data: communicationRecords } = useRecords({
    template_name: 'Admin Invitation'
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Account', path: '/settings/account' },
      { label: 'Admin Users' },
    ]);
  }, [setBreadcrumbs]);

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvitation(inviteForm, {
      onSuccess: () => {
        setInviteDialogOpen(false);
        setInviteForm({ email: '', first_name: '', last_name: '' });
      },
    });
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    type: 'user' | 'invitation',
    item: AdminUser | AdminInvitation
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuType(type);
    if (type === 'user') {
      setSelectedUser(item as AdminUser);
    } else {
      setSelectedInvitation(item as AdminInvitation);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
    setSelectedInvitation(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleViewRecordsClick = () => {
    setViewRecordsDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (menuType === 'user' && selectedUser) {
      deleteAdminUser(selectedUser.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedUser(null);
        },
      });
    } else if (menuType === 'invitation' && selectedInvitation) {
      deleteInvitation(selectedInvitation.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedInvitation(null);
        },
      });
    }
  };

  const getInvitationStatus = (invitation: AdminInvitation) => {
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (invitation.is_accepted) {
      return { label: 'Accepted', color: 'success' as const };
    } else if (now > expiresAt) {
      return { label: 'Expired', color: 'error' as const };
    } else {
      return { label: 'Pending', color: 'warning' as const };
    }
  };

  const getInvitationRecord = (invitation: AdminInvitation) => {
    return communicationRecords?.find(record => 
      record.recipient === invitation.email && 
      record.template_name === 'Admin Invitation'
    );
  };

  // Empty state when no admin users exist
  const renderNoAdminsState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 6, 
        textAlign: 'center',
        bgcolor: 'grey.50',
        border: '2px dashed',
        borderColor: 'grey.300'
      }}
    >
      <AdminIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        No Admin Users Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
        Start building your admin team by inviting other administrators to help manage your LifePlace account.
      </Typography>
      
      <Button
        variant="contained"
        size="large"
        startIcon={<PersonAddIcon />}
        onClick={() => setInviteDialogOpen(true)}
        sx={{ mt: 2 }}
      >
        Invite Your First Admin
      </Button>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="body2" color="text.secondary">
        💡 <strong>Tip:</strong> Invited admins will receive an email with instructions to set up their account
      </Typography>
    </Paper>
  );

  const isLoading = isLoadingAdminUsers || isLoadingInvitations;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  const hasAdmins = adminUsers.length > 0 || invitations.length > 0;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Admin Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage administrator accounts and invitations
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setInviteDialogOpen(true)}
        >
          Invite Admin
        </Button>
      </Box>

      {!hasAdmins ? (
        renderNoAdminsState()
      ) : (
        <Stack spacing={3}>
          {/* Active Admin Users */}
          {adminUsers.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Administrators ({adminUsers.length})
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Company</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell width="50"></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {adminUsers.map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <AdminIcon color="primary" />
                              <Typography variant="body2" fontWeight="medium">
                                {user.first_name} {user.last_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{user.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {user.profile?.company || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(user.date_joined).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={user.is_active ? 'Active' : 'Inactive'} 
                              color={user.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, 'user', user)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pending Invitations ({invitations.length})
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Invited By</TableCell>
                        <TableCell>Sent</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Email Status</TableCell>
                        <TableCell width="50"></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invitations.map((invitation) => {
                        const status = getInvitationStatus(invitation);
                        const record = getInvitationRecord(invitation);
                        
                        return (
                          <TableRow key={invitation.id} hover>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <PersonAddIcon color="action" />
                                <Typography variant="body2" fontWeight="medium">
                                  {invitation.first_name} {invitation.last_name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{invitation.email}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {invitation.invited_by}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(invitation.created_at).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={status.label} 
                                color={status.color}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {record ? (
                                <Tooltip title={`${record.delivery_status} - Click to view details`}>
                                  <Chip 
                                    label={record.delivery_status}
                                    size="small"
                                    color={record.delivery_status === 'DELIVERED' ? 'success' : 
                                           record.delivery_status === 'FAILED' ? 'error' : 'warning'}
                                    variant="outlined"
                                    clickable
                                    onClick={() => handleViewRecordsClick()}
                                  />
                                </Tooltip>
                              ) : (
                                <Chip label="No record" size="small" variant="outlined" />
                              )}
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, 'invitation', invitation)}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Communication Tracking Alert */}
          {communicationRecords && communicationRecords.length > 0 && (
            <Alert severity="info" icon={<EmailIcon />}>
              <Typography variant="body2">
                <strong>Email Tracking:</strong> Admin invitation emails are now tracked through the communication system. 
                You can view delivery status and open rates for each invitation above.
              </Typography>
            </Alert>
          )}
        </Stack>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Admin User</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleInviteSubmit} sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label="First Name"
                value={inviteForm.first_name}
                onChange={(e) => setInviteForm(prev => ({ ...prev, first_name: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Last Name"
                value={inviteForm.last_name}
                onChange={(e) => setInviteForm(prev => ({ ...prev, last_name: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Email Address"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                required
                fullWidth
              />
              <Alert severity="info">
                An invitation email will be sent to this address with instructions to set up their admin account.
              </Alert>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleInviteSubmit}
            variant="contained" 
            disabled={isCreatingInvitation}
            startIcon={isCreatingInvitation ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            {isCreatingInvitation ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {menuType === 'invitation' && (
          <MenuItem onClick={handleViewRecordsClick}>
            <ViewIcon sx={{ mr: 1 }} />
            View Email Status
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          {menuType === 'user' ? 'Deactivate User' : 'Cancel Invitation'}
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          {menuType === 'user' ? 'Deactivate Admin User' : 'Cancel Invitation'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {menuType === 'user' ? 'deactivate' : 'cancel'}{' '}
            {menuType === 'user' 
              ? `${selectedUser?.first_name} ${selectedUser?.last_name}`
              : `the invitation for ${selectedInvitation?.first_name} ${selectedInvitation?.last_name}`
            }?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error" 
            variant="contained"
            disabled={isDeletingUser || isDeletingInvitation}
          >
            {(isDeletingUser || isDeletingInvitation) ? (
              <CircularProgress size={20} />
            ) : (
              menuType === 'user' ? 'Deactivate' : 'Cancel Invitation'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Communication Records Dialog */}
      <Dialog 
        open={viewRecordsDialogOpen} 
        onClose={() => setViewRecordsDialogOpen(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Email Communication Status</DialogTitle>
        <DialogContent>
          {selectedInvitation && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Invitation for: {selectedInvitation.first_name} {selectedInvitation.last_name} ({selectedInvitation.email})
              </Typography>
              
              {(() => {
                const record = getInvitationRecord(selectedInvitation);
                if (!record) {
                  return (
                    <Alert severity="warning">
                      No email record found for this invitation. The invitation may have been created before the communication system was implemented.
                    </Alert>
                  );
                }
                
                return (
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2"><strong>Status:</strong></Typography>
                          <Chip 
                            label={record.delivery_status}
                            size="small"
                            color={record.delivery_status === 'DELIVERED' ? 'success' : 
                                   record.delivery_status === 'FAILED' ? 'error' : 'warning'}
                          />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2"><strong>Sent:</strong></Typography>
                          <Typography variant="body2" color="text.secondary">
                            {record.sent_at ? new Date(record.sent_at).toLocaleString() : 'Not sent'}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2"><strong>Delivered:</strong></Typography>
                          <Typography variant="body2" color="text.secondary">
                            {record.delivered_at ? new Date(record.delivered_at).toLocaleString() : 'Not delivered'}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2"><strong>Opened:</strong></Typography>
                          <Typography variant="body2" color="text.secondary">
                            {record.is_opened ? `Yes - ${new Date(record.opened_at!).toLocaleString()}` : 'Not opened'}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewRecordsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};