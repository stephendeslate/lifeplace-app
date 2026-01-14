// Booking Flow Steps Settings Page - Unified Settings System
// Manages all booking flow steps and their configurations

import React, { useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  List as StepsIcon,
  Settings as ConfigIcon,
  DragIndicator as DragIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Typography,
  Alert,
  Stack,
  Button,
} from '@mui/material';
import {
  PermissionAwareSettingsPage,
  type SettingsPageConfig,
  type SettingsTableColumn
} from '../../../components/common/settings';
import { Container } from '@mui/material';
import {
  useBookingFlowSteps,
  useBookingFlows,
} from '../../../hooks/useBookingFlows';
import type {
  BookingFlowStep,
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
  StepType,
} from '../../../types/bookingflows.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';
import type { HeaderAction } from '../../../components/common/ModernPageHeader';
import { StepConfigurationPanel } from '../../../components/bookingflows/steps/StepConfigurationPanel';
import { ImprovedStepReorderList, type ImprovedStepReorderListRef } from '../../../components/bookingflows/steps/ImprovedStepReorderList';
import { ModernDialog, createStandardActions } from '../../../components/common';
import { SettingsTable } from '../../../components/common/settings/SettingsTable';
import { SettingsFormDialog } from '../../../components/common/settings/SettingsFormDialog';
import type { ModernTableAction } from '../../../components/common/ModernTable';

// Step type options for the form (matches backend STEP_TYPES)
const STEP_TYPE_OPTIONS = [
  { value: 'introduction', label: 'Introduction' },
  { value: 'venue_selection', label: 'Venue Selection' },
  { value: 'date_time', label: 'Date & Time Selection' },
  { value: 'questionnaire', label: 'Questionnaire' },
  { value: 'package_selection', label: 'Package Selection' },
  { value: 'addon_selection', label: 'Add-on Selection' },
  { value: 'pricing_summary', label: 'Pricing Summary' },
  { value: 'contact_info', label: 'Contact Information' },
  { value: 'payment_info', label: 'Payment Information' },
  { value: 'confirmation', label: 'Confirmation' },
];

// Table columns configuration
const columns: SettingsTableColumn<BookingFlowStep>[] = [
  {
    key: 'order',
    label: 'Order',
    align: 'center',
    width: '60px',
    render: (value) => (
      <Chip
        label={String(value)}
        size="small"
        variant="outlined"
        color="default"
      />
    ),
  },
  {
    key: 'step_type_display',
    label: 'Type',
    render: (value, row) => {
      const colors: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'secondary' | 'error' | 'default'> = {
        introduction: 'primary',
        venue_selection: 'info',
        date_time: 'info',
        questionnaire: 'success',
        package_selection: 'warning',
        addon_selection: 'warning',
        pricing_summary: 'secondary',
        contact_info: 'success',
        payment_info: 'error',
        review_booking: 'secondary',
        confirmation: 'success',
        availability_check: 'warning',
      };

      const isDeprecated = (row.step_type as string) === 'availability_check';
      
      return (
        <Chip
          label={String(value)}
          size="small"
          color={isDeprecated ? 'warning' : colors[row.step_type as string] || 'default'}
          variant={isDeprecated ? 'filled' : 'outlined'}
          icon={isDeprecated ? <WarningIcon /> : undefined}
        />
      );
    },
  },
  {
    key: 'is_required',
    label: 'Required',
    align: 'center',
    render: (value) => value ? (
      <Chip label="Required" size="small" color="error" variant="outlined" />
    ) : (
      <Typography variant="caption" color="text.secondary">Optional</Typography>
    ),
  },
];

// Form sections for creating/editing steps
const formSections: ModernFormSection[] = [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'step_type',
        label: 'Step Type',
        type: 'select',
        required: true,
        helperText: 'The type of step - this determines the step name displayed to users',
        options: STEP_TYPE_OPTIONS,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        multiline: true,
        rows: 2,
        placeholder: 'Brief description of what this step does...',
        helperText: 'Optional description for internal reference',
      },
    ],
  },
  {
    title: 'Step Behavior',
    fields: [
      {
        name: 'is_enabled',
        label: 'Enabled',
        type: 'switch',
        helperText: 'Whether this step is active in the booking flow',
      },
      {
        name: 'is_required',
        label: 'Required',
        type: 'switch',
        helperText: 'Whether clients must complete this step',
      },
      {
        name: 'is_skippable',
        label: 'Skippable',
        type: 'switch',
        helperText: 'Whether clients can skip this step',
      },
    ],
  },
];

// Note: Display order is intentionally not in the form - it's auto-assigned
// based on existing steps and can be changed via the "Reorder Steps" dialog

// Embedded table component for use within BookingFlowDetails
interface EmbeddedStepsTableProps {
  sortedSteps: BookingFlowStep[];
  isLoadingSteps: boolean;
  stepsError: Error | null;
  customTableActions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: (step: BookingFlowStep) => void;
    color?: 'default' | 'primary' | 'secondary' | 'error';
    show?: (step: BookingFlowStep) => boolean;
  }>;
  customHeaderActions: HeaderAction[];
  handleCreate: (data: BookingFlowStep) => Promise<void>;
  handleUpdate: (id: string | number, data: BookingFlowStep) => Promise<void>;
  handleDelete: (id: string | number) => Promise<void>;
  defaultStepValues: BookingFlowStep;
  formSections: ModernFormSection[];
  isCreatingStep: boolean;
  isUpdatingStep: boolean;
  isDeletingStep: boolean;
}

const EmbeddedStepsTable: React.FC<EmbeddedStepsTableProps> = ({
  sortedSteps,
  isLoadingSteps,
  stepsError,
  customTableActions,
  customHeaderActions,
  handleCreate,
  handleUpdate,
  handleDelete,
  defaultStepValues,
  formSections,
  isCreatingStep,
  isUpdatingStep,
  isDeletingStep,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BookingFlowStep | null>(null);

  const tableActions = [
    ...customTableActions.map(action => ({
      ...action,
      onClick: action.onClick,
    })),
    ...createStandardActions(
      (item: BookingFlowStep) => {
        setEditingItem(item);
        setDialogOpen(true);
      },
      (item: BookingFlowStep) => handleDelete(item.id)
    ),
  ];

  const handleFormSubmit = async (formData: BookingFlowStep) => {
    if (editingItem) {
      await handleUpdate(editingItem.id, formData);
    } else {
      await handleCreate(formData);
    }
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleFormDelete = async (item: BookingFlowStep) => {
    await handleDelete(item.id);
  };

  return (
    <Box>
      {/* Action buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Booking Flow Steps ({sortedSteps.length})
        </Typography>
        <Box display="flex" gap={1}>
          {customHeaderActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant === 'icon' ? 'outlined' : (action.variant || 'outlined')}
              startIcon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          ))}
          <Button
            variant="contained"
            startIcon={<StepsIcon />}
            onClick={() => {
              setEditingItem(null);
              setDialogOpen(true);
            }}
            disabled={isCreatingStep}
          >
            {isCreatingStep ? 'Adding...' : 'Add Step'}
          </Button>
        </Box>
      </Box>

      {/* Settings Table */}
      <SettingsTable
        data={sortedSteps as unknown as Record<string, unknown>[]}
        columns={columns as unknown as SettingsTableColumn<Record<string, unknown>>[]}
        actions={tableActions as unknown as ModernTableAction<Record<string, unknown>>[]}
        searchable={true}
        searchFields={['step_type_display']}
        isLoading={isLoadingSteps}
        error={stepsError?.message}
        emptyState={{
          icon: <StepsIcon />,
          title: 'No steps configured',
          description: 'Add steps to guide clients through the booking process',
          primaryAction: {
            label: 'Add First Step',
            onClick: () => {
              setEditingItem(null);
              setDialogOpen(true);
            },
          },
        }}
      />

      {/* Form Dialog */}
      <SettingsFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingItem(null);
        }}
        title="Booking Flow Step"
        subtitle="Configure step properties and behavior"
        sections={formSections}
        item={editingItem as unknown as Record<string, unknown> | null}
        defaultValues={defaultStepValues as unknown as Record<string, unknown>}
        onSubmit={async (data: Record<string, unknown>) => handleFormSubmit(data as unknown as BookingFlowStep)}
        onDelete={editingItem ? async (item: Record<string, unknown>) => handleFormDelete(item as unknown as BookingFlowStep) : undefined}
        maxWidth="lg"
        showDelete={Boolean(editingItem)}
        isSubmitting={editingItem ? isUpdatingStep : isCreatingStep}
        isDeleting={isDeletingStep}
      />
    </Box>
  );
};

// Default values for new step
const defaultStepValues: BookingFlowStep = {
  id: 0,
  booking_flow: 0,
  description: '',
  step_type: 'contact_info' as StepType,
  step_type_display: 'Contact Information',
  order: 1,
  is_enabled: true,
  is_required: true,
  is_skippable: false,
  display_conditions: {},
  validation_rules: {},
  configuration: {},
  configuration_data: undefined,
  created_at: '',
  updated_at: '',
};

interface BookingFlowStepsProps {
  embedded?: boolean; // When true, doesn't add its own container
}

export const BookingFlowSteps: React.FC<BookingFlowStepsProps> = ({
  embedded = false
}) => {
  const { id } = useParams<{ id: string }>();
  const flowId = parseInt(id || '0');

  const [selectedStep, setSelectedStep] = useState<BookingFlowStep | null>(null);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [hasReorderChanges, setHasReorderChanges] = useState(false);
  const reorderListRef = useRef<ImprovedStepReorderListRef>(null);
  
  // Hooks
  const { useBookingFlow } = useBookingFlows();
  const { data: flow } = useBookingFlow(flowId);
  
  const {
    useFlowSteps,
    createStep,
    updateStep,
    deleteStep,
    migrateAvailabilityStep,
    isCreatingStep,
    isUpdatingStep,
    isDeletingStep,
    isMigratingAvailability: _isMigratingAvailability,
    isReorderingSteps,
  } = useBookingFlowSteps();
  
  const { 
    data: steps = [], 
    isLoading: isLoadingSteps,
    refetch: refetchSteps,
    error: stepsError,
  } = useFlowSteps(flowId);

  // Sort steps by order (memoized to prevent unnecessary recalculation and reference changes)
  const sortedSteps = useMemo(() =>
    [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [steps]
  );

  // Check for deprecated steps
  const hasDeprecatedSteps = sortedSteps.some(step => (step.step_type as string) === 'availability_check');

  // Handle step creation
  const handleCreate = async (data: BookingFlowStep) => {
    // Calculate next order based on existing steps (max order + 1)
    const maxOrder = steps.reduce((max, step) => Math.max(max, step.order ?? 0), 0);
    const nextOrder = maxOrder + 1;

    const createData: CreateBookingFlowStepData = {
      booking_flow: flowId,
      description: data.description,
      step_type: data.step_type,
      order: nextOrder,
      is_enabled: data.is_enabled,
      is_required: data.is_required,
      is_skippable: data.is_skippable,
    };
    
    return new Promise<void>((resolve, reject) => {
      createStep(createData, {
        onSuccess: () => {
          refetchSteps();
          resolve();
        },
        onError: reject,
      });
    });
  };

  // Handle step update
  const handleUpdate = async (id: string | number, data: BookingFlowStep) => {
    const updateData: UpdateBookingFlowStepData = {
      description: data.description,
      step_type: data.step_type,
      order: data.order,
      is_enabled: data.is_enabled,
      is_required: data.is_required,
      is_skippable: data.is_skippable,
    };
    
    return new Promise<void>((resolve, reject) => {
      updateStep({
        id: Number(id),
        data: updateData,
      }, {
        onSuccess: () => {
          refetchSteps();
          resolve();
        },
        onError: reject,
      });
    });
  };

  // Handle step deletion
  const handleDelete = async (id: string | number) => {
    return new Promise<void>((resolve, reject) => {
      deleteStep(Number(id), {
        onSuccess: () => {
          refetchSteps();
          resolve();
        },
        onError: reject,
      });
    });
  };

  // Handle configuration click
  const handleConfigure = (step: BookingFlowStep) => {
    setSelectedStep(step);
    setShowConfiguration(true);
  };

  // Handle migration for deprecated steps
  const handleMigrate = (step: BookingFlowStep) => {
    if ((step.step_type as string) === 'availability_check') {
      migrateAvailabilityStep(step.id, {
        onSuccess: () => refetchSteps(),
      });
    }
  };

  // Handle save order from dialog button
  const handleSaveOrder = async () => {
    if (reorderListRef.current) {
      await reorderListRef.current.save();
    }
  };

  // Custom header actions
  const customHeaderActions: HeaderAction[] = [
    {
      label: 'Reorder Steps',
      icon: <DragIcon />,
      onClick: () => setShowReorder(true),
      disabled: steps.length <= 1 || isReorderingSteps,
      variant: 'outlined',
    },
  ];
  
  // Custom table actions
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
      color: 'secondary' as const,  // Changed from 'warning' to 'secondary'
      show: (step: BookingFlowStep) => (step.step_type as string) === 'availability_check',
    },
  ];

  // Configuration for SettingsPage
  const config: SettingsPageConfig<BookingFlowStep> = {
    page: {
      title: `${flow?.name || 'Booking Flow'} Steps`,
      subtitle: 'Manage and configure the steps in this booking flow',
      icon: <StepsIcon />,
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Booking Configuration' },
        { label: 'Booking Flows', href: '/settings/booking/booking-flow' },
        { label: flow?.name || 'Flow', href: `/settings/booking/booking-flow/${flowId}` },
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
      {/* Deprecation Warning */}
      {hasDeprecatedSteps && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Deprecated Step Type Detected
          </Typography>
          <Typography variant="body2">
            "Availability Check" steps are no longer supported and have been integrated into "Date & Time" steps.
            Use the migrate option to convert these steps automatically.
          </Typography>
        </Alert>
      )}

      {/* Main Settings Page or Embedded Table */}
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
          isCreating={isCreatingStep}
          isUpdating={isUpdatingStep}
          isDeleting={isDeletingStep}
          customHeaderActions={customHeaderActions}
          customTableActions={customTableActions}
        />
      )}

      {/* Step Configuration Panel */}
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

      {/* Reorder Steps Dialog */}
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
                // Only close if save was successful (no error thrown)
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
              Drag and drop steps to change their order in the booking flow.
              The order affects how clients progress through your booking process.
            </Typography>

            <Box>
              <ImprovedStepReorderList
                ref={reorderListRef}
                flowId={flowId}
                steps={sortedSteps}
                onReorderComplete={() => {
                  refetchSteps();
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

  // Return with or without container based on context
  return embedded ? content : (
    <Container maxWidth="xl" sx={{ px: 0 }}>
      {content}
    </Container>
  );
};

export default BookingFlowSteps;