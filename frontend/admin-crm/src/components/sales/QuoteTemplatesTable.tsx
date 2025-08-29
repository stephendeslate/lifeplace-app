// frontend/admin-crm/src/components/sales/QuoteTemplatesTable.tsx

import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import {
  Description as QuoteIcon,
  EventNote as EventIcon,
  Inventory as ProductIcon,
  AccessTime as DurationIcon,
  FileCopy as DuplicateIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { QuoteTemplateTableProps } from '../../types/sales.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState } from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common';

export const QuoteTemplatesTable: React.FC<QuoteTemplateTableProps> = ({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const getStatusChip = (isActive: boolean) => (
    <Chip
      label={isActive ? 'Active' : 'Inactive'}
      size="small"
      color={isActive ? 'success' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
    />
  );

  const getEventTypeChip = (eventTypeName?: string) => {
    if (!eventTypeName) {
      return (
        <Chip
          label="Any Event Type"
          size="small"
          variant="outlined"
          color="default"
        />
      );
    }
    
    return (
      <Chip
        icon={<EventIcon />}
        label={eventTypeName}
        size="small"
        color="primary"
        variant="outlined"
      />
    );
  };

  const getValidityChip = (days: number) => (
    <Chip
      icon={<DurationIcon />}
      label={`${days} days`}
      size="small"
      color="info"
      variant="outlined"
    />
  );

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Template Name',
      sortable: true,
      render: (_, template: any) => (
        <Box display="flex" alignItems="center" gap={1}>
          <QuoteIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" fontWeight="medium">
              {template.name}
            </Typography>
            {template.introduction && (
              <Typography variant="caption" color="text.secondary">
                {template.introduction.length > 60 
                  ? `${template.introduction.substring(0, 60)}...` 
                  : template.introduction}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      key: 'event_type',
      label: 'Event Type',
      render: (_, template: any) => getEventTypeChip(template.event_type_name),
    },
    {
      key: 'products',
      label: 'Products',
      align: 'center',
      render: (_, template: any) => (
        <Tooltip title={`${template.products?.length || 0} products in this template`}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
            <ProductIcon fontSize="small" color="action" />
            <Typography variant="body2" fontWeight="medium">
              {template.products?.length || 0}
            </Typography>
          </Box>
        </Tooltip>
      ),
    },
    {
      key: 'validity',
      label: 'Validity',
      align: 'center',
      render: (_, template: any) => getValidityChip(template.default_validity_days),
    },
    {
      key: 'options',
      label: 'Options',
      render: (_, template: any) => (
        <Chip
          label={template.has_multiple_options ? 'Multiple Options' : 'Single Option'}
          size="small"
          color={template.has_multiple_options ? 'secondary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, template: any) => getStatusChip(template.is_active),
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      render: (_, template: any) => (
        <Box>
          <Typography variant="body2" color="text.secondary">
            {new Date(template.updated_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(template.updated_at).toLocaleTimeString()}
          </Typography>
        </Box>
      ),
    },
  ];

  // Custom actions to include duplicate functionality
  const actions: ModernTableAction[] = [
    {
      label: 'Edit Template',
      icon: <EditIcon fontSize="small" />,
      onClick: onEdit,
    },
    ...(onDuplicate ? [{
      label: 'Duplicate Template',
      icon: <DuplicateIcon fontSize="small" />,
      onClick: onDuplicate,
    }] : []),
    {
      label: 'Delete Template',
      icon: <DeleteIcon fontSize="small" />,
      onClick: onDelete,
      color: 'error' as const,
    },
  ];

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (templates.length === 0) {
    return (
      <ModernEmptyState
        icon={QuoteIcon}
        title="No quote templates found"
        description="Create your first quote template to streamline your sales process"
        tip={{ text: "Quote templates help you create consistent, professional proposals quickly", type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns}
      data={templates}
      actions={actions}
      onRowClick={onEdit}
      sortBy="name"
      sortOrder="asc"
    />
  );
};