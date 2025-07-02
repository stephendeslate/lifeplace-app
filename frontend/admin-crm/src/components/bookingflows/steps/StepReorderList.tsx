// frontend/admin-crm/src/components/bookingflows/steps/StepReorderList.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Stack,
  Button,
  Alert,
  Paper,
  Tooltip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  CheckCircle as EnabledIcon,
  RadioButtonUnchecked as DisabledIcon,
  Star as RequiredIcon,
  StarBorder as OptionalIcon,
  Save as SaveIcon,
  Refresh as ResetIcon,
  KeyboardArrowUp as MoveUpIcon,
  KeyboardArrowDown as MoveDownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import type { BookingFlowStep } from '../../../types/bookingflows.types';
import { useBookingFlowSteps } from '../../../hooks/useBookingFlows';

interface StepReorderListProps {
  flowId: number;
  steps: BookingFlowStep[];
  onReorderComplete?: () => void;
}

interface DraggableStepProps {
  step: BookingFlowStep;
  index: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
  newOrder: number;
}

const DraggableStep: React.FC<DraggableStepProps> = ({
  step,
  index,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  newOrder,
}) => {
  const getStepTypeColor = (stepType: string) => {
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

    return colors[stepType as keyof typeof colors] || 'default';
  };

  const hasOrderChanged = step.order !== newOrder;

  return (
    <Paper
      sx={{
        p: 2,
        mb: 1,
        cursor: 'grab',
        opacity: step.is_enabled ? 1 : 0.6,
        border: 1,
        borderColor: hasOrderChanged ? 'warning.main' : 'divider',
        backgroundColor: hasOrderChanged ? 'warning.50' : 'background.paper',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 1,
        },
        '&:active': {
          cursor: 'grabbing',
        }
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        {/* Drag Handle */}
        <DragIcon color="action" />
        
        {/* Order Numbers */}
        <Box display="flex" alignItems="center" gap={1}>
          {hasOrderChanged ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography
                variant="body2"
                sx={{
                  minWidth: 30,
                  textAlign: 'center',
                  color: 'text.disabled',
                  textDecoration: 'line-through',
                }}
              >
                {step.order}
              </Typography>
              <Typography color="text.secondary">→</Typography>
              <Typography
                variant="h6"
                sx={{
                  minWidth: 30,
                  textAlign: 'center',
                  color: 'warning.main',
                  fontWeight: 'bold',
                }}
              >
                {newOrder}
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="h6"
              sx={{
                minWidth: 30,
                textAlign: 'center',
                color: step.is_enabled ? 'primary.main' : 'text.disabled',
              }}
            >
              {newOrder}
            </Typography>
          )}
        </Box>
        
        {/* Status Icon */}
        {step.is_enabled ? (
          <EnabledIcon color="success" fontSize="small" />
        ) : (
          <DisabledIcon color="disabled" fontSize="small" />
        )}
        
        {/* Step Info */}
        <Box sx={{ flexGrow: 1 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Typography variant="subtitle2" fontWeight="medium">
              {step.name}
            </Typography>
            {step.is_required ? (
              <RequiredIcon color="error" fontSize="small" />
            ) : (
              <OptionalIcon color="disabled" fontSize="small" />
            )}
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={step.step_type_display}
              size="small"
              color={getStepTypeColor(step.step_type)}
              variant="outlined"
            />
            
            {step.is_required && (
              <Chip label="Required" size="small" color="error" variant="outlined" />
            )}
            
            {step.is_skippable && (
              <Chip label="Skippable" size="small" color="info" variant="outlined" />
            )}
            
            {!step.is_enabled && (
              <Chip label="Disabled" size="small" color="default" variant="outlined" />
            )}
          </Box>
        </Box>
        
        {/* Move Buttons */}
        <Box display="flex" flexDirection="column">
          <Tooltip title="Move Up">
            <span>
              <IconButton
                size="small"
                onClick={() => onMoveUp(index)}
                disabled={isFirst}
                color={hasOrderChanged ? "warning" : "default"}
              >
                <MoveUpIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Move Down">
            <span>
              <IconButton
                size="small"
                onClick={() => onMoveDown(index)}
                disabled={isLast}
                color={hasOrderChanged ? "warning" : "default"}
              >
                <MoveDownIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};

export const StepReorderList: React.FC<StepReorderListProps> = ({
  flowId,
  steps,
  onReorderComplete,
}) => {
  const [reorderedSteps, setReorderedSteps] = useState<BookingFlowStep[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { reorderSteps, isReorderingSteps } = useBookingFlowSteps();

  useEffect(() => {
    const sortedSteps = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setReorderedSteps(sortedSteps);
    setHasChanges(false);
  }, [steps]);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newSteps = [...reorderedSteps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setReorderedSteps(newSteps);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === reorderedSteps.length - 1) return;
    
    const newSteps = [...reorderedSteps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setReorderedSteps(newSteps);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Create order mapping according to ReorderStepsData type
    const orderMapping: Record<string, number> = {};
    
    reorderedSteps.forEach((step, index) => {
      orderMapping[step.id.toString()] = index + 1;
    });

    const reorderData = {
      flow_id: flowId,
      order_mapping: orderMapping,
    };

    reorderSteps(reorderData, {
      onSuccess: () => {
        setHasChanges(false);
        onReorderComplete?.();
      },
    });
  };

  const handleReset = () => {
    const sortedSteps = [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setReorderedSteps(sortedSteps);
    setHasChanges(false);
  };

  if (steps.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No steps to reorder
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add steps to this booking flow first
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Reorder Steps ({reorderedSteps.length})
        </Typography>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={handleReset}
            disabled={!hasChanges || isReorderingSteps}
            size="small"
          >
            Reset
          </Button>
          
          <Button
            variant="contained"
            startIcon={isReorderingSteps ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges || isReorderingSteps}
            size="small"
          >
            {isReorderingSteps ? 'Saving...' : 'Save Order'}
          </Button>
        </Box>
      </Box>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2" gutterBottom>
          <strong>Step Ordering:</strong>
        </Typography>
        <Typography variant="body2">
          • Use the arrow buttons to reorder steps
        </Typography>
        <Typography variant="body2">
          • Order numbers are automatically assigned (1, 2, 3, etc.)
        </Typography>
        <Typography variant="body2">
          • Changed orders are highlighted in orange
        </Typography>
        <Typography variant="body2">
          • Only enabled steps are shown to clients during booking
        </Typography>
      </Alert>

      {/* Changes Alert */}
      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Step order has been modified. Click <strong>"Save Order"</strong> to apply changes.
          </Typography>
        </Alert>
      )}

      {/* Steps List */}
      <Stack spacing={1}>
        {reorderedSteps.map((step, index) => (
          <DraggableStep
            key={step.id}
            step={step}
            index={index}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            isFirst={index === 0}
            isLast={index === reorderedSteps.length - 1}
            newOrder={index + 1}
          />
        ))}
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* Summary */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Final Step Order
          </Typography>
          
          <Box display="flex" flexWrap="wrap" gap={1}>
            {reorderedSteps.map((step, index) => {
              const hasOrderChanged = step.order !== (index + 1);
              return (
                <Chip
                  key={step.id}
                  label={`${index + 1}. ${step.name}`}
                  size="small"
                  color={hasOrderChanged ? 'warning' : (step.is_enabled ? 'primary' : 'default')}
                  variant={step.is_enabled ? 'filled' : 'outlined'}
                />
              );
            })}
          </Box>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Only enabled steps will be shown to clients during the booking process
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};