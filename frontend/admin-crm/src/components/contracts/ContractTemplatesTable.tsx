// frontend/admin-crm/src/components/contracts/ContractTemplatesTable.tsx

import React from 'react';
import {
  Typography,
  Box,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as ContractIcon,
  FileCopy as DuplicateIcon,
  EventNote as EventIcon,
  Gavel as SignatureIcon,
  EditNote as AmendmentIcon,
} from '@mui/icons-material';
import type { ContractTemplate } from '../../types/contracts.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState } from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common';

interface ContractTemplateTableProps {
  templates: ContractTemplate[];
  isLoading: boolean;
  onEdit: (template: ContractTemplate) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (template: ContractTemplate) => void;
  isDeleting: boolean;
}

export const ContractTemplatesTable: React.FC<ContractTemplateTableProps> = ({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
  isDeleting,
}) => {
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

  const getSignatureChip = (requiresSignature: boolean) => (
    <Chip
      icon={<SignatureIcon />}
      label={requiresSignature ? 'Required' : 'Not Required'}
      size="small"
      color={requiresSignature ? 'success' : 'default'}
      variant={requiresSignature ? 'filled' : 'outlined'}
    />
  );

  const getAmendmentChip = (allowsAmendments: boolean) => (
    <Chip
      icon={<AmendmentIcon />}
      label={allowsAmendments ? 'Allowed' : 'Not Allowed'}
      size="small"
      color={allowsAmendments ? 'info' : 'default'}
      variant={allowsAmendments ? 'filled' : 'outlined'}
    />
  );

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Template Name',
      sortable: true,
      render: (_, row) => {
        const template = row as unknown as ContractTemplate;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <ContractIcon color="primary" />
            <Box>
              <Typography variant="subtitle2" fontWeight="medium">
                {template.name}
              </Typography>
              {template.description && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {template.description}
                </Typography>
              )}
            </Box>
          </Box>
        );
      }
    },
    {
      key: 'event_type',
      label: 'Event Type',
      render: (_, row) => {
        const template = row as unknown as ContractTemplate;
        return getEventTypeChip(template.event_type_name);
      },
    },
    {
      key: 'signature_requirements',
      label: 'Signature',
      align: 'center',
      render: (_, row) => {
        const template = row as unknown as ContractTemplate;
        return getSignatureChip(template.requires_signature);
      },
    },
    {
      key: 'amendments',
      label: 'Amendments',
      align: 'center',
      render: (_, row) => {
        const template = row as unknown as ContractTemplate;
        return getAmendmentChip(template.allows_amendments);
      },
    },
    {
      key: 'variables',
      label: 'Variables',
      align: 'center',
      render: (_, row) => {
        const template = row as unknown as ContractTemplate;
        const variableCount = template.variables?.length || 0;
        return (
          <Tooltip title={variableCount > 0 ? `Variables: ${template.variables?.join(', ')}` : 'No variables'}>
            <Chip
              label={`${variableCount} variables`}
              size="small"
              color={variableCount > 0 ? 'secondary' : 'default'}
              variant={variableCount > 0 ? 'outlined' : 'filled'}
            />
          </Tooltip>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (_, row) => {
        const template = row as unknown as ContractTemplate;
        const date = new Date(template.created_at);
        return (
          <Typography variant="body2" color="text.secondary">
            {date.toLocaleDateString()}
          </Typography>
        );
      },
    },
  ];

  const actions: ModernTableAction[] = [
    {
      label: 'Edit',
      icon: <EditIcon />,
      onClick: (row: Record<string, unknown>) => onEdit(row as unknown as ContractTemplate),
      color: 'primary',
    },
    {
      label: 'Duplicate',
      icon: <DuplicateIcon />,
      onClick: (row: Record<string, unknown>) => onDuplicate && onDuplicate(row as unknown as ContractTemplate),
      color: 'secondary',
      show: () => !!onDuplicate,
    },
    {
      label: 'Delete',
      icon: <DeleteIcon />,
      onClick: (row) => onDelete((row as { id: number }).id),
      color: 'error',
    },
  ];

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (templates.length === 0) {
    return (
      <ModernEmptyState
        icon={ContractIcon}
        title="No Contract Templates"
        description="No contract templates match your current filters."
        size="small"
      />
    );
  }

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={templates as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      loading={isDeleting}
    />
  );
};