// frontend/admin-crm/src/components/products/DiscountsTable.tsx

import React from 'react';
import {
  Chip,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as ValidIcon,
  Cancel as InvalidIcon,
  Code as CodeIcon,
  AutoAwesome as AutoIcon,
  AdminPanelSettings as AdminIcon,
  LocalOffer as DiscountIcon,
} from '@mui/icons-material';
import type { Discount } from '../../types/products.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState, createStandardActions } from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common';

interface DiscountsTableProps {
  discounts: Discount[];
  isLoading: boolean;
  onEdit: (discount: Discount) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export const DiscountsTable: React.FC<DiscountsTableProps> = ({
  discounts,
  isLoading,
  onEdit,
  onDelete,
}) => {

  const getStatusChip = (isValid: boolean, isActive: boolean) => {
    if (!isActive) {
      return (
        <Chip
          label="Inactive"
          size="small"
          color="default"
          variant="outlined"
        />
      );
    }
    
    return (
      <Chip
        icon={isValid ? <ValidIcon /> : <InvalidIcon />}
        label={isValid ? 'Valid' : 'Invalid'}
        size="small"
        color={isValid ? 'success' : 'error'}
        variant="filled"
      />
    );
  };

  const getTypeChip = (discountType: string) => {
    const colors = {
      PERCENTAGE: 'primary',
      FIXED: 'secondary',
      FREE_HOURS: 'warning',
    } as const;

    return (
      <Chip
        label={discountType.replace('_', ' ')}
        size="small"
        color={colors[discountType as keyof typeof colors] || 'default'}
        variant="outlined"
      />
    );
  };

  const getApplicationIcon = (applicationType: string) => {
    switch (applicationType) {
      case 'CODE_REQUIRED':
        return <CodeIcon fontSize="small" />;
      case 'AUTOMATIC':
        return <AutoIcon fontSize="small" />;
      case 'ADMIN_ONLY':
        return <AdminIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const formatValue = (discount: Discount) => {
    const value = parseFloat(discount.value);
    
    switch (discount.discount_type) {
      case 'PERCENTAGE':
        return `${value}%`;
      case 'FIXED':
        return `${discount.currency || 'PHP'} ${value.toLocaleString()}`;
      case 'FREE_HOURS':
        return `${value} hours`;
      default:
        return discount.value;
    }
  };

  const getUsageProgress = (discount: Discount) => {
    if (!discount.max_uses) {
      return (
        <Typography variant="body2" color="text.secondary">
          {discount.current_uses} uses
        </Typography>
      );
    }
    
    const percentage = (discount.current_uses / discount.max_uses) * 100;
    
    return (
      <Box sx={{ minWidth: 100 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <LinearProgress
            variant="determinate"
            value={Math.min(percentage, 100)}
            sx={{ flex: 1, height: 6, borderRadius: 3 }}
            color={percentage >= 90 ? 'error' : percentage >= 70 ? 'warning' : 'primary'}
          />
          <Typography variant="caption" color="text.secondary">
            {discount.current_uses}/{discount.max_uses}
          </Typography>
        </Box>
      </Box>
    );
  };

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Name & Code',
      sortable: true,
      render: (_, row) => {
        const discount = row as unknown as Discount;
        return (
          <Box>
            <Typography variant="subtitle2" fontWeight="medium">
              {discount.name}
            </Typography>
            {discount.code && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <CodeIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {discount.code}
                </Typography>
              </Box>
            )}
          </Box>
        );
      },
    },
    {
      key: 'discount_type',
      label: 'Type',
      render: (_, row) => {
        const discount = row as unknown as Discount;
        return getTypeChip(discount.discount_type);
      },
    },
    {
      key: 'value',
      label: 'Value',
      render: (_, row) => {
        const discount = row as unknown as Discount;
        return (
          <Typography variant="body2" fontWeight="medium">
            {formatValue(discount)}
          </Typography>
        );
      },
    },
    {
      key: 'application_type',
      label: 'Application',
      render: (_, row) => {
        const discount = row as unknown as Discount;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            {getApplicationIcon(discount.application_type)}
            <Typography variant="body2">
              {discount.application_type_display}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'valid_period',
      label: 'Valid Period',
      render: (_, row) => {
        const discount = row as unknown as Discount;
        return (
          <Box>
            <Typography variant="body2">
              {new Date(discount.valid_from).toLocaleDateString()}
            </Typography>
            {discount.valid_until && (
              <Typography variant="caption" color="text.secondary">
                to {new Date(discount.valid_until).toLocaleDateString()}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (_, row) => {
        const discount = row as unknown as Discount;
        return getUsageProgress(discount);
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        const discount = row as unknown as Discount;
        return getStatusChip(discount.is_valid_now, discount.is_active);
      },
    },
  ];

  const actions = createStandardActions(
    (discount: Discount) => onEdit(discount),
    (discount: Discount) => onDelete(discount.id),
    {
      editLabel: 'Edit Discount',
      deleteLabel: 'Delete Discount',
    }
  );

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (discounts.length === 0) {
    return (
      <ModernEmptyState
        icon={DiscountIcon}
        title="No discounts found"
        description="Create your first discount to offer special pricing to clients"
        tip={{ text: "Start with percentage discounts for common promotions", type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={discounts as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      onRowClick={(row) => onEdit(row as unknown as Discount)}
      sortBy="name"
      sortOrder="asc"
    />
  );
};