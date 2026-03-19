// frontend/admin-crm/src/pages/settings/booking/BookingFlowDetails/useBookingFlowDetailsLogic.ts

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLayout } from '@/contexts/LayoutContext';
import {
  useBookingFlows,
  useBookingFlowSteps,
  useBookingFlowStepConfiguration,
} from '@/hooks/useBookingFlows';
import type {
  BookingFlowStep,
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
  UpdateBookingFlowData,
} from '@/types/bookingflows';

export function useBookingFlowDetailsLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setBreadcrumbs } = useLayout();
  const [activeTab, setActiveTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<BookingFlowStep | null>(null);
  const [selectedStepForConfig, setSelectedStepForConfig] = useState<BookingFlowStep | null>(null);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);

  // Refs for focus management
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const addStepButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const flowId = parseInt(id || '0');

  const {
    useBookingFlow,
    updateFlow,
    deleteFlow,
    duplicateFlow,
    isUpdatingFlow,
    isDeletingFlow,
    isDuplicatingFlow,
    updateError,
    deleteError,
    duplicateError,
  } = useBookingFlows();

  const {
    data: flow,
    isLoading: isLoadingFlow,
    error: flowError,
    refetch: refetchFlow,
  } = useBookingFlow(flowId);

  const {
    useFlowSteps,
    createStep,
    updateStep,
    isCreatingStep,
    isUpdatingStep,
    isReorderingSteps,
    createStepError,
    updateStepError,
    deleteStepError,
    reorderStepsError,
  } = useBookingFlowSteps();

  const {
    data: steps = [],
    isLoading: _isLoadingSteps,
    error: _stepsError,
    refetch: refetchSteps,
  } = useFlowSteps(flowId);

  const { updateConfigurationError } = useBookingFlowStepConfiguration();

  useEffect(() => {
    if (flow) {
      setBreadcrumbs([
        { label: 'Settings', path: '/settings' },
        { label: 'Booking Configuration' },
        { label: 'Booking Flows', path: '/settings/booking/booking-flow' },
        { label: flow.name },
      ]);
    }
  }, [flow, setBreadcrumbs]);

  // Handle navigation state to auto-open tabs
  useEffect(() => {
    const state = location.state as { activeTab?: number } | null;
    if (state?.activeTab !== undefined) {
      setActiveTab(state.activeTab);
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMenuButtonClick = (event?: React.MouseEvent<HTMLElement>) => {
    if (event?.currentTarget) {
      setMenuAnchor(event.currentTarget);
    }
  };

  const handleEditFlow = () => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDuplicateFlow = () => {
    if (flow) {
      duplicateFlow(
        {
          id: flow.id,
          data: {
            name: `${flow.name} (Copy)`,
            copy_steps: true,
            copy_configuration: true,
          },
        },
        {
          onSuccess: (newFlow) => {
            navigate(`/settings/booking/booking-flow/${newFlow.id}`);
          },
        },
      );
    }
    handleMenuClose();
  };

  const handleDeleteFlow = () => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement;
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (flow) {
      deleteFlow(flow.id, {
        onSuccess: () => {
          navigate('/settings/booking/booking-flow');
        },
      });
    }
  };

  const handleDeleteCancel = () => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      activeElement.blur();
    }

    setDeleteDialogOpen(false);

    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch {
          menuButtonRef.current?.focus();
        }
      } else {
        menuButtonRef.current?.focus();
      }
      lastFocusedElementRef.current = null;
    }, 100);
  };

  const handlePreviewFlow = () => {
    if (flow) {
      navigate(`/settings/booking/booking-flow/preview/${flow.id}`);
    }
    handleMenuClose();
  };

  const handleUpdateFlow = (data: UpdateBookingFlowData) => {
    if (flow) {
      updateFlow(
        { id: flow.id, data },
        {
          onSuccess: () => {
            handleEditDialogClose();
            refetchFlow();
          },
        },
      );
    }
  };

  const handleEditDialogClose = () => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      const dialogElement = activeElement.closest('[role="dialog"]');
      if (dialogElement) {
        activeElement.blur();
      }
    }

    setEditDialogOpen(false);

    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch {
          menuButtonRef.current?.focus();
        }
      } else {
        menuButtonRef.current?.focus();
      }
      lastFocusedElementRef.current = null;
    }, 100);
  };

  const handleStepDialogClose = () => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement.blur && activeElement !== document.body) {
      const dialogElement = activeElement.closest('[role="dialog"]');
      if (dialogElement) {
        activeElement.blur();
      }
    }

    setStepDialogOpen(false);
    setEditingStep(null);

    setTimeout(() => {
      if (lastFocusedElementRef.current && document.contains(lastFocusedElementRef.current)) {
        try {
          lastFocusedElementRef.current.focus();
        } catch {
          addStepButtonRef.current?.focus();
        }
      } else {
        addStepButtonRef.current?.focus();
      }
      lastFocusedElementRef.current = null;
    }, 100);
  };

  const handleStepSubmit = (data: CreateBookingFlowStepData | UpdateBookingFlowStepData) => {
    if (editingStep) {
      updateStep(
        {
          id: editingStep.id,
          data: data as UpdateBookingFlowStepData,
        },
        {
          onSuccess: () => {
            handleStepDialogClose();
            refetchSteps();
          },
        },
      );
    } else {
      const maxOrder = steps.reduce((max, step) => Math.max(max, step.order ?? 0), 0);
      const nextOrder = maxOrder + 1;

      createStep(
        {
          ...(data as CreateBookingFlowStepData),
          booking_flow: flowId,
          order: nextOrder,
        },
        {
          onSuccess: () => {
            handleStepDialogClose();
            refetchSteps();
          },
        },
      );
    }
  };

  const handleStepConfigurationUpdate = (updatedStep: BookingFlowStep) => {
    refetchSteps();
    setSelectedStepForConfig(updatedStep);
  };

  return {
    id,
    flowId,
    flow,
    steps,
    isLoadingFlow,
    flowError,
    activeTab,
    menuAnchor,
    editDialogOpen,
    stepDialogOpen,
    deleteDialogOpen,
    editingStep,
    selectedStepForConfig,
    reorderDialogOpen,
    menuButtonRef,
    addStepButtonRef,
    isUpdatingFlow,
    isDeletingFlow,
    isDuplicatingFlow,
    isCreatingStep,
    isUpdatingStep,
    isReorderingSteps,
    updateError,
    deleteError,
    duplicateError,
    createStepError,
    updateStepError,
    deleteStepError,
    reorderStepsError,
    updateConfigurationError,
    refetchFlow,
    refetchSteps,
    navigate,
    setActiveTab,
    setSelectedStepForConfig,
    setReorderDialogOpen,
    handleTabChange,
    handleMenuClose,
    handleMenuButtonClick,
    handleEditFlow,
    handleDuplicateFlow,
    handleDeleteFlow,
    handleDeleteConfirm,
    handleDeleteCancel,
    handlePreviewFlow,
    handleUpdateFlow,
    handleEditDialogClose,
    handleStepDialogClose,
    handleStepSubmit,
    handleStepConfigurationUpdate,
  };
}
