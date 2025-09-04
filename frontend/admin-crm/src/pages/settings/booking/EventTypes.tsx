// frontend/admin-crm/src/pages/settings/booking/EventTypes.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  EventNote as EventIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useEventTypes } from '../../../hooks/useEvents';
import type { 
  EventType, 
  EventTypeFilters,
  CreateEventTypeData,
  UpdateEventTypeData 
} from '../../../types/events.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, createAddAction, createRefreshAction } from '../../../components/common/ModernPageHeader';
import { ModernEmptyState } from '../../../components/common/ModernEmptyState';
// Note: Using EventTypesTable temporarily until ModernTable is fully implemented
import { EventTypesTable, EventTypeFormDialog } from '../../../components/events';
import ModernLoadingStates from '../../../components/common/ModernLoadingStates';
import { tokens } from '../../../design-system';

export const EventTypes: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [filters, setFilters] = useState<EventTypeFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);

  const {
    eventTypes,
    isLoadingEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
    isCreatingEventType,
    isUpdatingEventType,
    refetchEventTypes,
  } = useEventTypes(filters);

  // Event handlers
  const handleCreateNew = () => {
    setEditingEventType(null);
    setDialogOpen(true);
  };

  const handleEdit = (eventType: EventType) => {
    setEditingEventType(eventType);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteEventType(id);
  };

  const handleSubmit = (data: CreateEventTypeData | UpdateEventTypeData) => {
    if (editingEventType) {
      updateEventType({ id: editingEventType.id, data: data as UpdateEventTypeData });
    } else {
      createEventType(data as CreateEventTypeData);
    }
    setDialogOpen(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingEventType(null);
  };

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Booking Configuration' },
      { label: 'Event Types' },
    ]);
  }, [setBreadcrumbs]);


  const handleClearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  if (isLoadingEventTypes && eventTypes.length === 0) {
    return (
      <ModernSettingsLayout>
        <ModernLoadingStates.ModernLoadingSpinner
          size={40}
          message="Loading event types..."
          variant="circular"
          glass
        />
      </ModernSettingsLayout>
    );
  }

  // Define header actions
  const headerActions = [];
  headerActions.push(createAddAction('New Event Type', handleCreateNew, 'primary'));
  headerActions.push(createRefreshAction(() => refetchEventTypes()));
  
  if (hasActiveFilters) {
    headerActions.push({
      icon: <FilterIcon />,
      label: 'Clear Filters',
      variant: 'outlined' as const,
      onClick: handleClearFilters,
      tooltip: 'Clear all active filters',
    });
  }

  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
      <ModernPageHeader
        title="Event Types"
        subtitle="Manage the types of events your business offers and configure their settings"
        icon={<EventIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Booking Configuration' },
          { label: 'Event Types' },
        ]}
        primaryAction={headerActions.find(a => a.label === 'New Event Type')}
        secondaryActions={headerActions.filter(a => a.label !== 'New Event Type')}
        stats={[
          { label: 'Total Types', value: eventTypes.length },
          { label: 'Active', value: eventTypes.filter(et => et.is_active).length },
        ]}
        size="medium"
        gradient
        glass
      />

      {/* Info Alert */}
      <Box sx={{ mb: 4 }}>
        <ModernCard
          variant="glass"
          color="primary"
          size="small"
          animation="none"
        >
          <Alert 
            severity="info" 
            icon={<InfoIcon />}
            sx={{
              backgroundColor: 'transparent',
              border: 'none',
              '& .MuiAlert-message': {
                color: tokens.color.info[700],
              },
            }}
          >
            Event types help organize your events by category (e.g., Weddings, Corporate Events, Birthday Parties). 
            They can be used in booking forms, questionnaires, and reporting.
          </Alert>
        </ModernCard>
      </Box>


      {/* Event Types Table */}
      <ModernCard
        variant="glass"
        size="large"
        animation="none"
        sx={{ overflow: 'visible', mb: 4 }}
      >
        {isLoadingEventTypes && eventTypes.length === 0 ? (
          <ModernLoadingStates.ModernTableSkeleton
            rows={5}
            columns={6}
          />
        ) : eventTypes.length === 0 ? (
          <ModernEmptyState
            icon={EventIcon}
            title={hasActiveFilters ? 'No event types match your filters' : 'No event types found'}
            description={hasActiveFilters 
              ? 'Try adjusting your search criteria or clear the filters'
              : 'Create your first event type to start organizing your events'
            }
            primaryAction={{
              label: hasActiveFilters ? 'Clear Filters' : 'Create Event Type',
              onClick: hasActiveFilters ? handleClearFilters : handleCreateNew,
              icon: hasActiveFilters ? <FilterIcon /> : <AddIcon />,
              color: 'primary',
            }}
            tip={{
              text: 'Event types help categorize your events and streamline the booking process',
              type: 'info',
            }}
            size="medium"
            illustration="gradient"
          />
        ) : (
          <EventTypesTable
            eventTypes={eventTypes}
            isLoading={isLoadingEventTypes}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeleting={false}
          />
        )}
      </ModernCard>

      {/* Form Dialog */}
      <EventTypeFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editingEventType={editingEventType}
        onSubmit={handleSubmit}
        isLoading={isCreatingEventType || isUpdatingEventType}
      />

    </ModernSettingsLayout>
  );
};