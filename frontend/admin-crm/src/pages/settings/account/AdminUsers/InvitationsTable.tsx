import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { PersonAdd, Delete as DeleteIcon } from '@mui/icons-material';
import { ModernTable, type ModernTableColumn, type ModernTableAction } from '@/components/common';
import { ModernEmptyState } from '@/components/common/ModernEmptyState';
import type { AdminInvitation } from '@/types/settings.types';
import type { CommunicationRecord } from './types';

interface InvitationsTableProps {
  invitations: AdminInvitation[];
  canManageAdmins: boolean;
  searchQuery: string;
  onDelete: (invitation: AdminInvitation) => void;
  onViewRecords: () => void;
  getInvitationStatus: (invitation: AdminInvitation) => {
    label: string;
    color: 'success' | 'error' | 'warning';
  };
  getInvitationRecord: (invitation: AdminInvitation) => CommunicationRecord | undefined;
}

export const InvitationsTable: React.FC<InvitationsTableProps> = ({
  invitations,
  canManageAdmins,
  searchQuery,
  onDelete,
  onViewRecords,
  getInvitationStatus,
  getInvitationRecord,
}) => {
  const columns: ModernTableColumn<AdminInvitation>[] = [
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
      hideBelow: 'xl',
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
      hideBelow: 'lg',
      render: (_, invitation) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(invitation.created_at).toLocaleDateString()}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
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
              onClick={() => onViewRecords()}
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
        ) : (
          <Chip label="Queued" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        );
      },
    },
  ];

  const actions: ModernTableAction<AdminInvitation>[] = canManageAdmins
    ? [
        {
          label: 'Delete Invitation',
          icon: <DeleteIcon />,
          onClick: (invitation) => onDelete(invitation),
          color: 'error',
        },
      ]
    : [];

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={invitations as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
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
  );
};
