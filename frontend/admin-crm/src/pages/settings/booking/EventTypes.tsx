// frontend/admin-crm/src/pages/settings/booking/EventTypes.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  EventNote as EventIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useEventTypes } from '../../../hooks/useEvents';
import { EventTypesTable, EventTypeFormDialog } from '../../../components/events';
import type { 
  EventType, 
  EventTypeFilters,
  CreateEventTypeData,
  UpdateEventTypeData 
} from '../../../types/events.types';

export const EventTypes: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [filters, setFilters] = useState<EventTypeFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [eventTypeToDelete, setEventTypeToDelete] = useState<EventType | null>(null);

  const {
    eventTypes,
    isLoadingEventTypes,
    createEventType,
    updateEventType,
    deleteEventType,
    isCreatingEventType,
    isUpdatingEventType,
    isDeletingEventType,
    refetchEventTypes,
  } = useEventTypes(filters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Booking Configuration' },
      { label: 'Event Types' },
    ]);
  }, [setBreadcrumbs]);

  const handleFilterChange = (key: keyof EventTypeFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleCreateNew = () => {
    setEditingEventType(null);
    setDialogOpen(true);
  };

  const handleEdit = (eventType: EventType) => {
    setEditingEventType(eventType);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    const eventType = eventTypes.find(et => et.id === id);
    if (eventType) {
      setEventTypeToDelete(eventType);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (eventTypeToDelete) {
      deleteEventType(eventTypeToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setEventTypeToDelete(null);
        }
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setEventTypeToDelete(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingEventType(null);
  };

  const handleSubmit = (data: CreateEventTypeData | UpdateEventTypeData) => {
    if (editingEventType) {
      updateEventType({ 
        id: editingEventType.id, 
        data: data as UpdateEventTypeData 
      });
    } else {
      createEventType(data as CreateEventTypeData);
    }
    handleDialogClose();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  const isLoading = isCreatingEventType || isUpdatingEventType;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Event Types
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage the types of events your business offers
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          sx={{ minWidth: 160 }}
        >
          New Event Type
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert 
        severity="info" 
        icon={<EventIcon />}
        sx={{ mb: 3 }}
      >
        Event types help organize your events by category (e.g., Weddings, Corporate Events, Birthday Parties). 
        They can be used in booking forms, questionnaires, and reporting.
      </Alert>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search event types..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ flex: 1, minWidth: 250 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
                label="Status"
                onChange={(e) => handleFilterChange('is_active', e.target.value === 'true')}
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
              >
                Refresh
              </Button>
            </Box>
          </Stack>
          
          {hasActiveFilters && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Active filters:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {filters.search && (
                  <Chip 
                    label={`Search: "${filters.search}"`} 
                    size="small" 
                    onDelete={() => handleFilterChange('search', '')} 
                  />
                )}
                {filters.is_active !== undefined && (
                  <Chip 
                    label={`Status: ${filters.is_active ? 'Active' : 'Inactive'}`} 
                    size="small" 
                    onDelete={() => handleFilterChange('is_active', 'all')} 
                  />
                )}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Event Types Table */}
      <Card>
        <EventTypesTable
          eventTypes={eventTypes}
          isLoading={isLoadingEventTypes}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isDeleting={isDeletingEventType}
        />
      </Card>

      {/* Form Dialog */}
      <EventTypeFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editingEventType={editingEventType}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Event Type</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{eventTypeToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeletingEventType}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeletingEventType}
          >
            {isDeletingEventType ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};