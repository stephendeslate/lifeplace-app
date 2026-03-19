import { useState, useEffect } from 'react';
import { useLayout } from '@/contexts/LayoutContext';
import { useAdminUsers, useAdminPermissions } from '@/hooks/useSettings';
import { useCommunications } from '@/hooks/useCommunications';
import { usePermissions } from '@/hooks/usePermissions';
import type { AdminPermissions } from '@/types/permissions.types';
import { FULL_ADMIN_PERMISSIONS } from '@/types/permissions.types';
import type { InviteAdminFormData, AdminUser, AdminInvitation } from '@/types/settings.types';

export function useAdminUsersPage() {
  const { setBreadcrumbs } = useLayout();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewRecordsDialogOpen, setViewRecordsDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<AdminInvitation | null>(null);
  const [menuType, setMenuType] = useState<'user' | 'invitation'>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchField, setShowSearchField] = useState(false);

  const [editingPermissions, setEditingPermissions] =
    useState<AdminPermissions>(FULL_ADMIN_PERMISSIONS);

  const [inviteForm, setInviteForm] = useState<InviteAdminFormData>({
    email: '',
    first_name: '',
    last_name: '',
    permissions: FULL_ADMIN_PERMISSIONS,
  });

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

  const { updatePermissions, isUpdatingPermissions } = useAdminPermissions();
  const { useRecords } = useCommunications();
  const { data: communicationRecords } = useRecords({ template_name: 'Admin Invitation' });

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Account Management' },
      { label: 'Admin Users' },
    ]);
  }, [setBreadcrumbs]);

  const handleSearch = (query: string) => setSearchQuery(query);
  const handleCreateNew = () => setInviteDialogOpen(true);
  const handleRefresh = () => window.location.reload();

  const handleToggleSearch = () => {
    setShowSearchField(!showSearchField);
    if (!showSearchField) setSearchQuery('');
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

  const handleViewRecordsClick = () => setViewRecordsDialogOpen(true);

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
    if (invitation.is_accepted) return { label: 'Accepted', color: 'success' as const };
    if (now > expiresAt) return { label: 'Expired', color: 'error' as const };
    return { label: 'Pending', color: 'warning' as const };
  };

  const getInvitationRecord = (invitation: AdminInvitation) => {
    return communicationRecords?.find(
      (record) =>
        record.recipient === invitation.email && record.template_name === 'Admin Invitation',
    );
  };

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
  const totalUsers = adminUsers.length + invitations.length;

  return {
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
  };
}
