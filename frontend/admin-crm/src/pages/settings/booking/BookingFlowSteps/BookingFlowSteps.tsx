import React from 'react';
import {
  List as StepsIcon,
  Settings as ConfigIcon,
  DragIndicator as DragIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Box, Typography, Alert, Stack, Container } from '@mui/material';
import { PermissionAwareSettingsPage, type SettingsPageConfig } from '@/components/common/settings';
import type { BookingFlowStep } from '@/types/bookingflows';
import type { HeaderAction } from '@/components/common/ModernPageHeader';
import { StepConfigurationPanel } from '@/components/bookingflows/steps/StepConfigurationPanel';
import { ImprovedStepReorderList } from '@/components/bookingflows/steps/ImprovedStepReorderList';
import { ModernDialog } from '@/components/common';
import { columns, formSections, defaultStepValues } from './constants';
import { useBookingFlowStepsLogic } from './useBookingFlowStepsLogic';
import { EmbeddedStepsTable } from './EmbeddedStepsTable';

interface BookingFlowStepsProps {
  embedded?: boolean;
}

export const BookingFlowSteps: React.FC<BookingFlowStepsProps> = ({ embedded = false }) => {
  const {
    flowId,
    flow,
    paginationState,
    selectedStep,
    setSelectedStep,
    showConfiguration,
    setShowConfiguration,
    showReorder,
    setShowReorder,
    hasReorderChanges,
    setHasReorderChanges,
    reorderListRef,
    sortedSteps,
    allSortedSteps,
    hasDeprecatedSteps,
    totalCount,
    pageCount,
    isCreatingStep,
    isUpdatingStep,
    isDeletingStep,
    isReorderingSteps,
    isLoadingSteps,
    stepsError,
    refetchSteps,
    refetchAllSteps,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleFetchItem,
    handleConfigure,
    handleMigrate,
    handleSaveOrder,
  } = useBookingFlowStepsLogic();

  const customHeaderActions: HeaderAction[] = [
    {
      label: 'Reorder Steps',
      icon: <DragIcon />,
      onClick: () => setShowReorder(true),
      disabled: totalCount <= 1 || isReorderingSteps,
      variant: 'outlined',
    },
  ];

  const customTableActions = [
    {
      label: 'Configure',
      icon: <ConfigIcon />,
      onClick: (step: BookingFlowStep) => handleConfigure(step),
      color: 'primary' as const,
      show: (step: BookingFlowStep) => (step.step_type as string) !== 'availability_check',
    },
    {
      label: 'Migrate to Date & Time',
      icon: <WarningIcon />,
      onClick: (step: BookingFlowStep) => handleMigrate(step),
      color: 'secondary' as const,
      show: (step: BookingFlowStep) => (step.step_type as string) === 'availability_check',
    },
  ];

  const config: SettingsPageConfig<BookingFlowStep> = {
    page: {
      title: `${flow?.name || 'Booking Flow'} Steps`,
      subtitle: 'Manage and configure the steps in this booking flow',
      icon: <StepsIcon />,
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Booking Configuration' },
        { label: 'Booking Flows', href: '/settings/booking/booking-flow' },
        {
          label: flow?.name || 'Flow',
          href: `/settings/booking/booking-flow/${flowId}`,
        },
        { label: 'Steps' },
      ],
    },

    table: {
      columns,
      searchFields: ['step_type_display'],
      defaultSort: { key: 'order', order: 'asc' },
      emptyState: {
        icon: <StepsIcon />,
        title: 'No steps configured',
        description: 'Add steps to guide clients through the booking process',
      },
    },

    form: {
      title: 'Booking Flow Step',
      subtitle: 'Configure step properties and behavior',
      sections: formSections,
      maxWidth: 'lg',
    },

    features: {
      create: true,
      edit: true,
      delete: true,
      duplicate: false,
      search: true,
      refresh: true,
    },
  };

  const content = (
    <>
      {hasDeprecatedSteps && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Deprecated Step Type Detected
          </Typography>
          <Typography variant="body2">
            "Availability Check" steps are no longer supported and have been integrated into "Date &
            Time" steps. Use the migrate option to convert these steps automatically.
          </Typography>
        </Alert>
      )}

      {embedded ? (
        <EmbeddedStepsTable
          sortedSteps={sortedSteps}
          isLoadingSteps={isLoadingSteps}
          stepsError={stepsError}
          customTableActions={customTableActions}
          customHeaderActions={customHeaderActions}
          handleCreate={handleCreate}
          defaultStepValues={defaultStepValues}
          formSections={formSections}
          isCreatingStep={isCreatingStep}
          isUpdatingStep={isUpdatingStep}
          isDeletingStep={isDeletingStep}
          handleUpdate={handleUpdate}
          handleDelete={handleDelete}
        />
      ) : (
        <PermissionAwareSettingsPage
          config={config}
          requiredPermissions={['can_manage_booking_flows']}
          data={sortedSteps}
          defaultValues={defaultStepValues}
          isLoading={isLoadingSteps}
          error={stepsError?.message}
          onRefresh={() => refetchSteps()}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onFetchItem={handleFetchItem}
          isCreating={isCreatingStep}
          isUpdating={isUpdatingStep}
          isDeleting={isDeletingStep}
          customHeaderActions={customHeaderActions}
          customTableActions={customTableActions}
          pagination={{
            totalCount,
            currentPage: paginationState.currentPage,
            pageSize: paginationState.pageSize,
            pageCount,
            onPageChange: paginationState.onPageChange,
            onPageSizeChange: paginationState.onPageSizeChange,
          }}
          onSearchChange={paginationState.setSearch}
          onFilterChange={paginationState.setFilters}
          onSortChange={paginationState.setOrdering}
        />
      )}

      {showConfiguration && selectedStep && (
        <ModernDialog
          open={showConfiguration}
          onClose={() => {
            setShowConfiguration(false);
            setSelectedStep(null);
          }}
          title={`Configure: ${selectedStep.step_type_display}`}
          maxWidth="xl"
          fullWidth
        >
          <StepConfigurationPanel
            step={selectedStep}
            onUpdate={(updatedStep) => {
              refetchSteps();
              setSelectedStep(updatedStep);
            }}
          />
        </ModernDialog>
      )}

      {showReorder && (
        <ModernDialog
          open={showReorder}
          onClose={() => setShowReorder(false)}
          title="Reorder Booking Flow Steps"
          maxWidth="lg"
          fullWidth
          disableEscapeKeyDown={isReorderingSteps}
          disableBackdropClick={isReorderingSteps}
          actions={[
            {
              label: 'Cancel',
              onClick: () => setShowReorder(false),
              variant: 'outlined',
              disabled: isReorderingSteps,
            },
            {
              label: isReorderingSteps ? 'Saving...' : 'Save Order',
              onClick: async () => {
                await handleSaveOrder();
                setShowReorder(false);
                setHasReorderChanges(false);
              },
              variant: 'contained',
              color: 'primary',
              loading: isReorderingSteps,
              disabled: !hasReorderChanges,
            },
          ]}
        >
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Drag and drop steps to change their order in the booking flow. The order affects how
              clients progress through your booking process.
            </Typography>

            <Box>
              <ImprovedStepReorderList
                ref={reorderListRef}
                flowId={flowId}
                steps={allSortedSteps}
                onReorderComplete={() => {
                  refetchSteps();
                  refetchAllSteps();
                  setShowReorder(false);
                  setHasReorderChanges(false);
                }}
                onHasChangesChange={setHasReorderChanges}
              />
            </Box>
          </Stack>
        </ModernDialog>
      )}
    </>
  );

  return embedded ? (
    content
  ) : (
    <Container maxWidth="xl" sx={{ px: 0 }}>
      {content}
    </Container>
  );
};

export default BookingFlowSteps;
