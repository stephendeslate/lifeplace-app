// frontend/admin-crm/src/components/bookingflows/steps/BookingFlowStepsTable.tsx

import React from 'react';
import {
  Chip,
  Typography,
  Box,
  Tooltip,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
// Modern Design System imports
import { 
  ModernTable,
  ModernEmptyState,
  type ModernTableColumn,
  type ModernTableAction
} from '../../common';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Settings as ConfigIcon,
  Visibility as PreviewIcon,
  CheckCircle as EnabledIcon,
  RadioButtonUnchecked as DisabledIcon,
  SkipNext as SkippableIcon,
  Warning as WarningIcon,
  Update as MigrateIcon,
} from '@mui/icons-material';
import type { 
  BookingFlowStep,
  StepType,
} from '../../../types/bookingflows.types';
import { useBookingFlowSteps } from '../../../hooks/useBookingFlows';

interface BookingFlowStepsTableProps {
  flowId: number;
  onEdit: (step: BookingFlowStep) => void;
  onConfigure: (step: BookingFlowStep) => void;
  onReorder?: () => void; // Callback to open reorder interface
}

export const BookingFlowStepsTable: React.FC<BookingFlowStepsTableProps> = ({
  flowId,
  onEdit,
  onConfigure,
  // onReorder is intentionally not destructured as it's handled in the column definition
}) => {
  const {
    useFlowSteps,
    deleteStep,
    migrateAvailabilityStep,
    isMigratingAvailability,
  } = useBookingFlowSteps();

  const { 
    data: steps = [], 
    isLoading,
    error,
  } = useFlowSteps(flowId);

  const getStepTypeChip = (stepType: StepType, stepTypeDisplay: string) => {
    const colors = {
      introduction: 'primary',
      date_time: 'info',
      questionnaire: 'success',
      package_selection: 'warning',
      addon_selection: 'warning',
      pricing_summary: 'secondary',
      contact_info: 'success',
      payment_info: 'error',
      review_booking: 'secondary',
      confirmation: 'success',
    } as const;

    // Special handling for deprecated availability_check
    if (stepType as string === 'availability_check') {
      return (
        <Chip
          label={stepTypeDisplay}
          size="small"
          color="warning"
          variant="filled"
          icon={<WarningIcon />}
        />
      );
    }

    return (
      <Chip
        label={stepTypeDisplay}
        size="small"
        color={colors[stepType as keyof typeof colors] || 'default'}
        variant="outlined"
      />
    );
  };

  const getStatusIcon = (step: BookingFlowStep) => {
    if (!step.is_enabled) {
      return (
        <Tooltip title="Step is disabled">
          <DisabledIcon color="disabled" fontSize="small" />
        </Tooltip>
      );
    }

    return (
      <Tooltip title="Step is enabled">
        <EnabledIcon color="success" fontSize="small" />
      </Tooltip>
    );
  };

  const getBehaviorChips = (step: BookingFlowStep) => {
    const chips = [];

    if (step.is_required) {
      chips.push(
        <Chip
          key="required"
          label="Required"
          size="small"
          color="error"
          variant="outlined"
        />
      );
    }

    if (step.is_skippable) {
      chips.push(
        <Chip
          key="skippable"
          label="Skippable"
          size="small"
          color="info"
          variant="outlined"
          icon={<SkippableIcon />}
        />
      );
    }

    return chips;
  };

  const hasDisplayConditions = (step: BookingFlowStep) => {
    return step.display_conditions && Object.keys(step.display_conditions).length > 0;
  };

  const hasValidationRules = (step: BookingFlowStep) => {
    return step.validation_rules && Object.keys(step.validation_rules).length > 0;
  };

  const hasConfiguration = (step: BookingFlowStep) => {
    return step.configuration_data || (step.configuration && Object.keys(step.configuration).length > 0);
  };

  const isDeprecatedStep = (step: BookingFlowStep) => {
    return (step.step_type as string) === 'availability_check';
  };

  // Error handling
  if (error) {
    return (
      <Alert severity="error">
        Failed to load steps: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  // Sort steps by order
  const sortedSteps = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const hasDeprecatedSteps = sortedSteps.some(step => isDeprecatedStep(step));

  const columns: ModernTableColumn<BookingFlowStep>[] = [
    {
      key: 'drag',
      label: '',
      width: '30px',
      render: () => <DragIcon color="action" fontSize="small" />,
    },
    {
      key: 'status',
      label: 'Status',
      width: '40px',
      render: (_, step) => (
        <Box display="flex" alignItems="center" gap={0.5}>
          {getStatusIcon(step)}
          {isDeprecatedStep(step) && (
            <Tooltip title="Deprecated step type">
              <WarningIcon color="warning" fontSize="small" />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      key: 'name',
      label: 'Step Name',
      sortable: true,
      render: (_, step) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {step.name}
          </Typography>
          {step.description && (
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{
                display: 'block',
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {step.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'step_type',
      label: 'Type',
      render: (_, step) => getStepTypeChip(step.step_type, step.step_type_display),
    },
    {
      key: 'order',
      label: 'Order',
      align: 'center',
      render: (_, step) => (
        <Chip
          label={step.order}
          size="small"
          variant="outlined"
          color="default"
        />
      ),
    },
    {
      key: 'behavior',
      label: 'Behavior',
      render: (_, step) => (
        <Box display="flex" flexWrap="wrap" gap={0.5}>
          {getBehaviorChips(step)}
        </Box>
      ),
    },
    {
      key: 'configuration',
      label: 'Configuration',
      render: (_, step) => (
        <Box display="flex" alignItems="center" gap={1}>
          {hasDisplayConditions(step) && (
            <Tooltip title="Has display conditions">
              <Chip
                label="Conditional"
                size="small"
                color="info"
                variant="outlined"
              />
            </Tooltip>
          )}
          
          {hasValidationRules(step) && (
            <Tooltip title="Has validation rules">
              <Chip
                label="Validated"
                size="small"
                color="warning"
                variant="outlined"
              />
            </Tooltip>
          )}
          
          {hasConfiguration(step) ? (
            <Tooltip title="Configured">
              <ConfigIcon fontSize="small" color="success" />
            </Tooltip>
          ) : (
            <Tooltip title="Not configured">
              <ConfigIcon fontSize="small" color="action" />
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  // Custom actions column for complex button logic
  const customActionsColumn: ModernTableColumn<BookingFlowStep> = {
    key: 'actions',
    label: 'Actions',
    align: 'right',
    render: (_, step) => (
      <Box display="flex" alignItems="center" gap={0.5}>
        {/* Special migration button for availability_check steps */}
        {isDeprecatedStep(step) ? (
          <Tooltip title="Migrate to Date & Time step">
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={isMigratingAvailability ? <CircularProgress size={16} /> : <MigrateIcon />}
              onClick={(e) => {
                e.stopPropagation();
                if ((step.step_type as string) === 'availability_check') {
                  migrateAvailabilityStep(step.id);
                }
              }}
              disabled={isMigratingAvailability}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              Migrate
            </Button>
          </Tooltip>
        ) : (
          /* Normal configure button for supported steps */
          <Tooltip title="Configure Step">
            <Button
              size="small"
              variant="outlined"
              startIcon={<ConfigIcon />}
              onClick={(e) => {
                e.stopPropagation();
                onConfigure(step);
              }}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              Configure
            </Button>
          </Tooltip>
        )}
      </Box>
    ),
  };

  const allColumns = [...columns, customActionsColumn];

  const actions: ModernTableAction<BookingFlowStep>[] = [
    {
      label: 'Configure Step',
      icon: <ConfigIcon />,
      onClick: (step) => onConfigure(step),
      color: 'primary',
      show: (step) => !isDeprecatedStep(step),
    },
    {
      label: 'Migrate to Date & Time',
      icon: <MigrateIcon />,
      onClick: (step) => {
        if ((step.step_type as string) === 'availability_check') {
          migrateAvailabilityStep(step.id);
        }
      },
      color: 'default',
      show: (step) => isDeprecatedStep(step),
    },
    {
      label: 'Edit Properties',
      icon: <EditIcon />,
      onClick: (step) => onEdit(step),
      color: 'default',
    },
    {
      label: 'Preview Step',
      icon: <PreviewIcon />,
      onClick: () => {
        // Preview step functionality would be implemented here
      },
      color: 'default',
    },
    {
      label: 'Delete Step',
      icon: <DeleteIcon />,
      onClick: (step) => deleteStep(step.id),
      color: 'error',
    },
  ];

  const emptyState = (
    <ModernEmptyState
      icon={ConfigIcon}
      title="No steps configured"
      description="Add steps to this booking flow to guide clients through the booking process"
      size="medium"
      color="primary"
    />
  );


  return (
    <>
      {/* Deprecation Warning for availability_check steps */}
      {hasDeprecatedSteps && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Deprecated Step Type Detected
          </Typography>
          <Typography variant="body2">
            "Availability Check" steps are no longer supported. They have been integrated into "Date & Time" steps with enhanced availability features.
            You can migrate these steps automatically using the migrate option in the step menu.
          </Typography>
        </Alert>
      )}

      <ModernTable
        columns={allColumns as unknown as ModernTableColumn<Record<string, unknown>>[]}
        data={sortedSteps as unknown as Record<string, unknown>[]}
        actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
        loading={isLoading}
        emptyState={emptyState}
      />
    </>
  );
};