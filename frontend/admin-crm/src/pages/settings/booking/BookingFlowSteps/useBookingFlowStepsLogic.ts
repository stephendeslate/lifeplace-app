import { useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBookingFlowSteps, useBookingFlows } from '@/hooks/useBookingFlows';
import { useSettingsPagination } from '@/hooks/useSettingsPagination';
import type {
  BookingFlowStep,
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
} from '@/types/bookingflows';
import type { ImprovedStepReorderListRef } from '@/components/bookingflows/steps/ImprovedStepReorderList';

export function useBookingFlowStepsLogic() {
  const { id } = useParams<{ id: string }>();
  const flowId = parseInt(id || '0');
  const paginationState = useSettingsPagination({ defaultPageSize: 25 });

  const [selectedStep, setSelectedStep] = useState<BookingFlowStep | null>(null);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [hasReorderChanges, setHasReorderChanges] = useState(false);
  const reorderListRef = useRef<ImprovedStepReorderListRef>(null);

  const { useBookingFlow } = useBookingFlows();
  const { data: flow } = useBookingFlow(flowId);

  const {
    steps,
    totalCount,
    pageCount,
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
    isLoadingSteps,
    stepsError,
    refetchSteps,
  } = useBookingFlowSteps({
    flow_id: flowId,
    page: paginationState.page,
    page_size: paginationState.pageSize,
    search: paginationState.search || undefined,
    ordering: paginationState.ordering || undefined,
  });

  const { data: allSteps = [], refetch: refetchAllSteps } = useFlowSteps(flowId);

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [steps],
  );

  const allSortedSteps = useMemo(
    () => [...allSteps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allSteps],
  );

  const hasDeprecatedSteps = sortedSteps.some(
    (step) => (step.step_type as string) === 'availability_check',
  );

  const handleCreate = async (data: BookingFlowStep) => {
    const maxOrder = allSteps.reduce((max, step) => Math.max(max, step.order ?? 0), 0);
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
      updateStep(
        {
          id: Number(id),
          data: updateData,
        },
        {
          onSuccess: () => {
            refetchSteps();
            resolve();
          },
          onError: reject,
        },
      );
    });
  };

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

  const handleFetchItem = async (id: string | number): Promise<BookingFlowStep> => {
    const { bookingFlowsApi } = await import('@/apis/bookingflows');
    return bookingFlowsApi.getBookingFlowStep(Number(id));
  };

  const handleConfigure = (step: BookingFlowStep) => {
    setSelectedStep(step);
    setShowConfiguration(true);
  };

  const handleMigrate = (step: BookingFlowStep) => {
    if ((step.step_type as string) === 'availability_check') {
      migrateAvailabilityStep(step.id, {
        onSuccess: () => refetchSteps(),
      });
    }
  };

  const handleSaveOrder = async () => {
    if (reorderListRef.current) {
      await reorderListRef.current.save();
    }
  };

  return {
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
  };
}
