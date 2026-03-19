// frontend/admin-crm/src/components/workflows/WorkflowTemplatesTable.tsx

import React from 'react';
import { Typography, Box, Chip, Tooltip } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountTree as WorkflowIcon,
  Visibility as ViewIcon,
  FileCopy as DuplicateIcon,
  EventNote as EventIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import type { WorkflowTemplate } from '../../types/workflows';
import { ModernTable, ModernLoadingStates, ModernEmptyState } from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common';

interface WorkflowTemplateTableProps {
  templates: WorkflowTemplate[];
  isLoading: boolean;
  onEdit: (template: WorkflowTemplate) => void;
  onView: (template: WorkflowTemplate) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (template: WorkflowTemplate) => void;
  isDeleting?: boolean;
}

export const WorkflowTemplatesTable: React.FC<WorkflowTemplateTableProps> = ({
  templates,
  isLoading,
  onEdit,
  onView,
  onDelete,
  onDuplicate,
  isDeleting = false,
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
      return <Chip label="Any Event Type" size="small" variant="outlined" color="default" />;
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

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, row) => {
        const template = row as unknown as WorkflowTemplate;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <WorkflowIcon color="primary" />
            <Box>
              <Typography variant="subtitle2" fontWeight="medium">
                {template.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {template.id}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      key: 'event_type',
      label: 'Event Type',
      hideBelow: 'md',
      render: (_, row) => {
        const template = row as unknown as WorkflowTemplate;
        return getEventTypeChip(template.event_type_name);
      },
    },
    {
      key: 'stages',
      label: 'Stages',
      align: 'center',
      hideBelow: 'md',
      render: (_, row) => {
        const template = row as unknown as WorkflowTemplate;
        return (
          <Tooltip title={`${template.stages_count} stages in this workflow`}>
            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
              <TimelineIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight="medium">
                {template.stages_count}
              </Typography>
            </Box>
          </Tooltip>
        );
      },
    },
    {
      key: 'description',
      label: 'Description',
      hideBelow: 'lg',
      render: (_, row) => {
        const template = row as unknown as WorkflowTemplate;
        return (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
            {template.description || 'No description provided'}
          </Typography>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, row) => {
        const template = row as unknown as WorkflowTemplate;
        return getStatusChip(template.is_active);
      },
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      hideBelow: 'lg',
      render: (_, row) => {
        const template = row as unknown as WorkflowTemplate;
        return (
          <Box>
            <Typography variant="body2" color="text.secondary">
              {new Date(template.updated_at).toLocaleDateString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(template.updated_at).toLocaleTimeString()}
            </Typography>
          </Box>
        );
      },
    },
  ];

  const actions: ModernTableAction[] = [
    {
      label: 'View Workflow',
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => onView(row as unknown as WorkflowTemplate),
    },
    {
      label: 'Edit Template',
      icon: <EditIcon fontSize="small" />,
      onClick: (row: Record<string, unknown>) => onEdit(row as unknown as WorkflowTemplate),
    },
    ...(onDuplicate
      ? [
          {
            label: 'Duplicate',
            icon: <DuplicateIcon fontSize="small" />,
            onClick: (row: Record<string, unknown>) =>
              onDuplicate && onDuplicate(row as unknown as WorkflowTemplate),
          },
        ]
      : []),
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (row) => onDelete((row as { id: number }).id),
      color: 'error' as const,
    },
  ];

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (templates.length === 0) {
    return (
      <ModernEmptyState
        icon={WorkflowIcon}
        title="No workflow templates found"
        description="Create your first workflow template to automate event processes"
        tip={{
          text: 'Workflow templates help automate complex event management processes',
          type: 'info',
        }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={templates as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      onRowClick={(row) => onView(row as unknown as WorkflowTemplate)}
      sortBy="name"
      sortOrder="asc"
      loading={isDeleting}
    />
  );
};
