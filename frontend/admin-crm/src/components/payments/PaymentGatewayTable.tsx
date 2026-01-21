// frontend/admin-crm/src/components/payments/PaymentGatewayTable.tsx

import React from 'react';
import { Box, Typography, Chip, Tooltip, Stack } from '@mui/material';
import {
  Payment as PaymentIcon,
  CheckCircle as HealthyIcon,
  Warning as DegradedIcon,
  Error as UnhealthyIcon,
  HelpOutline as UnknownIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { PaymentGateway, GatewayHealth } from '../../types/payments.types';
import {
  getGatewayPaymentMethods,
  getHealthStatusLabel
} from '../../types/payments.types';
import ModernLoadingStates from '../common/ModernLoadingStates';
import { ModernEmptyState } from '../common/ModernEmptyState';
import ModernTable, { createStandardActions } from '../common/ModernTable';
import type { ModernTableColumn, ModernTableAction } from '../common/ModernTable';

// Health status icon mapping
const HealthStatusIcon: React.FC<{ status: GatewayHealth['status'] }> = ({ status }) => {
  switch (status) {
    case 'healthy': return <HealthyIcon fontSize="small" color="success" />;
    case 'degraded': return <DegradedIcon fontSize="small" color="warning" />;
    case 'unhealthy': return <UnhealthyIcon fontSize="small" color="error" />;
    default: return <UnknownIcon fontSize="small" color="disabled" />;
  }
};

interface PaymentGatewayTableProps {
  gateways: PaymentGateway[];
  isLoading: boolean;
  onEdit: (gateway: PaymentGateway) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
  healthData?: Record<number, GatewayHealth>;
}

export const PaymentGatewayTable: React.FC<PaymentGatewayTableProps> = ({
  gateways,
  isLoading,
  onEdit,
  onDelete,
  healthData,
}) => {
  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Gateway',
      sortable: true,
      render: (_, row) => {
        const gateway = row as unknown as PaymentGateway;
        const health = healthData?.[gateway.id];
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <PaymentIcon color="primary" fontSize="small" />
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {gateway.name}
              </Typography>
              <Typography
                variant="caption"
                fontFamily="monospace"
                color="text.secondary"
              >
                {gateway.code}
              </Typography>
            </Box>
            {health && (
              <Tooltip title={`${getHealthStatusLabel(health.status)}${health.error_message ? `: ${health.error_message}` : ''}`}>
                <Box sx={{ ml: 1 }}>
                  <HealthStatusIcon status={health.status} />
                </Box>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      key: 'payment_methods',
      label: 'Payment Methods',
      render: (_, row) => {
        const gateway = row as unknown as PaymentGateway;
        const methods = getGatewayPaymentMethods(gateway.code);

        if (methods.length === 0) {
          return (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              Custom gateway
            </Typography>
          );
        }

        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {methods.slice(0, 4).map((method) => (
              <Tooltip key={method.code} title={method.description}>
                <Chip
                  label={method.icon.length <= 2 ? `${method.icon} ${method.name}` : method.name}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.7rem',
                    height: 24,
                    '& .MuiChip-label': { px: 1 }
                  }}
                />
              </Tooltip>
            ))}
            {methods.length > 4 && (
              <Tooltip title={methods.slice(4).map(m => m.name).join(', ')}>
                <Chip
                  label={`+${methods.length - 4}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 24 }}
                />
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, row) => {
        const gateway = row as unknown as PaymentGateway;
        const health = healthData?.[gateway.id];
        const isConfigured = gateway.masked_config?._configured;

        return (
          <Stack direction="column" spacing={0.5}>
            <Chip
              label={gateway.is_active ? 'Active' : 'Inactive'}
              color={gateway.is_active ? 'success' : 'default'}
              size="small"
              variant={gateway.is_active ? 'filled' : 'outlined'}
            />
            {gateway.is_active && !isConfigured && (
              <Chip
                label="Not Configured"
                color="warning"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
            )}
            {health && health.test_mode && (
              <Chip
                label="Test Mode"
                color="info"
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
            )}
          </Stack>
        );
      },
    },
    {
      key: 'description',
      label: 'Description',
      render: (_, row) => {
        const gateway = row as unknown as PaymentGateway;
        return (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }} noWrap>
            {gateway.description || 'No description'}
          </Typography>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (_, row) => {
        const gateway = row as unknown as PaymentGateway;
        return (
          <Tooltip title={new Date(gateway.created_at).toLocaleString()}>
            <Typography variant="body2" color="text.secondary">
              {formatDistanceToNow(new Date(gateway.created_at), { addSuffix: true })}
            </Typography>
          </Tooltip>
        );
      },
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
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={gateways as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      onRowClick={(row) => onEdit(row as unknown as PaymentGateway)}
      sortBy="name"
      sortOrder="asc"
    />
  );
};