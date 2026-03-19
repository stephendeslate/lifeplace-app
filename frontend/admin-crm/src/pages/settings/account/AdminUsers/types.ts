import type { AdminUser, AdminInvitation, InviteAdminFormData } from '@/types/settings.types';
import type { AdminPermissions } from '@/types/permissions.types';
import type { CommunicationRecord } from '@/types/communications.types';

export interface UseAdminUsersPageReturn {
  // State
  inviteDialogOpen: boolean;
  deleteDialogOpen: boolean;
  viewRecordsDialogOpen: boolean;
  permissionsDialogOpen: boolean;
  selectedUser: AdminUser | null;
  selectedInvitation: AdminInvitation | null;
  menuType: 'user' | 'invitation';
  searchQuery: string;
  showSearchField: boolean;
  editingPermissions: AdminPermissions;
  inviteForm: InviteAdminFormData;
  canManageAdmins: boolean;
  isLoading: boolean;
  totalUsers: number;

  // Data
  filteredAdminUsers: AdminUser[];
  filteredInvitations: AdminInvitation[];
  adminUsers: AdminUser[];
  invitations: AdminInvitation[];
  communicationRecords: CommunicationRecord[] | undefined;

  // Loading states
  isCreatingInvitation: boolean;
  isDeletingUser: boolean;
  isDeletingInvitation: boolean;
  isUpdatingPermissions: boolean;

  // Handlers
  handleSearch: (query: string) => void;
  handleCreateNew: () => void;
  handleRefresh: () => void;
  handleToggleSearch: () => void;
  handleInviteSubmit: (e: React.FormEvent) => void;
  handleEditPermissionsClick: (user: AdminUser) => void;
  handleSavePermissions: () => void;
  handleDeleteClick: (type: 'user' | 'invitation', item: AdminUser | AdminInvitation) => void;
  handleViewRecordsClick: () => void;
  handleDeleteConfirm: () => void;
  getInvitationStatus: (invitation: AdminInvitation) => {
    label: string;
    color: 'success' | 'error' | 'warning';
  };
  getInvitationRecord: (invitation: AdminInvitation) => CommunicationRecord | undefined;

  // Form setters
  setInviteDialogOpen: (open: boolean) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setViewRecordsDialogOpen: (open: boolean) => void;
  setPermissionsDialogOpen: (open: boolean) => void;
  setInviteForm: React.Dispatch<React.SetStateAction<InviteAdminFormData>>;
  setEditingPermissions: React.Dispatch<React.SetStateAction<AdminPermissions>>;
}

export type { CommunicationRecord };
