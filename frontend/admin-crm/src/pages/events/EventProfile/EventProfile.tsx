// Event Profile Page — Orchestrator
// Composes sub-components: overview cards, check-in, tabs, dialogs

import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EventNote as EventNoteIcon,
  MoreVert as MoreVertIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';
import { ModernPageHeader, type HeaderAction } from '@/components/common/ModernPageHeader';
import { InquiryDetails } from '@/components/events/InquiryDetails';
import { FinancialSummary } from '@/components/common';
import { EVENT_STATUSES } from '@/types/events.types';
import { useEventProfileLogic } from './useEventProfileLogic';
import { EventOverviewCards } from './EventOverviewCards';
import { CheckInOutCard } from './CheckInOutCard';
import { EventProfileTabs } from './EventProfileTabs';
import { EventProfileDialogs } from './EventProfileDialogs';

export const EventProfile: React.FC = () => {
  const logic = useEventProfileLogic();

  const {
    event,
    client,
    clientId,
    eventId,
    navigate,
    isLoading,
    error,
    refetch,
    // Workflow
    transformedWorkflowStages,
    isLoadingStages,
    // Computed
    financialMetrics,
    activityItems,
    communicationsCount,
    questionnairesCount,
    // Tab
    tabValue,
    setTabValue,
    // Menu
    anchorEl,
    handleMenuClick,
    handleMenuClose,
    handleEditEvent,
    handleDeleteEvent,
    // Dialogs
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    headcountDialogOpen,
    setHeadcountDialogOpen,
    checkInDialogOpen,
    setCheckInDialogOpen,
    checkOutDialogOpen,
    setCheckOutDialogOpen,
    noShowDialogOpen,
    setNoShowDialogOpen,
    checkInNotes,
    setCheckInNotes,
    checkOutNotes,
    setCheckOutNotes,
    isProcessingCheckIn,
    // Handlers
    handleEdit,
    handleDelete,
    handleCheckIn,
    handleCheckout,
    handleNoShow,
    isUpdatingEvent,
    isDeletingEvent,
    // Utilities
    formatEventPrice,
    formatCheckInTime,
    canPerformCheckIn,
    canPerformCheckout,
    getStatusColor,
  } = logic;

  if (isLoading) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </ModernPageLayout>
    );
  }

  if (error || !event) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/events')}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Back to Events
        </Button>
        <Alert severity="error">
          {error ? 'Failed to load event information' : 'Event not found'}
        </Alert>
      </ModernPageLayout>
    );
  }

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Page Header */}
      <ModernPageHeader
        title={event.name || 'Untitled Event'}
        subtitle={event.event_type_name || 'No event type'}
        icon={<EventNoteIcon />}
        status={{
          label: EVENT_STATUSES.find((s) => s.value === event.status)?.label || event.status,
          color: getStatusColor(event.status) as
            | 'primary'
            | 'secondary'
            | 'success'
            | 'warning'
            | 'error'
            | 'info',
          variant: 'outlined',
        }}
        primaryAction={{
          label: 'Edit',
          onClick: handleEditEvent,
          icon: <EditIcon />,
          variant: 'contained',
          color: 'primary',
        }}
        secondaryActions={[
          {
            label: 'Back to Events',
            onClick: () => navigate('/events'),
            icon: <ArrowBackIcon />,
            variant: 'outlined',
            tooltip: 'Back to Events',
          } as HeaderAction,
          {
            label: 'More',
            onClick: handleMenuClick,
            icon: <MoreVertIcon />,
            variant: 'icon',
            tooltip: 'More actions',
          } as HeaderAction,
        ]}
      />

      {/* More Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            setHeadcountDialogOpen(true);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText>Update Headcount</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteEvent} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText>Delete Event</ListItemText>
        </MenuItem>
      </Menu>

      {/* Overview Cards */}
      <EventOverviewCards
        event={event}
        client={client}
        clientId={clientId}
        navigate={navigate}
        transformedWorkflowStages={transformedWorkflowStages}
        isLoadingStages={isLoadingStages}
        formatEventPrice={formatEventPrice}
      />

      {/* Inquiry Details (shown for leads from contact form) */}
      {event.preferences?.inquiry && (
        <Box sx={{ mb: 4 }}>
          <InquiryDetails inquiry={event.preferences.inquiry} />
        </Box>
      )}

      {/* Check-in/Out Tracking */}
      <CheckInOutCard
        event={event}
        formatCheckInTime={formatCheckInTime}
        formatEventPrice={formatEventPrice}
        canPerformCheckIn={canPerformCheckIn}
        canPerformCheckout={canPerformCheckout}
        onCheckIn={() => setCheckInDialogOpen(true)}
        onCheckOut={() => setCheckOutDialogOpen(true)}
        onNoShow={() => setNoShowDialogOpen(true)}
      />

      {/* Financial Summary */}
      <Stack spacing={4} mb={4}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <FinancialSummary
            title="Event Financials"
            metrics={financialMetrics}
            compactMode={false}
          />
        </Box>
      </Stack>

      {/* Tabs */}
      <EventProfileTabs
        event={event}
        clientId={clientId}
        clientEmail={client?.email || ''}
        clientName={event.client_name || 'Unknown Client'}
        eventId={eventId}
        tabValue={tabValue}
        onTabChange={setTabValue}
        activityItems={activityItems}
        communicationsCount={communicationsCount}
        questionnairesCount={questionnairesCount}
        onRefresh={refetch}
      />

      {/* All Dialogs */}
      <EventProfileDialogs
        event={event}
        editDialogOpen={editDialogOpen}
        onEditClose={() => setEditDialogOpen(false)}
        onEdit={handleEdit}
        isUpdatingEvent={isUpdatingEvent}
        deleteDialogOpen={deleteDialogOpen}
        onDeleteClose={() => setDeleteDialogOpen(false)}
        onDelete={handleDelete}
        isDeletingEvent={isDeletingEvent}
        checkInDialogOpen={checkInDialogOpen}
        onCheckInClose={() => setCheckInDialogOpen(false)}
        onCheckIn={handleCheckIn}
        checkInNotes={checkInNotes}
        onCheckInNotesChange={setCheckInNotes}
        checkOutDialogOpen={checkOutDialogOpen}
        onCheckOutClose={() => setCheckOutDialogOpen(false)}
        onCheckout={handleCheckout}
        checkOutNotes={checkOutNotes}
        onCheckOutNotesChange={setCheckOutNotes}
        noShowDialogOpen={noShowDialogOpen}
        onNoShowClose={() => setNoShowDialogOpen(false)}
        onNoShow={handleNoShow}
        isProcessingCheckIn={isProcessingCheckIn}
        headcountDialogOpen={headcountDialogOpen}
        onHeadcountClose={() => setHeadcountDialogOpen(false)}
      />
    </ModernPageLayout>
  );
};
