// frontend/admin-crm/src/components/questionnaires/QuestionnairesTable.tsx

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import {
  Psychology as QuestionnaireIcon,
  EventNote as EventIcon,
  QuestionAnswer as FieldsIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
} from '@mui/icons-material';
import type { QuestionnaireTableProps, Questionnaire } from '../../types/questionnaires.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState } from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common';

export const QuestionnairesTable: React.FC<QuestionnaireTableProps> = ({
  questionnaires,
  isLoading,
  onEdit,
  onPreview,
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

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, questionnaire: Questionnaire) => (
        <Box display="flex" alignItems="center" gap={1}>
          <QuestionnaireIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" fontWeight="medium">
              {questionnaire.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {questionnaire.id}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'event_type',
      label: 'Event Type',
      render: (_, questionnaire: Questionnaire) => getEventTypeChip(questionnaire.event_type_name),
    },
    {
      key: 'fields',
      label: 'Fields',
      align: 'center',
      render: (_, questionnaire: Questionnaire) => (
        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
          <FieldsIcon fontSize="small" color="action" />
          <Typography variant="body2" fontWeight="medium">
            {questionnaire.fields_count || 0}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'sort_order',
      label: 'Order',
      align: 'center',
      render: (_, questionnaire: Questionnaire) => (
        <Typography variant="body2" color="text.secondary">
          {questionnaire.order || 0}
        </Typography>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, questionnaire: Questionnaire) => getStatusChip(questionnaire.is_active),
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      render: (_, questionnaire: Questionnaire) => (
        <Box>
          <Typography variant="body2" color="text.secondary">
            {new Date(questionnaire.updated_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(questionnaire.updated_at).toLocaleTimeString()}
          </Typography>
        </Box>
      ),
    },
  ];

  // Custom actions for questionnaires
  const actions: ModernTableAction[] = [
    ...(onPreview ? [{
      label: 'Preview',
      icon: <ViewIcon fontSize="small" />,
      onClick: onPreview,
    }] : []),
    {
      label: 'Edit',
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
    return <ModernLoadingStates.ModernTableSkeleton rows={5} columns={6} hasHeader />;
  }

  if (questionnaires.length === 0) {
    return (
      <ModernEmptyState
        icon={QuestionnaireIcon}
        title="No questionnaires found"
        description="Create your first questionnaire template to gather client information"
        size="medium"
        illustration="gradient"
        tip={{
          text: "Questionnaires help collect structured information from clients during booking",
          type: "info"
        }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns}
      data={questionnaires}
      actions={actions}
      onRowClick={onEdit}
      sortBy="sort_order"
      sortOrder="asc"
    />
  );
};