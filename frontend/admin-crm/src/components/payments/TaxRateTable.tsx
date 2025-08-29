// frontend/admin-crm/src/components/payments/TaxRateTable.tsx

import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Percent as TaxIcon, Star as StarIcon } from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import type { TaxRate } from '../../types/payments.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState, createStandardActions } from '../common';
import type { ModernTableColumn } from '../common';
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
      render: (_, taxRate: TaxRate) => (
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
      ),
    },
    {
      key: 'rate',
      label: 'Rate',
      render: (_, taxRate: TaxRate) => (
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
      ),
    },
    {
      key: 'region',
      label: 'Region',
      render: (_, taxRate: TaxRate) => (
        <Typography variant="body2" color="text.secondary">
          {taxRate.region || 'Global'}
        </Typography>
      ),
    },
    {
      key: 'is_default',
      label: 'Default',
      render: (_, taxRate: TaxRate) => (
        taxRate.is_default ? (
          <Chip
            label="Default"
            color="warning"
            size="small"
            icon={<StarIcon />}
            variant="filled"
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (_, taxRate: TaxRate) => (
        <Tooltip title={new Date(taxRate.created_at).toLocaleString()}>
          <Typography variant="body2" color="text.secondary">
            {formatDistanceToNow(new Date(taxRate.created_at), { addSuffix: true })}
          </Typography>
        </Tooltip>
      ),
    },
  ];

  const actions = onDelete ? createStandardActions(
    (taxRate: TaxRate) => onEdit(taxRate),
    (taxRate: TaxRate) => onDelete!(taxRate.id),
    {
      editLabel: 'Edit Tax Rate',
      deleteLabel: 'Delete Tax Rate',
    }
  ) : [];

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (taxRates.length === 0) {
    return (
      <ModernEmptyState
        icon={TaxIcon}
        title="No tax rates configured"
        description="Add tax rates to apply them to invoices and quotes"
        tip={{ text: "Configure different tax rates for various regions and set a default rate", type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns}
      data={taxRates}
      actions={actions}
      onRowClick={onEdit}
      sortBy="name"
      sortOrder="asc"
    />
  );
};