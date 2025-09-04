// frontend/admin-crm/src/pages/settings/booking/BookingFlows.tsx

import React, { useEffect, useState, useRef } from 'react';

import {
  Box,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  EventNote as FlowIcon,
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
import { ModernPageHeader, createRefreshAction, createAddAction, type HeaderAction } from '../../../components/common/ModernPageHeader';
import { ErrorDisplay } from '../../../components/common/ErrorDisplay';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

type ViewMode = 'table' | 'cards';

export const BookingFlows: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [filters, setFilters] = useState<BookingFlowFilters>({});
  const [_viewMode, _setViewMode] = useState<ViewMode>('table');
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
    eventTypes: _eventTypes = [],
    isLoadingEventTypes: _isLoadingEventTypes,
    eventTypesError: _eventTypesError,
  } = useEventTypes();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Booking Configuration' },
      { label: 'Booking Flows' },
    ]);
  }, [setBreadcrumbs]);


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

  // Error handling is now managed by the ErrorDisplay component

  // Modern header actions
  const headerActions: HeaderAction[] = [
    createRefreshAction(() => refetchFlows()),
    ...(hasActiveFilters ? [{
      icon: <FilterIcon />,
      label: 'Clear Filters',
      variant: 'outlined' as const,
      onClick: handleClearFilters,
      tooltip: 'Clear all active filters',
    } as HeaderAction] : []),
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
      <ErrorDisplay 
        errors={{
          ...(flowsError ? { flows: flowsError } : {}),
          ...(_eventTypesError ? { eventTypes: _eventTypesError } : {}),
          ...(createError ? { create: createError } : {}),
          ...(updateError ? { update: updateError } : {}),
          ...(deleteError ? { delete: deleteError } : {}),
          ...(duplicateError ? { duplicate: duplicateError } : {}),
        }}
        title="Booking Flow Management Error"
        variant="card"
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
        {_viewMode === 'table' ? (
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