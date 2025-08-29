// frontend/admin-crm/src/components/payments/PaymentGatewayTable.tsx

import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Payment as PaymentIcon } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { PaymentGateway } from '../../types/payments.types';
import ModernLoadingStates from '../common/ModernLoadingStates';
import { ModernEmptyState } from '../common/ModernEmptyState';
import ModernTable, { createStandardActions } from '../common/ModernTable';
import type { ModernTableColumn } from '../common/ModernTable';
import { tokens } from '../../design-system/tokens';

interface PaymentGatewayTableProps {
  gateways: PaymentGateway[];
  isLoading: boolean;
  onEdit: (gateway: PaymentGateway) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

export const PaymentGatewayTable: React.FC<PaymentGatewayTableProps> = ({
  gateways,
  isLoading,
  onEdit,
  onDelete,
}) => {
  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, gateway: PaymentGateway) => (
        <Box display="flex" alignItems="center" gap={1}>
          <PaymentIcon color="primary" fontSize="small" />
          <Typography variant="body2" fontWeight="medium">
            {gateway.name}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      render: (_, gateway: PaymentGateway) => (
        <Typography 
          variant="body2" 
          fontFamily="monospace"
          sx={{
            background: tokens.color.neutral[100],
            px: 1,
            py: 0.5,
            borderRadius: tokens.spacing.radius.sm,
            fontSize: '0.75rem',
          }}
        >
          {gateway.code}
        </Typography>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, gateway: PaymentGateway) => (
        <Chip
          label={gateway.is_active ? 'Active' : 'Inactive'}
          color={gateway.is_active ? 'success' : 'default'}
          size="small"
          variant={gateway.is_active ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (_, gateway: PaymentGateway) => (
        <Typography variant="body2" color="text.secondary">
          {gateway.description || 'No description'}
        </Typography>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (_, gateway: PaymentGateway) => (
        <Tooltip title={new Date(gateway.created_at).toLocaleString()}>
          <Typography variant="body2" color="text.secondary">
            {formatDistanceToNow(new Date(gateway.created_at), { addSuffix: true })}
          </Typography>
        </Tooltip>
      ),
    },
  ];

  const actions = onDelete ? createStandardActions(
    (gateway: PaymentGateway) => onEdit(gateway),
    (gateway: PaymentGateway) => onDelete!(gateway.id),
    {
      editLabel: 'Edit Gateway',
      deleteLabel: 'Delete Gateway',
    }
  ) : [];

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (gateways.length === 0) {
    return (
      <ModernEmptyState
        icon={PaymentIcon}
        title="No payment gateways configured"
        description="Add a payment gateway to start processing payments"
        tip={{ text: "Start with Stripe for quick setup and add PayMongo for Philippine payments", type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns}
      data={gateways}
      actions={actions}
      onRowClick={onEdit}
      sortBy="name"
      sortOrder="asc"
    />
  );
};