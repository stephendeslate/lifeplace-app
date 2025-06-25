// frontend/admin-crm/src/pages/settings/booking/BookingFlows.tsx

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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  EventNote as FlowIcon,
  ViewList as ListIcon,
  ViewModule as CardIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../../contexts/LayoutContext';
import { useBookingFlows } from '../../../hooks/useBookingFlows';
import { useEventTypes } from '../../../hooks/useEvents';
import { 
  BookingFlowsTable, 
  BookingFlowCard, 
  BookingFlowFormDialog,
  BookingFlowPreviewWrapper 
} from '../../../components/bookingflows/flows';
import type { 
  BookingFlow, 
  BookingFlowFilters,
  CreateBookingFlowData,
  UpdateBookingFlowData 
} from '../../../types/bookingflows.types';

type ViewMode = 'table' | 'cards';

export const BookingFlows: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [filters, setFilters] = useState<BookingFlowFilters>({});
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<BookingFlow | null>(null);
  const [flowToDelete, setFlowToDelete] = useState<BookingFlow | null>(null);
  const [flowToPreview, setFlowToPreview] = useState<BookingFlow | null>(null);

  const {
    bookingFlows,
    isLoadingFlows,
    createFlow,
    updateFlow,
    deleteFlow,
    duplicateFlow,
    isCreatingFlow,
    isUpdatingFlow,
    isDeletingFlow,
    refetchFlows,
  } = useBookingFlows(filters);

  const { eventTypes } = useEventTypes();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Booking Configuration' },
      { label: 'Booking Flows' },
    ]);
  }, [setBreadcrumbs]);

  const handleFilterChange = (key: keyof BookingFlowFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleCreateNew = () => {
    setEditingFlow(null);
    setDialogOpen(true);
  };

  const handleEdit = (flow: BookingFlow) => {
    navigate(`/settings/booking/booking-flow/${flow.id}`);
  };


  const handlePreview = (flow: BookingFlow) => {
    setFlowToPreview(flow);
    setPreviewDialogOpen(true);
  };

  const handleDuplicate = (flow: BookingFlow) => {
    const newName = `${flow.name} (Copy)`;
    duplicateFlow({ 
      id: flow.id, 
      data: { 
        name: newName,
        copy_steps: true,
        copy_configuration: true 
      } 
    });
  };

  const handleDelete = (id: number) => {
    const flow = bookingFlows.find(f => f.id === id);
    if (flow) {
      setFlowToDelete(flow);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (flowToDelete) {
      deleteFlow(flowToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setFlowToDelete(null);
        }
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setFlowToDelete(null);
  };

  const handleDialogClose = () => {
    // Clear any focused elements before closing
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement.tagName !== 'BODY') {
      activeElement.blur();
    }
    
    // Use a small timeout to ensure focus is cleared before dialog closes
    setTimeout(() => {
      setDialogOpen(false);
      setEditingFlow(null);
    }, 50);
  };


  const handlePreviewClose = () => {
    setPreviewDialogOpen(false);
    setFlowToPreview(null);
  };

  const handleSubmit = (data: CreateBookingFlowData | UpdateBookingFlowData) => {
  if (editingFlow) {
    updateFlow({ 
      id: editingFlow.id, 
      data: data as UpdateBookingFlowData 
    }, {
      onSuccess: () => {
        handleDialogClose();
      }
    });
  } else {
    createFlow(data as CreateBookingFlowData, {
      onSuccess: () => {
        handleDialogClose();
      }
    });
  }
};

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  const isLoading = isCreatingFlow || isUpdatingFlow;

  const getStatusCounts = () => {
    const active = bookingFlows.filter(f => f.is_active).length;
    const inactive = bookingFlows.filter(f => !f.is_active).length;
    const testMode = bookingFlows.filter(f => f.is_test_mode).length;
    return { active, inactive, testMode, total: bookingFlows.length };
  };

  const statusCounts = getStatusCounts();

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Booking Flows
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage client booking experiences and processes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
          sx={{ minWidth: 160 }}
        >
          New Booking Flow
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert 
        severity="info" 
        icon={<FlowIcon />}
        sx={{ mb: 3 }}
      >
        Booking flows guide clients through the booking process with customizable steps for event details, 
        questionnaires, package selection, and payment processing.
      </Alert>

      {/* Status Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Overview
          </Typography>
          <Stack direction="row" spacing={3}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary" fontWeight="bold">
                {statusCounts.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Flows
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {statusCounts.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="text.secondary" fontWeight="bold">
                {statusCounts.inactive}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inactive
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {statusCounts.testMode}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Test Mode
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Filters and View Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search booking flows..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ flex: 1, minWidth: 250 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={filters.event_type?.toString() || 'all'}
                label="Event Type"
                onChange={(e) => handleFilterChange('event_type', e.target.value === 'all' ? 'all' : e.target.value)}
              >
                <MenuItem value="all">All Event Types</MenuItem>
                {eventTypes.map((eventType) => (
                  <MenuItem key={eventType.id} value={eventType.id.toString()}>
                    {eventType.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
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

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="table" aria-label="table view">
                <ListIcon />
              </ToggleButton>
              <ToggleButton value="cards" aria-label="card view">
                <CardIcon />
              </ToggleButton>
            </ToggleButtonGroup>
            
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
                onClick={() => refetchFlows()}
                startIcon={isLoadingFlows ? <CircularProgress size={16} /> : <RefreshIcon />}
                disabled={isLoadingFlows}
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
                {filters.event_type && (
                  <Chip 
                    label={`Event Type: ${eventTypes.find(et => et.id === filters.event_type)?.name || filters.event_type}`} 
                    size="small" 
                    onDelete={() => handleFilterChange('event_type', 'all')} 
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

      {/* Booking Flows Display */}
      <Card>
        {viewMode === 'table' ? (
          <BookingFlowsTable
            bookingFlows={bookingFlows}
            isLoading={isLoadingFlows}
            onEdit={handleEdit}
            onPreview={handlePreview}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            isDeleting={isDeletingFlow}
          />
        ) : (
          <CardContent>
            {isLoadingFlows ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : bookingFlows.length === 0 ? (
              <Box 
                display="flex" 
                flexDirection="column" 
                alignItems="center" 
                justifyContent="center" 
                py={8}
                textAlign="center"
              >
                <FlowIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No booking flows found
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Create your first booking flow to guide clients through the booking process
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNew}
                >
                  Create Booking Flow
                </Button>
              </Box>
            ) : (
              <Box 
                display="grid" 
                gridTemplateColumns="repeat(auto-fill, minmax(350px, 1fr))" 
                gap={3}
              >
                {bookingFlows.map((flow) => (
                  <BookingFlowCard
                    key={flow.id}
                    flow={flow}
                    onEdit={handleEdit}
                    onPreview={handlePreview}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    isDeleting={isDeletingFlow}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        )}
      </Card>

      {/* Form Dialog */}
      <BookingFlowFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editingFlow={editingFlow}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Booking Flow</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{flowToDelete?.name}"? This action cannot be undone and will affect any active booking sessions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeletingFlow}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeletingFlow}
          >
            {isDeletingFlow ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={handlePreviewClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon color="primary" />
            Preview: {flowToPreview?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {flowToPreview && (
            <BookingFlowPreviewWrapper
              flow={flowToPreview}
              compact={false}
              showMobileView={false}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePreviewClose}>Close</Button>
          {flowToPreview && (
            <Button 
              variant="contained"
              onClick={() => {
                navigate(`/settings/booking/booking-flow/preview/${flowToPreview.id}`);
                handlePreviewClose();
              }}
            >
              Full Preview
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};