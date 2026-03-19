import React from 'react';
import { Box, TextField, InputAdornment, Typography, CircularProgress, Alert } from '@mui/material';
import { AdminPanelSettings, Email, PersonAdd, Search as SearchIcon } from '@mui/icons-material';
import { ModernSettingsLayout } from '@/components/common/ModernPageLayout';
import {
  ModernPageHeader,
  type HeaderAction,
  createRefreshAction,
  createAddAction,
} from '@/components/common/ModernPageHeader';
import { ModernEmptyState } from '@/components/common/ModernEmptyState';
import { useAdminUsersPage } from './useAdminUsersPage';
import { AdminUsersTable } from './AdminUsersTable';
import { InvitationsTable } from './InvitationsTable';
import { InviteDialog } from './InviteDialog';
import { DeleteDialog } from './DeleteDialog';
import { PermissionsDialog } from './PermissionsDialog';
import { CommunicationRecordsDialog } from './CommunicationRecordsDialog';

export const AdminUsers: React.FC = () => {
  const {
    inviteDialogOpen,
    deleteDialogOpen,
    viewRecordsDialogOpen,
    permissionsDialogOpen,
    selectedUser,
    selectedInvitation,
    menuType,
    searchQuery,
    showSearchField,
    editingPermissions,
    inviteForm,
    canManageAdmins,
    isLoading,
    totalUsers,
    filteredAdminUsers,
    filteredInvitations,
    adminUsers,
    invitations,
    communicationRecords,
    isCreatingInvitation,
    isDeletingUser,
    isDeletingInvitation,
    isUpdatingPermissions,
    handleSearch,
    handleCreateNew,
    handleRefresh,
    handleToggleSearch,
    handleInviteSubmit,
    handleEditPermissionsClick,
    handleSavePermissions,
    handleDeleteClick,
    handleViewRecordsClick,
    handleDeleteConfirm,
    getInvitationStatus,
    getInvitationRecord,
    setInviteDialogOpen,
    setDeleteDialogOpen,
    setViewRecordsDialogOpen,
    setPermissionsDialogOpen,
    setInviteForm,
    setEditingPermissions,
  } = useAdminUsersPage();

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
                  sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <AdminPanelSettings color="success" sx={{ fontSize: '1rem' }} />
                  Active Administrators ({filteredAdminUsers.length})
                </Typography>
                <AdminUsersTable
                  users={filteredAdminUsers}
                  canManageAdmins={canManageAdmins}
                  searchQuery={searchQuery}
                  onEditPermissions={handleEditPermissionsClick}
                  onDelete={(user) => handleDeleteClick('user', user)}
                />
              </Box>
            )}

            {/* Pending Invitations */}
            {filteredInvitations.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight="600"
                  sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <PersonAdd color="warning" sx={{ fontSize: '1rem' }} />
                  Pending Invitations ({filteredInvitations.length})
                </Typography>
                <InvitationsTable
                  invitations={filteredInvitations}
                  canManageAdmins={canManageAdmins}
                  searchQuery={searchQuery}
                  onDelete={(invitation) => handleDeleteClick('invitation', invitation)}
                  onViewRecords={handleViewRecordsClick}
                  getInvitationStatus={getInvitationStatus}
                  getInvitationRecord={getInvitationRecord}
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

      {/* Dialogs */}
      <InviteDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        inviteForm={inviteForm}
        onFormChange={setInviteForm}
        onSubmit={handleInviteSubmit}
        isCreating={isCreatingInvitation}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        menuType={menuType}
        selectedUser={selectedUser}
        selectedInvitation={selectedInvitation}
        isDeleting={isDeletingUser || isDeletingInvitation}
      />

      <CommunicationRecordsDialog
        open={viewRecordsDialogOpen}
        onClose={() => setViewRecordsDialogOpen(false)}
        selectedInvitation={selectedInvitation}
        getInvitationRecord={getInvitationRecord}
      />

      <PermissionsDialog
        open={permissionsDialogOpen}
        onClose={() => setPermissionsDialogOpen(false)}
        onSave={handleSavePermissions}
        selectedUser={selectedUser}
        editingPermissions={editingPermissions}
        onPermissionsChange={setEditingPermissions}
        isUpdating={isUpdatingPermissions}
      />
    </ModernSettingsLayout>
  );
};
