// frontend/admin-crm/src/pages/settings/booking/BookingFlows.tsx

import React, { useEffect, useState, useRef } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
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

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernEmptyState } from '../../../components/common/ModernEmptyState';
import ModernLoadingStates from '../../../components/common/ModernLoadingStates';
import { ModernPageHeader, createRefreshAction, createAddAction } from '../../../components/common/ModernPageHeader';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

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

  // Refs for focus management
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  // FIXED: Use the evolved hooks with proper mutation syntax
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
    isDuplicatingFlow,
    refetchFlows,
    flowsError,
    createError,
    updateError,
    deleteError,
    duplicateError,
  } = useBookingFlows(filters);

  // FIXED: Ensure this hook exists and is imported correctly
  const { 
    eventTypes = [],
    isLoadingEventTypes,
    eventTypesError,
  } = useEventTypes();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Booking Configuration' },
      { label: 'Booking Flows' },
    ]);
  }, [setBreadcrumbs]);

  // FIXED: Updated filter handling to match evolved types
  const handleFilterChange = (key: keyof BookingFlowFilters, value: string | boolean) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (value === 'all' || value === '' || value === undefined) {
        delete newFilters[key];
      } else {
        if (key === 'event_type') {
          // Convert string to number for event_type
          newFilters[key] = parseInt(value as string, 10);
        } else if (key === 'is_active') {
          // Convert string to boolean for is_active
          newFilters[key] = value === 'true' || value === true;
        } else {
          (newFilters as Record<string, unknown>)[key] = value;
        }
      }
      
      return newFilters;
    });
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleCreateNew = () => {
    // Store the currently focused element
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setEditingFlow(null);
    setDialogOpen(true);
  };

  const handleEdit = (flow: BookingFlow) => {
    navigate(`/settings/booking/booking-flow/${flow.id}`);
  };

  const handlePreview = (flow: BookingFlow) => {
    // Store the currently focused element
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setFlowToPreview(flow);
    setPreviewDialogOpen(true);
  };

  // FIXED: Use the evolved mutation syntax with proper error handling
  const handleDuplicate = (flow: BookingFlow) => {
    const newName = `${flow.name} (Copy)`;
    duplicateFlow(
      { 
        id: flow.id, 
        data: { 
          name: newName,
          copy_steps: true,
          copy_configuration: true 
        } 
      }
    );
  };

  const handleDelete = (id: number) => {
    const flow = bookingFlows.find(f => f.id === id);
    if (flow) {
      // Store the currently focused element
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
      setFlowToDelete(flow);
      setDeleteDialogOpen(true);
    }
  };

  // FIXED: Use the evolved mutation syntax
  const handleDeleteConfirm = () => {
    if (flowToDelete) {
      deleteFlow(flowToDelete.id);
      // The success handling is done in the hook via toast notifications
      handleDeleteCancel();
    }
  };

  const handleDeleteCancel = () => {
    // Clear any focused elements before closing
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      activeElement.blur();
    }

    // Close dialog first
    setDeleteDialogOpen(false);
    setFlowToDelete(null);

    // Restore focus after a brief delay to ensure dialog is fully closed
    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch {
          // If focus restoration fails, focus the create button as fallback
          createButtonRef.current?.focus();
        }
      } else {
        // Fallback to create button if original element is no longer available
        createButtonRef.current?.focus();
      }
      lastFocusedElementRef.current = null;
    }, 100);
  };

  const handleDialogClose = () => {
    // Clear any focused elements before closing
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      activeElement.blur();
    }
    
    // Close dialog first
    setDialogOpen(false);
    setEditingFlow(null);

    // Restore focus after a brief delay
    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch {
          createButtonRef.current?.focus();
        }
      } else {
        createButtonRef.current?.focus();
      }
      lastFocusedElementRef.current = null;
    }, 100);
  };

  const handlePreviewClose = () => {
    // Clear any focused elements before closing
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      activeElement.blur();
    }

    // Close dialog first
    setPreviewDialogOpen(false);
    setFlowToPreview(null);

    // Restore focus after a brief delay
    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch {
          createButtonRef.current?.focus();
        }
      } else {
        createButtonRef.current?.focus();
      }
      lastFocusedElementRef.current = null;
    }, 100);
  };

  // FIXED: Use the evolved mutation syntax
  const handleSubmit = (data: CreateBookingFlowData | UpdateBookingFlowData) => {
    if (editingFlow) {
      updateFlow({ 
        id: editingFlow.id, 
        data: data as UpdateBookingFlowData 
      });
      // Success handling is done via toast notifications in the hook
      handleDialogClose();
    } else {
      createFlow(data as CreateBookingFlowData);
      // Success handling is done via toast notifications in the hook
      handleDialogClose();
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  const isLoading = isCreatingFlow || isUpdatingFlow || isDuplicatingFlow;

  // FIXED: Updated to use evolved BookingFlow type properties
  const getStatusCounts = () => {
    const active = bookingFlows.filter(f => f.is_active).length;
    const inactive = bookingFlows.filter(f => !f.is_active).length;
    const testMode = bookingFlows.filter(f => f.is_test_mode).length;
    return { active, inactive, testMode, total: bookingFlows.length };
  };

  const statusCounts = getStatusCounts();

  // FIXED: Better error handling display
  const hasErrors = flowsError || eventTypesError || createError || updateError || deleteError || duplicateError;

  // Modern header actions
  const headerActions = [
    createRefreshAction(() => refetchFlows()),
    ...(hasActiveFilters ? [{
      icon: <FilterIcon />,
      label: 'Clear Filters',
      variant: 'outlined' as const,
      onClick: handleClearFilters,
      tooltip: 'Clear all active filters',
    }] : []),
  ];

  const primaryAction = createAddAction('New Booking Flow', handleCreateNew, 'primary');

  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
      <ModernPageHeader
        title="Booking Flows"
        subtitle="Manage client booking experiences and processes"
        icon={<FlowIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Booking Configuration' },
          { label: 'Booking Flows' },
        ]}
        primaryAction={primaryAction}
        secondaryActions={headerActions}
        stats={[
          { label: 'Total Flows', value: statusCounts.total },
          { label: 'Active', value: statusCounts.active },
          { label: 'Test Mode', value: statusCounts.testMode },
        ]}
        size="medium"
        gradient
        glass
      />

      {/* Error Display */}
      {hasErrors && (
        <Box sx={{ mb: 4 }}>
          <ModernCard
            variant="glass"
            color="error"
            size="small"
            animation="none"
          >
            <Alert 
              severity="error"
              sx={{
                backgroundColor: 'transparent',
                border: 'none',
                '& .MuiAlert-message': {
                  color: tokens.color.error[700],
                },
              }}
            >
              {flowsError?.message || 
               eventTypesError?.message || 
               createError?.message || 
               updateError?.message || 
               deleteError?.message || 
               duplicateError?.message || 
               'An error occurred while managing booking flows'}
            </Alert>
          </ModernCard>
        </Box>
      )}

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
            icon={<FlowIcon />}
            sx={{
              backgroundColor: 'transparent',
              border: 'none',
              '& .MuiAlert-message': {
                color: tokens.color.primary[700],
              },
            }}
          >
            Booking flows guide clients through the booking process with customizable steps for event details, 
            questionnaires, package selection, and payment processing.
          </Alert>
        </ModernCard>
      </Box>

      {/* Filters and View Controls */}
      <ModernCard
        variant="glass"
        size="medium"
        animation="none"
        sx={{ mb: 4 }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search booking flows..."
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
            disabled={isLoading}
          />
            
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: 140,
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
          >
            <InputLabel>Event Type</InputLabel>
            <Select
              value={filters.event_type?.toString() || 'all'}
              label="Event Type"
              onChange={(e) => handleFilterChange('event_type', e.target.value)}
              disabled={isLoading || isLoadingEventTypes}
            >
              <MenuItem value="all">All Event Types</MenuItem>
              {eventTypes.map((eventType) => (
                <MenuItem key={eventType.id} value={eventType.id.toString()}>
                  {eventType.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: 120,
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
          >
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
              label="Status"
              onChange={(e) => handleFilterChange('is_active', e.target.value)}
              disabled={isLoading}
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
            sx={{
              '& .MuiToggleButton-root': {
                ...glassPresets.light,
                border: `1px solid ${tokens.color.borders.glass}`,
                borderRadius: `${tokens.spacing.radius.lg} !important`,
                '&:hover': {
                  ...glassPresets.medium,
                  border: `1px solid ${tokens.color.primary[300]}`,
                },
                '&.Mui-selected': {
                  backgroundColor: tokens.color.primary[100],
                  border: `1px solid ${tokens.color.primary[500]}`,
                  color: tokens.color.primary[700],
                },
              },
            }}
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
                disabled={isLoading}
                sx={{
                  ...glassPresets.light,
                  border: `1px solid ${tokens.color.neutral[400]}30`,
                  color: tokens.color.neutral[600],
                  borderRadius: tokens.spacing.radius.full,
                  '&:hover': {
                    ...glassPresets.medium,
                    border: `1px solid ${tokens.color.neutral[400]}50`,
                  },
                }}
              >
                Clear
              </Button>
            )}
            <IconButton
              onClick={() => refetchFlows()}
              disabled={isLoadingFlows || isLoading}
              sx={{
                ...glassPresets.light,
                border: `1px solid ${tokens.color.neutral[400]}30`,
                color: tokens.color.neutral[600],
                '&:hover': {
                  ...glassPresets.medium,
                  color: tokens.color.neutral[700],
                },
              }}
            >
              {isLoadingFlows ? <CircularProgress size={16} /> : <RefreshIcon />}
            </IconButton>
          </Box>
        </Stack>
        
        {hasActiveFilters && (
          <Box mt={3} pt={3} sx={{ borderTop: `1px solid ${tokens.color.borders.glass}` }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: tokens.color.neutral[600],
                fontWeight: 600,
                mb: 1.5,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.75rem',
              }}
            >
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
                    backgroundColor: `${tokens.color.primary[500]}15`,
                    border: `1px solid ${tokens.color.primary[500]}30`,
                    color: tokens.color.primary[700],
                    '& .MuiChip-deleteIcon': {
                      color: tokens.color.primary[600],
                    },
                  }}
                />
              )}
              {filters.event_type && (
                <Chip 
                  label={`Event Type: ${eventTypes.find(et => et.id === filters.event_type)?.name || filters.event_type}`} 
                  size="small" 
                  onDelete={() => handleFilterChange('event_type', 'all')} 
                  sx={{
                    ...glassPresets.light,
                    backgroundColor: `${tokens.color.secondary[500]}15`,
                    border: `1px solid ${tokens.color.secondary[500]}30`,
                    color: tokens.color.secondary[700],
                    '& .MuiChip-deleteIcon': {
                      color: tokens.color.secondary[600],
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
                    backgroundColor: `${tokens.color.success[500]}15`,
                    border: `1px solid ${tokens.color.success[500]}30`,
                    color: tokens.color.success[700],
                    '& .MuiChip-deleteIcon': {
                      color: tokens.color.success[600],
                    },
                  }}
                />
              )}
            </Stack>
          </Box>
        )}
      </ModernCard>

      {/* Booking Flows Display */}
      <ModernCard
        variant="glass"
        size="large"
        animation="none"
        sx={{
          overflow: 'visible',
          position: 'relative',
        }}
      >
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
          <Box sx={{ position: 'relative' }}>
            {isLoadingFlows ? (
              <ModernLoadingStates.ModernListSkeleton 
                items={6}
                showAvatar
                showSecondaryText
              />
            ) : bookingFlows.length === 0 ? (
              <ModernEmptyState
                icon={FlowIcon}
                title={hasActiveFilters ? 'No booking flows match your filters' : 'No booking flows found'}
                description={hasActiveFilters 
                  ? 'Try adjusting your search criteria or clearing the filters'
                  : 'Create your first booking flow to guide clients through the booking process'
                }
                primaryAction={{
                  label: hasActiveFilters ? 'Clear Filters' : 'Create Booking Flow',
                  onClick: hasActiveFilters ? handleClearFilters : handleCreateNew,
                  icon: hasActiveFilters ? <FilterIcon /> : <AddIcon />,
                  color: 'primary',
                }}
                tip={{
                  text: 'Booking flows help streamline the client experience and improve conversion rates',
                  type: 'info',
                }}
                size="medium"
                illustration="gradient"
              />
            ) : (
              <Box 
                display="grid" 
                gridTemplateColumns="repeat(auto-fill, minmax(350px, 1fr))" 
                gap={3}
                sx={{ p: 3 }}
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
          </Box>
        )}
      </ModernCard>

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
        disableRestoreFocus
        disableEnforceFocus={false}
        keepMounted={false}
        PaperProps={{
          sx: {
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xxl,
            border: `1px solid ${tokens.color.borders.glass}`,
            background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            background: `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
          }}
        >
          Delete Booking Flow
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: tokens.color.neutral[700], mb: 2 }}>
            Are you sure you want to delete "{flowToDelete?.name}"? This action cannot be undone and will affect any active booking sessions.
          </DialogContentText>
          {/* FIXED: Show additional flow details for better context */}
          {flowToDelete && (
            <ModernCard
              variant="glass"
              color="error"
              size="small"
              animation="none"
              sx={{ mt: 2 }}
            >
              <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                <strong>Event Type:</strong> {flowToDelete.event_type_name}
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                <strong>Total Steps:</strong> {flowToDelete.total_steps}
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                <strong>Status:</strong> {flowToDelete.is_active ? 'Active' : 'Inactive'}
              </Typography>
              {flowToDelete.is_test_mode && (
                <Typography variant="body2" sx={{ color: tokens.color.warning[600], fontWeight: 600 }}>
                  <strong>Test Mode</strong>
                </Typography>
              )}
            </ModernCard>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={isDeletingFlow}
            sx={{
              ...glassPresets.light,
              border: `1px solid ${tokens.color.neutral[300]}`,
              borderRadius: tokens.spacing.radius.full,
              px: 3,
              '&:hover': {
                ...glassPresets.medium,
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            ref={deleteButtonRef}
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeletingFlow}
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.error[500]} 0%, ${tokens.color.error[600]} 100%)`,
              borderRadius: tokens.spacing.radius.full,
              px: 4,
              boxShadow: `0 8px 32px ${tokens.color.error[500]}25`,
              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[700]} 100%)`,
                boxShadow: `0 12px 40px ${tokens.color.error[500]}35`,
              },
            }}
          >
            {isDeletingFlow ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={handlePreviewClose}
        maxWidth="md"
        fullWidth
        disableRestoreFocus
        disableEnforceFocus={false}
        keepMounted={false}
        PaperProps={{
          sx: {
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xxl,
            border: `1px solid ${tokens.color.borders.glass}`,
            background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon sx={{ color: tokens.color.primary[600] }} />
            <span>Preview: {flowToPreview?.name}</span>
            {flowToPreview?.is_test_mode && (
              <Chip 
                label="Test Mode" 
                size="small" 
                sx={{
                  background: `linear-gradient(135deg, ${tokens.color.warning[500]} 0%, ${tokens.color.warning[600]} 100%)`,
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            )}
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
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handlePreviewClose}
            sx={{
              ...glassPresets.light,
              border: `1px solid ${tokens.color.neutral[300]}`,
              borderRadius: tokens.spacing.radius.full,
              px: 3,
              '&:hover': {
                ...glassPresets.medium,
              },
            }}
          >
            Close
          </Button>
          {flowToPreview && (
            <Button 
              variant="contained"
              onClick={() => {
                navigate(`/settings/booking/booking-flow/preview/${flowToPreview.id}`);
                handlePreviewClose();
              }}
              sx={{
                background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                borderRadius: tokens.spacing.radius.full,
                px: 4,
                boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                  boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
                },
              }}
            >
              Full Preview
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </ModernSettingsLayout>
  );
};