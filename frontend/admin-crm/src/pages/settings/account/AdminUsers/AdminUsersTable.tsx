import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import {
  AdminPanelSettings,
  Delete as DeleteIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { ModernTable, type ModernTableColumn, type ModernTableAction } from '@/components/common';
import { ModernEmptyState } from '@/components/common/ModernEmptyState';
import type { AdminUser } from '@/types/settings.types';

interface AdminUsersTableProps {
  users: AdminUser[];
  canManageAdmins: boolean;
  searchQuery: string;
  onEditPermissions: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export const AdminUsersTable: React.FC<AdminUsersTableProps> = ({
  users,
  canManageAdmins,
  searchQuery,
  onEditPermissions,
  onDelete,
}) => {
  const columns: ModernTableColumn<AdminUser>[] = [
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
      hideBelow: 'xl',
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
      hideBelow: 'lg',
      render: (_, user) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(user.date_joined).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      key: 'permission_level',
      label: 'Permission Level',
      hideBelow: 'md',
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

  const actions: ModernTableAction<AdminUser>[] = canManageAdmins
    ? [
        {
          label: 'Edit Permissions',
          icon: <SecurityIcon />,
          onClick: (user) => onEditPermissions(user),
          color: 'primary',
        },
        {
          label: 'Delete User',
          icon: <DeleteIcon />,
          onClick: (user) => onDelete(user),
          color: 'error',
        },
      ]
    : [];

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={users as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      loading={false}
      emptyState={
        <ModernEmptyState
          icon={AdminPanelSettings}
          title="No Admin Users Found"
          description={searchQuery ? `No users match "${searchQuery}"` : 'No admin users available'}
          size="medium"
          color="primary"
        />
      }
    />
  );
};
