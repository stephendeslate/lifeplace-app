// frontend/admin-crm/src/components/contracts/ContractAmendmentsTable.tsx

import React from 'react';
import { Box, Chip, Typography, Stack, IconButton, Tooltip, CircularProgress } from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ModernTable } from '../common/ModernTable';
import type { ModernTableColumn } from '../common/ModernTable';
import type { ContractAmendment, AmendmentStatus } from '../../types/contracts.types';
import { AMENDMENT_STATUSES } from '../../types/contracts.types';
import { tokens } from '../../design-system/tokens';

interface ContractAmendmentsTableProps {
  amendments: ContractAmendment[];
  isLoading: boolean;
  onApprove: (amendment: ContractAmendment) => void;
  onReject: (amendment: ContractAmendment) => void;
  onView: (amendment: ContractAmendment) => void;
}

const getStatusColor = (
  status: AmendmentStatus,
): 'warning' | 'info' | 'success' | 'error' | 'default' => {
  switch (status) {
    case 'REQUESTED':
      return 'warning';
    case 'DRAFT':
    case 'SENT_FOR_REVIEW':
      return 'info';
    case 'APPROVED':
    case 'SIGNED':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
};

export const ContractAmendmentsTable: React.FC<ContractAmendmentsTableProps> = ({
  amendments,
  isLoading,
  onApprove,
  onReject,
  onView,
}) => {
  const columns: ModernTableColumn<ContractAmendment>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (_, row) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          #{row.id}
        </Typography>
      ),
    },
    {
      key: 'amendment_reason',
      label: 'Reason',
      render: (_, row) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.amendment_reason.length > 50
              ? `${row.amendment_reason.substring(0, 50)}...`
              : row.amendment_reason}
          </Typography>
          {row.requested_by_details && (
            <Typography variant="caption" color="text.secondary">
              By {row.requested_by_details.first_name} {row.requested_by_details.last_name}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => (
        <Chip
          label={AMENDMENT_STATUSES.find((s) => s.value === row.status)?.label || row.status}
          size="small"
          color={getStatusColor(row.status)}
        />
      ),
    },
    {
      key: 'value_change',
      label: 'Value Change',
      hideBelow: 'lg',
      align: 'right',
      render: (_, row) => {
        if (!row.value_change) return <Typography variant="body2">-</Typography>;
        const change = parseFloat(row.value_change);
        return (
          <Typography
            variant="body2"
            sx={{
              color: change >= 0 ? tokens.color.success[600] : tokens.color.error[600],
              fontWeight: 500,
            }}
          >
            {change >= 0 ? '+' : ''}
            {row.value_change}
          </Typography>
        );
      },
    },
    {
      key: 'requested_at',
      label: 'Requested',
      hideBelow: 'md',
      render: (_, row) => (
        <Typography variant="body2">
          {format(new Date(row.requested_at), 'MMM dd, yyyy')}
        </Typography>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="View Details">
            <IconButton size="small" onClick={() => onView(row)}>
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {row.status === 'REQUESTED' && (
            <>
              <Tooltip title="Approve">
                <IconButton size="small" color="success" onClick={() => onApprove(row)}>
                  <ApproveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton size="small" color="error" onClick={() => onReject(row)}>
                  <RejectIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const emptyState = (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        bgcolor: tokens.color.neutral[50],
        borderRadius: tokens.spacing.radius.lg,
      }}
    >
      <Typography variant="body1" color="text.secondary">
        No amendments found for this contract.
      </Typography>
    </Box>
  );

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={amendments as unknown as Record<string, unknown>[]}
      loading={isLoading}
      emptyState={emptyState}
    />
  );
};

export default ContractAmendmentsTable;
