// frontend/admin-crm/src/components/events/EventTypesTable.tsx

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
  EventNote as EventIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import type { EventTypeTableProps, EventType } from '../../types/events.types';
import { ModernTable, ModernEmptyState, type ModernTableColumn, type ModernTableAction } from '../common';
import { tokens } from '../../design-system';

export const EventTypesTable: React.FC<EventTypeTableProps> = ({
  eventTypes,
  isLoading,
  onEdit,
  onDelete,
}) => {

  const getStatusChip = (isActive: boolean) => (
    <Chip
      icon={isActive ? <ActiveIcon /> : <InactiveIcon />}
      label={isActive ? 'Active' : 'Inactive'}
      size="small"
      color={isActive ? 'success' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
    />
  );

  const columns: ModernTableColumn<EventType>[] = [
    {
      key: 'name',
      label: 'Event Type',
      sortable: true,
      render: (_, eventType) => (
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: tokens.spacing.radius.lg,
              background: `${tokens.color.primary[50]}80`,
              border: `1px solid ${tokens.color.primary[200]}40`,
            }}
          >
            <EventIcon sx={{ 
              color: tokens.color.primary[600],
              fontSize: 20 
            }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 0.5 }}>
              {eventType.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ID: {eventType.id}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (_, eventType) => (
        <Box>
          {eventType.description ? (
            <Tooltip title={eventType.description} arrow>
              <Typography 
                variant="body2" 
                color="text.primary"
                sx={{
                  maxWidth: 280,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.5,
                }}
              >
                {eventType.description}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              No description
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, eventType) => getStatusChip(eventType.is_active),
    },
    {
      key: 'created_at',
      label: 'Created Date',
      render: (_, eventType) => (
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight="500">
            {new Date(eventType.created_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(eventType.created_at).toLocaleTimeString()}
          </Typography>
        </Box>
      ),
    },
  ];

  const actions: ModernTableAction<EventType>[] = [
    {
      label: 'Edit Event Type',
      icon: <EditIcon />,
      onClick: (eventType) => onEdit(eventType),
      color: 'primary',
    },
    {
      label: 'Delete Event Type',
      icon: <DeleteIcon />,
      onClick: (eventType) => onDelete(eventType.id),
      color: 'error',
    },
  ];

  const emptyState = (
    <ModernEmptyState
      icon={EventIcon}
      title="No event types found"
      description="Create your first event type to organize your events by category and streamline your booking process."
      tip={{
        text: "Event types help categorize your events and can be used in booking flows, questionnaires, and reports.",
        type: 'info'
      }}
      size="medium"
      color="primary"
    />
  );


  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={eventTypes as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      onRowClick={(row) => onEdit(row as unknown as EventType)}
      loading={isLoading}
      emptyState={emptyState}
    />
  );
};