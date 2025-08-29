// frontend/admin-crm/src/pages/settings/booking/EventTypes.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  EventNote as EventIcon,
  Search as SearchIcon,
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
import { glassPresets } from '../../../design-system/utils/glassmorphism';

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

  // Remove unused handleRefresh - using refetchEventTypes directly

  const handleFilterChange = (key: keyof EventTypeFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

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

      {/* Filters */}
      <ModernCard
        variant="glass"
        size="medium"
        animation="none"
        sx={{ mb: 4 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search event types..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            sx={{
              flex: 1,
              minWidth: 250,
              '& .MuiOutlinedInput-root': {
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.lg,
                border: `1px solid ${tokens.color.borders.glass}`,
                '&:hover': {
                  border: `1px solid ${tokens.color.primary[300]}`,
                },
                '&.Mui-focused': {
                  border: `1px solid ${tokens.color.primary[500]}`,
                  boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: tokens.color.primary[600] }} />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
              label="Status"
              onChange={(e) => handleFilterChange('is_active', e.target.value === 'true')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  ...glassPresets.light,
                  borderRadius: tokens.spacing.radius.lg,
                },
              }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
          
          <Box display="flex" gap={1}>
            {hasActiveFilters && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearFilters}
                startIcon={<FilterIcon />}
                sx={{
                  ...glassPresets.light,
                  border: `1px solid ${tokens.color.neutral[300]}`,
                  borderRadius: tokens.spacing.radius.full,
                  '&:hover': {
                    ...glassPresets.medium,
                  },
                }}
              >
                Clear
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={() => refetchEventTypes()}
              startIcon={isLoadingEventTypes ? <CircularProgress size={16} /> : <RefreshIcon />}
              disabled={isLoadingEventTypes}
              sx={{
                ...glassPresets.light,
                border: `1px solid ${tokens.color.neutral[300]}`,
                borderRadius: tokens.spacing.radius.full,
                '&:hover': {
                  ...glassPresets.medium,
                },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Stack>
        
        {hasActiveFilters && (
          <Box mt={3}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Active filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {filters.search && (
                <Chip 
                  label={`Search: "${filters.search}"`} 
                  size="small" 
                  onDelete={() => handleFilterChange('search', '')} 
                  sx={{
                    ...glassPresets.light,
                    border: `1px solid ${tokens.color.primary[300]}`,
                    color: tokens.color.primary[700],
                    '& .MuiChip-deleteIcon': {
                      color: tokens.color.primary[600],
                    },
                  }}
                />
              )}
              {filters.is_active !== undefined && (
                <Chip 
                  label={`Status: ${filters.is_active ? 'Active' : 'Inactive'}`} 
                  size="small" 
                  onDelete={() => handleFilterChange('is_active', 'all')} 
                  sx={{
                    ...glassPresets.light,
                    border: `1px solid ${tokens.color.secondary[300]}`,
                    color: tokens.color.secondary[700],
                    '& .MuiChip-deleteIcon': {
                      color: tokens.color.secondary[600],
                    },
                  }}
                />
              )}
            </Stack>
          </Box>
        )}
      </ModernCard>

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