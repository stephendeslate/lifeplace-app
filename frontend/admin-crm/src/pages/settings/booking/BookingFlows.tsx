// frontend/admin-crm/src/pages/settings/booking/BookingFlows.tsx

import { Add as AddIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLayout } from "../../../contexts/LayoutContext";
import { useEventTypes } from "../../../hooks/useEvents";
import { useBookingFlows } from "../../../hooks/useBookingFlows";
import { BookingFlowCard } from "../../../components/bookingflow/BookingFlowCard";
import { BookingFlowFiltersComponent } from "../../../components/bookingflow/BookingFlowFilters";
import { DuplicateDialog, DeleteDialog } from "../../../components/bookingflow/BookingFlowDialogs";
import type {
  BookingFlow,
  BookingFlowFilters,
  DuplicateBookingFlowData,
} from "../../../types/bookingflows.types";

export const BookingFlows: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [filters, setFilters] = useState<BookingFlowFilters>({});
  const [duplicateDialog, setDuplicateDialog] = useState<{
    open: boolean;
    flow: BookingFlow | null;
  }>({ open: false, flow: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    flow: BookingFlow | null;
  }>({ open: false, flow: null });

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Booking Configuration' },
      { label: 'Booking Flows' },
    ]);
  }, [setBreadcrumbs]);

  // Hooks
  const {
    flows,
    isLoading,
    error,
    duplicateFlow,
    isDuplicating,
    deleteFlow,
    isDeleting,
    toggleTestMode,
    isTogglingTestMode,
  } = useBookingFlows(filters);

  const { eventTypes } = useEventTypes();

  // Handlers
  const handleCreateNew = () => {
    navigate('/settings/booking/booking-flow/new');
  };

  const handleEdit = (flow: BookingFlow) => {
    navigate(`/settings/booking/booking-flow/${flow.id}`);
  };

  const handleDuplicate = (flow: BookingFlow) => {
    setDuplicateDialog({ open: true, flow });
  };

  const handleDuplicateConfirm = async (data: DuplicateBookingFlowData) => {
    if (duplicateDialog.flow) {
      try {
        const newFlow = await duplicateFlow(duplicateDialog.flow.id, data);
        setDuplicateDialog({ open: false, flow: null });
        navigate(`/settings/booking/booking-flow/${newFlow.id}`);
      } catch (error) {
        console.error('Duplicate failed:', error);
      }
    }
  };

  const handleDelete = (flow: BookingFlow) => {
    setDeleteDialog({ open: true, flow });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.flow) {
      try {
        await deleteFlow(deleteDialog.flow.id);
        setDeleteDialog({ open: false, flow: null });
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleToggleTestMode = async (flow: BookingFlow) => {
    try {
      await toggleTestMode(flow.id);
    } catch (error) {
      console.error('Toggle test mode failed:', error);
    }
  };

  const handlePreview = async (flow: BookingFlow) => {
    try {
      window.open(`/booking/${flow.id}/preview`, '_blank');
    } catch (error) {
      console.error('Failed to preview flow:', error);
    }
  };

  const handleViewAnalytics = (flow: BookingFlow) => {
    navigate(`/settings/booking/flows/${flow.id}/analytics`);
  };

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Error loading booking flows. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Booking Flows
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Create Flow
        </Button>
      </Box>

      {/* Filters */}
      <BookingFlowFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        eventTypes={eventTypes}
      />

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && flows.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              No booking flows found
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              {filters.search || filters.event_type_id || filters.is_active !== undefined
                ? 'Try adjusting your filters or create a new booking flow.'
                : 'Get started by creating your first booking flow.'}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateNew}>
              Create Your First Flow
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Flows Grid */}
      {!isLoading && flows.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          '@media (min-width: 768px)': {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: 3,
          },
        }}>
          {flows.map((flow) => (
            <BookingFlowCard
              key={flow.id}
              flow={flow}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onToggleTestMode={handleToggleTestMode}
              onPreview={handlePreview}
              onViewAnalytics={handleViewAnalytics}
              isLoading={isTogglingTestMode}
            />
          ))}
        </Box>
      )}

      {/* Dialogs */}
      <DuplicateDialog
        open={duplicateDialog.open}
        flow={duplicateDialog.flow}
        onClose={() => setDuplicateDialog({ open: false, flow: null })}
        onConfirm={handleDuplicateConfirm}
        isLoading={isDuplicating}
      />

      <DeleteDialog
        open={deleteDialog.open}
        flow={deleteDialog.flow}
        onClose={() => setDeleteDialog({ open: false, flow: null })}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </Box>
  );
};