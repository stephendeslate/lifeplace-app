import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Divider,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  AdminPanelSettings,
  Email,
  Person,
  PersonAdd,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAdminUsers, useAdminPermissions } from '../../../hooks/useSettings';
import { useCommunications } from '../../../hooks/useCommunications';
import { usePermissions } from '../../../hooks/usePermissions';
import { PermissionEditor } from '../../../components/settings/PermissionEditor';
import type { AdminPermissions } from '../../../types/permissions.types';
import { FULL_ADMIN_PERMISSIONS } from '../../../types/permissions.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import {
  ModernPageHeader,
  type HeaderAction,
  createRefreshAction,
  createAddAction,
} from '../../../components/common/ModernPageHeader';
import {
  ModernTable,
  type ModernTableColumn,
  type ModernTableAction,
} from '../../../components/common';
import { ModernEmptyState } from '../../../components/common/ModernEmptyState';
import type {
  InviteAdminFormData,
  AdminUser,
  AdminInvitation,
} from '../../../types/settings.types';

export const AdminUsers: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  // Note: useAuth not needed in this component
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewRecordsDialogOpen, setViewRecordsDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<AdminInvitation | null>(null);
  const [menuType, setMenuType] = useState<'user' | 'invitation'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchField, setShowSearchField] = useState(false);

  // Permission editing state
  const [editingPermissions, setEditingPermissions] =
    useState<AdminPermissions>(FULL_ADMIN_PERMISSIONS);

  const [inviteForm, setInviteForm] = useState<InviteAdminFormData>({
    email: '',
    first_name: '',
    last_name: '',
    permissions: FULL_ADMIN_PERMISSIONS,
  });

  // Get current user's permissions for UI visibility
  const { hasPermission } = usePermissions();
  const canManageAdmins = hasPermission('can_manage_admins');

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
    refetchAdminUsers,
  } = useAdminUsers();

  // Permission management hook
  const { updatePermissions, isUpdatingPermissions } = useAdminPermissions();

  const { useRecords } = useCommunications();

  // Get communication records for admin invitations
  const { data: communicationRecords } = useRecords({
    template_name: 'Admin Invitation',
  });

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Account Management' },
      { label: 'Admin Users' },
    ]);
  }, [setBreadcrumbs]);

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreateNew = () => {
    setInviteDialogOpen(true);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleToggleSearch = () => {
    setShowSearchField(!showSearchField);
    if (!showSearchField) {
      setSearchQuery('');
    }
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvitation(inviteForm, {
      onSuccess: () => {
        setInviteDialogOpen(false);
        setInviteForm({
          email: '',
          first_name: '',
          last_name: '',
          permissions: FULL_ADMIN_PERMISSIONS,
        });
      },
    });
  };

  const handleEditPermissionsClick = (user: AdminUser) => {
    setSelectedUser(user);
    // Initialize with user's current permissions or full admin if not set
    setEditingPermissions(user.admin_permissions || FULL_ADMIN_PERMISSIONS);
    setPermissionsDialogOpen(true);
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;

    updatePermissions(
      { userId: selectedUser.id, permissions: editingPermissions },
      {
        onSuccess: () => {
          setPermissionsDialogOpen(false);
          setSelectedUser(null);
          refetchAdminUsers();
        },
      },
    );
  };

  const handleDeleteClick = (type: 'user' | 'invitation', item: AdminUser | AdminInvitation) => {
    setMenuType(type);
    if (type === 'user') {
      setSelectedUser(item as AdminUser);
    } else {
      setSelectedInvitation(item as AdminInvitation);
    }
    setDeleteDialogOpen(true);
  };

  const handleViewRecordsClick = () => {
    setViewRecordsDialogOpen(true);
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
    return communicationRecords?.find(
      (record) =>
        record.recipient === invitation.email && record.template_name === 'Admin Invitation',
    );
  };

  // Filter data based on search
  const filteredAdminUsers = adminUsers.filter((user) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.profile?.company || '').toLowerCase().includes(searchLower)
    );
  });

  const filteredInvitations = invitations.filter((invitation) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      invitation.first_name.toLowerCase().includes(searchLower) ||
      invitation.last_name.toLowerCase().includes(searchLower) ||
      invitation.email.toLowerCase().includes(searchLower)
    );
  });

  const isLoading = isLoadingAdminUsers || isLoadingInvitations;

  // Table columns for Admin Users
  const getAdminUsersColumns = (): ModernTableColumn<AdminUser>[] => [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, user) => (
        <Box display="flex" alignItems="center" gap={1.5}>
          <AdminPanelSettings color="primary" />
          <Typography variant="body2" fontWeight="medium">
            {user.first_name} {user.last_name}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (_, user) => (
        <Typography variant="body2" color="text.secondary">
          {user.email}
        </Typography>
      ),
    },
    {
      key: 'company',
      label: 'Company',
      hideBelow: 'md',
      render: (_, user) => (
        <Typography variant="body2" color="text.secondary">
          {user.profile?.company || '-'}
        </Typography>
      ),
    },
    {
      key: 'date_joined',
      label: 'Joined',
      sortable: true,
      hideBelow: 'md',
      render: (_, user) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(user.date_joined).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      key: 'permission_level',
      label: 'Permission Level',
      hideBelow: 'lg',
      render: (_, user) => {
        const isFullAdmin =
          user.is_full_admin ||
          !user.admin_permissions ||
          Object.values(user.admin_permissions).every((v) => v === true);
        return (
          <Chip
            label={isFullAdmin ? 'Full Admin' : 'Limited Admin'}
            size="small"
            color={isFullAdmin ? 'primary' : 'default'}
            variant={isFullAdmin ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, user) => (
        <Chip
          label={user.is_active ? 'Active' : 'Inactive'}
          color={user.is_active ? 'success' : 'default'}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      ),
    },
  ];

  // Table actions for Admin Users
  const getAdminUsersActions = (): ModernTableAction<AdminUser>[] => {
    // Only show actions if user has can_manage_admins permission
    if (!canManageAdmins) return [];

    return [
      {
        label: 'Edit Permissions',
        icon: <SecurityIcon />,
        onClick: (user) => handleEditPermissionsClick(user),
        color: 'primary',
      },
      {
        label: 'Delete User',
        icon: <DeleteIcon />,
        onClick: (user) => handleDeleteClick('user', user),
        color: 'error',
      },
    ];
  };

  // Table columns for Invitations
  const getInvitationsColumns = (): ModernTableColumn<AdminInvitation>[] => [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, invitation) => (
        <Box display="flex" alignItems="center" gap={1.5}>
          <PersonAdd color="warning" />
          <Typography variant="body2" fontWeight="medium">
            {invitation.first_name} {invitation.last_name}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (_, invitation) => (
        <Typography variant="body2" color="text.secondary">
          {invitation.email}
        </Typography>
      ),
    },
    {
      key: 'invited_by',
      label: 'Invited By',
      hideBelow: 'md',
      render: (_, invitation) => (
        <Typography variant="body2" color="text.secondary">
          {invitation.invited_by}
        </Typography>
      ),
    },
    {
      key: 'created_at',
      label: 'Sent',
      sortable: true,
      hideBelow: 'md',
      render: (_, invitation) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(invitation.created_at).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      hideBelow: 'lg',
      render: (_, invitation) => {
        const status = getInvitationStatus(invitation);
        return (
          <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 600 }} />
        );
      },
    },
    {
      key: 'email_status',
      label: 'Email Status',
      hideBelow: 'lg',
      render: (_, invitation) => {
        const record = getInvitationRecord(invitation);
        return record ? (
          <Tooltip title={`${record.delivery_status} - Click to view details`}>
            <Chip
              label={record.delivery_status}
              size="small"
              color={
                record.delivery_status === 'DELIVERED'
                  ? 'success'
                  : record.delivery_status === 'FAILED'
                    ? 'error'
                    : 'warning'
              }
              variant="outlined"
              clickable
              onClick={() => handleViewRecordsClick()}
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
        ) : (
          <Chip label="Queued" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        );
      },
    },
  ];

  // Table actions for Invitations
  const getInvitationsActions = (): ModernTableAction<AdminInvitation>[] => {
    // Only show actions if user has can_manage_admins permission
    if (!canManageAdmins) return [];

    return [
      {
        label: 'Delete Invitation',
        icon: <DeleteIcon />,
        onClick: (invitation) => handleDeleteClick('invitation', invitation),
        color: 'error',
      },
    ];
  };

  // Remove page-level loading - using form-level loading instead

  const totalUsers = adminUsers.length + invitations.length;

  // Header actions
  const headerActions: HeaderAction[] = [
    {
      icon: <SearchIcon />,
      label: showSearchField ? 'Hide Search' : 'Search',
      onClick: handleToggleSearch,
      variant: 'icon',
      tooltip: showSearchField ? 'Hide search field' : 'Search users and invitations',
    },
    createRefreshAction(handleRefresh),
  ];

  // Only show invite button if user has can_manage_admins permission
  const primaryAction = canManageAdmins
    ? createAddAction('Invite Admin', handleCreateNew, 'primary')
    : undefined;

  return (
    <ModernSettingsLayout>
      {/* Header */}
      <ModernPageHeader
        title="Admin Users"
        subtitle="Manage administrator accounts and invitations for your LifePlace account"
        icon={<AdminPanelSettings />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Account Management' },
          { label: 'Admin Users' },
        ]}
        primaryAction={primaryAction}
        secondaryActions={headerActions}
        stats={[
          { label: 'Total Users', value: totalUsers },
          { label: 'Active Admins', value: adminUsers.length },
          { label: 'Pending Invites', value: invitations.length },
        ]}
        size="medium"
      />

      {/* Search Field - Conditionally Shown */}
      {showSearchField && (
        <Box sx={{ mb: 4, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <SearchIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Search Users & Invitations
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Find admin users and invitations by name, email, or company
          </Typography>
          <TextField
            fullWidth
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="primary" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Main Content */}
      {totalUsers === 0 ? (
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <ModernEmptyState
            icon={AdminPanelSettings}
            title="No Admin Users Yet"
            description={
              canManageAdmins
                ? 'Start building your admin team by inviting other administrators to help manage your LifePlace account.'
                : 'No other admin users have been added yet. Contact a full admin to invite new users.'
            }
            primaryAction={
              canManageAdmins
                ? {
                    label: 'Invite Your First Admin',
                    onClick: handleCreateNew,
                    icon: <PersonAdd />,
                    color: 'primary',
                  }
                : undefined
            }
            tip={
              canManageAdmins
                ? {
                    text: 'Invited admins will receive an email with instructions to set up their account',
                    type: 'info',
                  }
                : undefined
            }
            size="medium"
          />
        </Box>
      ) : (
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Box sx={{ position: 'relative' }}>
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 10,
                  borderRadius: 1,
                }}
              >
                <CircularProgress />
              </Box>
            )}

            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <AdminPanelSettings color="primary" />
              User Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchQuery
                ? `Search results for "${searchQuery}" - ${filteredAdminUsers.length + filteredInvitations.length} found`
                : `${totalUsers} total users and invitations`}
            </Typography>

            {/* Active Admin Users */}
            {filteredAdminUsers.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight="600"
                  sx={{
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <AdminPanelSettings color="success" sx={{ fontSize: '1rem' }} />
                  Active Administrators ({filteredAdminUsers.length})
                </Typography>
                <ModernTable
                  columns={
                    getAdminUsersColumns() as unknown as ModernTableColumn<
                      Record<string, unknown>
                    >[]
                  }
                  data={filteredAdminUsers as unknown as Record<string, unknown>[]}
                  actions={
                    getAdminUsersActions() as unknown as ModernTableAction<
                      Record<string, unknown>
                    >[]
                  }
                  loading={false}
                  emptyState={
                    <ModernEmptyState
                      icon={AdminPanelSettings}
                      title="No Admin Users Found"
                      description={
                        searchQuery ? `No users match "${searchQuery}"` : 'No admin users available'
                      }
                      size="medium"
                      color="primary"
                    />
                  }
                />
              </Box>
            )}

            {/* Pending Invitations */}
            {filteredInvitations.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight="600"
                  sx={{
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <PersonAdd color="warning" sx={{ fontSize: '1rem' }} />
                  Pending Invitations ({filteredInvitations.length})
                </Typography>
                <ModernTable
                  columns={
                    getInvitationsColumns() as unknown as ModernTableColumn<
                      Record<string, unknown>
                    >[]
                  }
                  data={filteredInvitations as unknown as Record<string, unknown>[]}
                  actions={
                    getInvitationsActions() as unknown as ModernTableAction<
                      Record<string, unknown>
                    >[]
                  }
                  loading={false}
                  emptyState={
                    <ModernEmptyState
                      icon={PersonAdd}
                      title="No Pending Invitations"
                      description={
                        searchQuery
                          ? `No invitations match "${searchQuery}"`
                          : 'All invitations have been accepted or expired'
                      }
                      size="medium"
                      color="primary"
                    />
                  }
                />
              </Box>
            )}

            {/* Show unified empty state when both are empty but we have search */}
            {filteredAdminUsers.length === 0 && filteredInvitations.length === 0 && searchQuery && (
              <ModernEmptyState
                icon={SearchIcon}
                title="No Results Found"
                description={`No users or invitations match "${searchQuery}"`}
                size="medium"
                color="primary"
              />
            )}

            {/* Communication Tracking Info */}
            {communicationRecords && communicationRecords.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Alert severity="info" icon={<Email />}>
                  <Typography variant="body2">
                    <strong>Email Tracking:</strong> Admin invitation emails are now tracked through
                    the communication system. You can view delivery status and open rates for each
                    invitation above.
                  </Typography>
                </Alert>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Invite Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PersonAdd color="primary" />
          Invite Admin User
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter the details for the new administrator. They will receive an invitation email with
            instructions to set up their account.
          </Typography>

          <Box component="form" onSubmit={handleInviteSubmit}>
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
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                  required
                  disabled={isCreatingInvitation}
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
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                  required
                  disabled={isCreatingInvitation}
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
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                disabled={isCreatingInvitation}
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
                  sx={{
                    mb: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <SecurityIcon sx={{ fontSize: '1rem' }} color="primary" />
                  Permission Level
                </Typography>
                <PermissionEditor
                  value={inviteForm.permissions || FULL_ADMIN_PERMISSIONS}
                  onChange={(permissions) => setInviteForm((prev) => ({ ...prev, permissions }))}
                  disabled={isCreatingInvitation}
                />
              </Box>

              <Alert severity="info">
                An invitation email will be sent to this address with instructions to set up their
                admin account.
              </Alert>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setInviteDialogOpen(false)} disabled={isCreatingInvitation}>
            Cancel
          </Button>
          <Button
            onClick={handleInviteSubmit}
            variant="contained"
            disabled={isCreatingInvitation}
            startIcon={
              isCreatingInvitation ? <CircularProgress size={20} color="inherit" /> : <Email />
            }
          >
            {isCreatingInvitation ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            color: 'error.main',
          }}
        >
          <DeleteIcon color="error" />
          {menuType === 'user' ? 'Deactivate Admin User' : 'Cancel Invitation'}
        </DialogTitle>
        <DialogContent>
          {(isDeletingUser || isDeletingInvitation) && (
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
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeletingUser || isDeletingInvitation}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeletingUser || isDeletingInvitation}
            startIcon={
              isDeletingUser || isDeletingInvitation ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <DeleteIcon />
              )
            }
          >
            {isDeletingUser || isDeletingInvitation
              ? 'Deleting...'
              : menuType === 'user'
                ? 'Deactivate'
                : 'Cancel Invitation'}
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
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            color: 'info.main',
          }}
        >
          <Email color="info" />
          Email Communication Status
        </DialogTitle>
        <DialogContent>
          {selectedInvitation && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Invitation for:{' '}
                <strong>
                  {selectedInvitation.first_name} {selectedInvitation.last_name}
                </strong>{' '}
                ({selectedInvitation.email})
              </Typography>

              {(() => {
                const record = getInvitationRecord(selectedInvitation);
                if (!record) {
                  return (
                    <Alert severity="warning">
                      No email record found for this invitation. The invitation may have been
                      created before the communication system was implemented.
                    </Alert>
                  );
                }

                return (
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Stack spacing={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight="600">
                          Status:
                        </Typography>
                        <Chip
                          label={record.delivery_status}
                          size="small"
                          color={
                            record.delivery_status === 'DELIVERED'
                              ? 'success'
                              : record.delivery_status === 'FAILED'
                                ? 'error'
                                : 'warning'
                          }
                        />
                      </Box>
                      <Divider />
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="600">
                          Sent:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {record.sent_at ? new Date(record.sent_at).toLocaleString() : 'Not sent'}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="600">
                          Delivered:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {record.delivered_at
                            ? new Date(record.delivered_at).toLocaleString()
                            : 'Not delivered'}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="600">
                          Opened:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {record.is_opened
                            ? `Yes - ${new Date(record.opened_at!).toLocaleString()}`
                            : 'Not opened'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewRecordsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog
        open={permissionsDialogOpen}
        onClose={() => setPermissionsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon color="primary" />
          Edit Permissions
        </DialogTitle>
        <DialogContent sx={{ position: 'relative' }}>
          {isUpdatingPermissions && (
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
                onChange={setEditingPermissions}
                disabled={isUpdatingPermissions}
                defaultExpanded
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setPermissionsDialogOpen(false)} disabled={isUpdatingPermissions}>
            Cancel
          </Button>
          <Button
            onClick={handleSavePermissions}
            variant="contained"
            disabled={isUpdatingPermissions}
            startIcon={
              isUpdatingPermissions ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SecurityIcon />
              )
            }
          >
            {isUpdatingPermissions ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogActions>
      </Dialog>
    </ModernSettingsLayout>
  );
};
