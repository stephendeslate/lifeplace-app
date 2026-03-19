import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '@/contexts/LayoutContext';
import { useBookingFlows, useBookingFlowPaymentGateways } from '@/hooks/useBookingFlows';

export type ViewMode = 'desktop' | 'mobile';

export function useBookingFlowPreviewLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const flowId = parseInt(id || '0');

  // Use the evolved hooks
  const { useBookingFlow } = useBookingFlows();
  const { useFlowPaymentGateways } = useBookingFlowPaymentGateways();

  const {
    data: flow,
    isLoading: isLoadingFlow,
    error: flowError,
    refetch: refetchFlow,
  } = useBookingFlow(flowId);

  const { data: paymentGateways, isLoading: isLoadingPaymentGateways } =
    useFlowPaymentGateways(flowId);

  // Set breadcrumbs when flow loads
  useEffect(() => {
    if (flow) {
      setBreadcrumbs([
        { label: 'Settings', path: '/settings' },
        { label: 'Booking Configuration' },
        { label: 'Booking Flows', path: '/settings/booking/booking-flow' },
        { label: flow.name, path: `/settings/booking/booking-flow/${flow.id}` },
        { label: 'Preview' },
      ]);
    }
  }, [flow, setBreadcrumbs]);

  const handleViewModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode) => {
      if (newMode !== null) {
        setViewMode(newMode);
      }
    },
    [],
  );

  const handleBackToFlow = useCallback(() => {
    navigate(`/settings/booking/booking-flow/${flowId}`);
  }, [navigate, flowId]);

  const handleEditFlow = useCallback(() => {
    navigate(`/settings/booking/booking-flow/${flowId}`);
  }, [navigate, flowId]);

  const handleRefresh = useCallback(() => {
    refetchFlow();
  }, [refetchFlow]);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    flow,
    flowId,
    isLoadingFlow,
    flowError,
    paymentGateways,
    isLoadingPaymentGateways,
    viewMode,
    isFullscreen,
    handleViewModeChange,
    handleBackToFlow,
    handleEditFlow,
    handleRefresh,
    toggleFullscreen,
    navigate,
  };
}
