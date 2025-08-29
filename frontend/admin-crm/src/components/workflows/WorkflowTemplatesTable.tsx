// frontend/admin-crm/src/components/workflows/WorkflowTemplatesTable.tsx

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
  AccountTree as WorkflowIcon,
  Visibility as ViewIcon,
  FileCopy as DuplicateIcon,
  EventNote as EventIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import type { WorkflowTemplateTableProps, WorkflowTemplate } from '../../types/workflows.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState } from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common';

export const WorkflowTemplatesTable: React.FC<WorkflowTemplateTableProps> = ({
  templates,
  isLoading,
  onEdit,
  onView,
  onDelete,
  onDuplicate,
  isDeleting,
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

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, template: any) => (
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
      ),
    },
    {
      key: 'event_type',
      label: 'Event Type',
      render: (_, template: any) => getEventTypeChip(template.event_type_name),
    },
    {
      key: 'stages',
      label: 'Stages',
      align: 'center',
      render: (_, template: any) => (
        <Tooltip title={`${template.stages_count} stages in this workflow`}>
          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
            <TimelineIcon fontSize="small" color="action" />
            <Typography variant="body2" fontWeight="medium">
              {template.stages_count}
            </Typography>
          </Box>
        </Tooltip>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (_, template: any) => (
        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
          {template.description || 'No description provided'}
        </Typography>
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

  const actions: ModernTableAction[] = [
    {
      label: 'View Workflow',
      icon: <ViewIcon fontSize="small" />,
      onClick: onView,
    },
    {
      label: 'Edit Template',
      icon: <EditIcon fontSize="small" />,
      onClick: onEdit,
    },
    ...(onDuplicate ? [{
      label: 'Duplicate',
      icon: <DuplicateIcon fontSize="small" />,
      onClick: onDuplicate,
    }] : []),
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: onDelete,
      color: 'error' as const,
    },
  ];

  if (isLoading) {
    return <ModernLoadingStates.table />;
  }

  if (templates.length === 0) {
    return (
      <ModernEmptyState
        icon={WorkflowIcon}
        title="No workflow templates found"
        description="Create your first workflow template to automate event processes"
        tip={{ text: "Workflow templates help automate complex event management processes", type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns}
      data={templates}
      actions={actions}
      onRowClick={onView}
      sortBy="name"
      sortOrder="asc"
    />
  );
};