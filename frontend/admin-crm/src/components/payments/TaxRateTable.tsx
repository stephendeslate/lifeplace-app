// frontend/admin-crm/src/components/payments/TaxRateTable.tsx

import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Percent as TaxIcon, Star as StarIcon } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { TaxRate } from '../../types/payments';
import {
  ModernTable,
  ModernLoadingStates,
  ModernEmptyState,
  createStandardActions,
} from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common';
import { tokens } from '../../design-system/tokens';

interface TaxRateTableProps {
  taxRates: TaxRate[];
  isLoading: boolean;
  onEdit: (taxRate: TaxRate) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

export const TaxRateTable: React.FC<TaxRateTableProps> = ({
  taxRates,
  isLoading,
  onEdit,
  onDelete,
}) => {
  const formatTaxRate = (rate: string) => {
    const numRate = parseFloat(rate);
    return `${numRate.toFixed(2)}%`;
  };

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, row) => {
        const taxRate = row as unknown as TaxRate;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <TaxIcon color="primary" fontSize="small" />
            <Typography variant="body2" fontWeight="medium">
              {taxRate.name}
            </Typography>
            {taxRate.is_default && (
              <Tooltip title="Default tax rate">
                <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      key: 'rate',
      label: 'Rate',
      render: (_, row) => {
        const taxRate = row as unknown as TaxRate;
        return (
          <Typography
            variant="body2"
            fontWeight="medium"
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.success[50]} 0%, ${tokens.color.success[100]} 100%)`,
              px: 1,
              py: 0.5,
              borderRadius: tokens.spacing.radius.sm,
              fontSize: '0.875rem',
              display: 'inline-block',
            }}
          >
            {formatTaxRate(taxRate.rate)}
          </Typography>
        );
      },
    },
    {
      key: 'region',
      label: 'Region',
      hideBelow: 'md',
      render: (_, row) => {
        const taxRate = row as unknown as TaxRate;
        return (
          <Typography variant="body2" color="text.secondary">
            {taxRate.region || 'Global'}
          </Typography>
        );
      },
    },
    {
      key: 'is_default',
      label: 'Default',
      hideBelow: 'lg',
      render: (_, row) => {
        const taxRate = row as unknown as TaxRate;
        return taxRate.is_default ? (
          <Chip label="Default" color="warning" size="small" icon={<StarIcon />} variant="filled" />
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      hideBelow: 'lg',
      render: (_, row) => {
        const taxRate = row as unknown as TaxRate;
        return (
          <Tooltip title={new Date(taxRate.created_at).toLocaleString()}>
            <Typography variant="body2" color="text.secondary">
              {formatDistanceToNow(new Date(taxRate.created_at), {
                addSuffix: true,
              })}
            </Typography>
          </Tooltip>
        );
      },
    },
  ];

  const actions = onDelete
    ? createStandardActions(
        (taxRate: TaxRate) => onEdit(taxRate),
        (taxRate: TaxRate) => onDelete!(taxRate.id),
        {
          editLabel: 'Edit Tax Rate',
          deleteLabel: 'Delete Tax Rate',
        },
      )
    : [];

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (taxRates.length === 0) {
    return (
      <ModernEmptyState
        icon={TaxIcon}
        title="No tax rates configured"
        description="Add tax rates to apply them to invoices and quotes"
        tip={{
          text: 'Configure different tax rates for various regions and set a default rate',
          type: 'info',
        }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={taxRates as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      onRowClick={(row) => onEdit(row as unknown as TaxRate)}
      sortBy="name"
      sortOrder="asc"
    />
  );
};
