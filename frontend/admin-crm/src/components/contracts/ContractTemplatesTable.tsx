// frontend/admin-crm/src/components/contracts/ContractTemplatesTable.tsx

import React from 'react';
import {
  Chip,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as ContractIcon,
  EventNote as EventIcon,
  Gavel as SignatureIcon,
  Business as CompanyIcon,
  VisibilityOff as WitnessIcon,
  FileCopy as DuplicateIcon,
} from '@mui/icons-material';
import type { ContractTemplateTableProps, ContractTemplate } from '../../types/contracts.types';
import { ModernTable, ModernEmptyState, type ModernTableColumn, type ModernTableAction } from '../common';

export const ContractTemplatesTable: React.FC<ContractTemplateTableProps> = ({
  templates,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
}) => {

  const getRequirementChips = (template: ContractTemplate) => {
    const chips: React.ReactElement[] = [];
    
    if (template.requires_signature) {
      chips.push(
        <Chip
          key="signature"
          icon={<SignatureIcon />}
          label="Signature Required"
          size="small"
          color="primary"
          variant="outlined"
        />
      );
    }

    if (template.requires_company_signature) {
      chips.push(
        <Chip
          key="company"
          icon={<CompanyIcon />}
          label="Company Signature"
          size="small"
          color="secondary"
          variant="outlined"
        />
      );
    }

    if (template.requires_witness) {
      chips.push(
        <Chip
          key="witness"
          icon={<WitnessIcon />}
          label="Witness Required"
          size="small"
          color="warning"
          variant="outlined"
        />
      );
    }

    return chips;
  };

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

  // Table columns for ModernTable
  const getTableColumns = (): ModernTableColumn<ContractTemplate>[] => [
    {
      key: 'name',
      label: 'Template Name',
      sortable: true,
      render: (_, template) => (
        <Box display="flex" alignItems="center" gap={1}>
          <ContractIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" fontWeight="medium">
              {template.name}
            </Typography>
            {template.description && (
              <Typography variant="caption" color="text.secondary">
                {template.description}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      key: 'event_type',
      label: 'Event Type',
      render: (_, template) => getEventTypeChip(template.event_type_name),
    },
    {
      key: 'requirements',
      label: 'Requirements',
      render: (_, template) => (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {getRequirementChips(template)}
        </Box>
      ),
    },
    {
      key: 'variables',
      label: 'Variables',
      render: (_, template) => (
        <Tooltip title={`${template.variables?.length || 0} variables available for this template`}>
          <Chip
            label={`${template.variables?.length || 0} variables`}
            size="small"
            variant="outlined"
            color="info"
          />
        </Tooltip>
      ),
    },
    {
      key: 'amendments',
      label: 'Amendments',
      render: (_, template) => (
        <Chip
          label={template.allows_amendments ? 'Allowed' : 'Not Allowed'}
          size="small"
          color={template.allows_amendments ? 'success' : 'default'}
          variant={template.allows_amendments ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      render: (_, template) => (
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

  // Table actions for ModernTable
  const getTableActions = (): ModernTableAction<ContractTemplate>[] => [
    {
      label: 'Edit Template',
      icon: <EditIcon />,
      onClick: (template) => onEdit(template),
      color: 'primary',
    },
    ...(onDuplicate ? [{
      label: 'Duplicate Template',
      icon: <DuplicateIcon />,
      onClick: (template: ContractTemplate) => onDuplicate(template),
      color: 'default' as const,
    }] : []),
    {
      label: 'Delete Template',
      icon: <DeleteIcon />,
      onClick: (template) => onDelete(template.id),
      color: 'error',
    },
  ];

  const emptyState = (
    <ModernEmptyState
      icon={ContractIcon}
      title="No contract templates found"
      description="Create your first contract template to streamline your contract process"
      size="medium"
      illustration="gradient"
      tip={{
        text: "Contract templates help standardize legal documents across your events",
        type: "info"
      }}
    />
  );

  return (
    <ModernTable
      columns={getTableColumns() as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={templates as unknown as Record<string, unknown>[]}
      actions={getTableActions() as unknown as ModernTableAction<Record<string, unknown>>[]}
      loading={isLoading}
      emptyState={emptyState}
    />
  );
};