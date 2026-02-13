// frontend/admin-crm/src/components/bookingflows/steps/ImprovedStepReorderList.tsx

import React, { useRef, forwardRef, useImperativeHandle } from "react";
import { Box, Typography, Chip, Stack } from "@mui/material";
import {
  CheckCircle as EnabledIcon,
  RadioButtonUnchecked as DisabledIcon,
  Star as RequiredIcon,
  StarBorder as OptionalIcon,
} from "@mui/icons-material";
import {
  DraggableList,
  type DraggableListRef,
} from "../../common/DraggableList";
import type { BookingFlowStep } from "../../../types/bookingflows.types";
import { useBookingFlowSteps } from "../../../hooks/useBookingFlows";

interface ImprovedStepReorderListProps {
  flowId: number;
  steps: BookingFlowStep[];
  onReorderComplete?: () => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

export interface ImprovedStepReorderListRef {
  save: () => Promise<void>;
}

const ImprovedStepReorderListInner: React.ForwardRefRenderFunction<
  ImprovedStepReorderListRef,
  ImprovedStepReorderListProps
> = ({ flowId, steps, onReorderComplete, onHasChangesChange }, ref) => {
  const { reorderSteps } = useBookingFlowSteps();
  const draggableListRef = useRef<DraggableListRef>(null);

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      save: async () => {
        if (draggableListRef.current) {
          await draggableListRef.current.save();
        }
      },
    }),
    [],
  );

  const getStepTypeColor = (stepType: string) => {
    const colors = {
      introduction: "primary",
      date_time: "info",
      questionnaire: "success",
      package_selection: "warning",
      addon_selection: "warning",
      pricing_summary: "secondary",
      contact_info: "success",
      payment_info: "error",
      confirmation: "success",
    } as const;

    return colors[stepType as keyof typeof colors] || "default";
  };

  const handleReorder = async (reorderedSteps: BookingFlowStep[]) => {
    const orderMapping: Record<string, number> = {};

    reorderedSteps.forEach((step, index) => {
      orderMapping[step.id.toString()] = index + 1;
    });

    const reorderData = {
      flow_id: flowId,
      order_mapping: orderMapping,
    };

    return new Promise<void>((resolve, reject) => {
      reorderSteps(reorderData, {
        onSuccess: () => {
          onReorderComplete?.();
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  const renderStepItem = (step: BookingFlowStep) => (
    <Box display="flex" alignItems="center" gap={2}>
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
            {step.step_type_display}
          </Typography>
          {step.is_required ? (
            <RequiredIcon color="error" fontSize="small" />
          ) : (
            <OptionalIcon color="disabled" fontSize="small" />
          )}
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={step.step_type_display}
            size="small"
            color={getStepTypeColor(step.step_type)}
            variant="outlined"
          />

          {step.is_required && (
            <Chip
              label="Required"
              size="small"
              color="error"
              variant="outlined"
            />
          )}

          {step.is_skippable && (
            <Chip
              label="Skippable"
              size="small"
              color="info"
              variant="outlined"
            />
          )}

          {!step.is_enabled && (
            <Chip
              label="Disabled"
              size="small"
              color="default"
              variant="outlined"
            />
          )}
        </Stack>
      </Box>
    </Box>
  );

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
      <Typography variant="h6" gutterBottom>
        Reorder Steps
      </Typography>

      <DraggableList<BookingFlowStep>
        ref={draggableListRef}
        items={steps}
        onReorder={handleReorder}
        renderItem={renderStepItem}
        keyExtractor={(step) => step.id.toString()}
        showSaveButton={true}
        hideInternalSaveButton={true}
        enableKeyboardReorder={true}
        emptyMessage="No steps to reorder. Add steps to this booking flow first."
        isDragDisabled={() => false} // Could disable based on step properties
        containerProps={{ sx: { mt: 2 } }}
        onHasChangesChange={onHasChangesChange}
      />
    </Box>
  );
};

export const ImprovedStepReorderList = forwardRef(ImprovedStepReorderListInner);
