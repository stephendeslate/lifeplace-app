// frontend/admin-crm/src/hooks/useAnalytics.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '../apis/analytics.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  ReportExecution,
  MetricDefinitionFilters,
  DashboardFilters,
  AnalyticsReportFilters,
  EventFilters,
  FunnelFilters,
  AlertRuleFilters,
  EventAggregationFilters,
  CreateMetricDefinitionData,
  UpdateMetricDefinitionData,
  CreateDashboardData,
  UpdateDashboardData,
  CreateWidgetData,
  UpdateWidgetData,
  CreateAnalyticsReportData,
  UpdateAnalyticsReportData,
  CreateConversionFunnelData,
  UpdateConversionFunnelData,
  CreateAlertRuleData,
  UpdateAlertRuleData,
  MetricCalculationRequest,
  DashboardDataRequest,
  ReportExecutionRequest,
  EventTrackingRequest,
  FunnelTrackingRequest,
  AlertRuleTestRequest,
  ExportOptions,
} from '../types/analytics.types';

export const useMetricDefinitions = (filters?: MetricDefinitionFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: metrics = [],
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['metric-definitions', filters],
    queryFn: () => analyticsApi.getMetricDefinitions(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const useMetricDefinition = (id: number) => {
    return useQuery({
      queryKey: ['metric-definition', id],
      queryFn: () => analyticsApi.getMetricDefinition(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  const useActiveMetrics = () => {
    return useQuery({
      queryKey: ['metric-definitions', 'active'],
      queryFn: () => analyticsApi.getActiveMetrics(),
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const createMetricMutation = useMutation({
    mutationFn: (data: CreateMetricDefinitionData) => analyticsApi.createMetricDefinition(data),
    onSuccess: (newMetric) => {
      queryClient.invalidateQueries({ queryKey: ['metric-definitions'] });
      showSuccess('Metric Created', `${newMetric.name} has been created successfully.`);
    },
    onError: (error: any) => {
      console.error('Create metric error:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.name) {
          showError('Name Error', Array.isArray(errorData.name) ? errorData.name[0] : errorData.name);
        } else if (errorData.detail) {
          showError('Create Failed', errorData.detail);
        } else if (errorData.non_field_errors) {
          showError('Validation Error', errorData.non_field_errors[0] || 'A validation error occurred.');
        } else {
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${messageText}`;
            })
            .join('\n');
          showError('Validation Errors', fieldErrors);
        }
      } else {
        showError('Create Failed', 'Failed to create metric definition. Please try again.');
      }
    },
  });

  const updateMetricMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMetricDefinitionData }) =>
      analyticsApi.updateMetricDefinition(id, data),
    onSuccess: (updatedMetric) => {
      queryClient.invalidateQueries({ queryKey: ['metric-definitions'] });
      queryClient.invalidateQueries({ queryKey: ['metric-definition', updatedMetric.id] });
      showSuccess('Metric Updated', `${updatedMetric.name} has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update metric definition';
      showError('Update Failed', message);
    },
  });

  const deleteMetricMutation = useMutation({
    mutationFn: (id: number) => analyticsApi.deleteMetricDefinition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric-definitions'] });
      showSuccess('Metric Deleted', 'Metric definition has been deleted successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete metric definition';
      showError('Delete Failed', message);
    },
  });

  const calculateMetricMutation = useMutation({
    mutationFn: ({ id, request }: { id: number; request: MetricCalculationRequest }) =>
      analyticsApi.calculateMetric(id, request),
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to calculate metric';
      showError('Calculation Failed', message);
    },
  });

  return {
    // Data
    metrics,
    
    // Loading states
    isLoadingMetrics,
    isCreatingMetric: createMetricMutation.isPending,
    isUpdatingMetric: updateMetricMutation.isPending,
    isDeletingMetric: deleteMetricMutation.isPending,
    isCalculatingMetric: calculateMetricMutation.isPending,
    
    // Error states
    metricsError,
    createError: createMetricMutation.error,
    updateError: updateMetricMutation.error,
    deleteError: deleteMetricMutation.error,
    calculateError: calculateMetricMutation.error,
    
    // Actions
    createMetric: createMetricMutation.mutate,
    updateMetric: updateMetricMutation.mutate,
    deleteMetric: deleteMetricMutation.mutate,
    calculateMetric: calculateMetricMutation.mutate,
    refetchMetrics,
    
    // Hooks for specific queries
    useMetricDefinition,
    useActiveMetrics,
    
    // Calculation result
    calculationResult: calculateMetricMutation.data,
  };
};

export const useDashboards = (filters?: DashboardFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: dashboards = [],
    isLoading: isLoadingDashboards,
    error: dashboardsError,
    refetch: refetchDashboards
  } = useQuery({
    queryKey: ['dashboards', filters],
    queryFn: () => analyticsApi.getDashboards(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useDashboard = (id: number) => {
    return useQuery({
      queryKey: ['dashboard', id],
      queryFn: () => analyticsApi.getDashboard(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  const useDashboardData = (id: number, request?: DashboardDataRequest) => {
    return useQuery({
      queryKey: ['dashboard-data', id, request],
      queryFn: () => analyticsApi.getDashboardData(id, request || {}),
      enabled: !!id,
      staleTime: 30 * 1000, // 30 seconds for real-time data
      refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    });
  };

  // Mutations
  const createDashboardMutation = useMutation({
    mutationFn: (data: CreateDashboardData) => analyticsApi.createDashboard(data),
    onSuccess: (newDashboard) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      showSuccess('Dashboard Created', `${newDashboard.name} has been created successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create dashboard';
      showError('Create Failed', message);
    },
  });

  const updateDashboardMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDashboardData }) =>
      analyticsApi.updateDashboard(id, data),
    onSuccess: (updatedDashboard) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', updatedDashboard.id] });
      showSuccess('Dashboard Updated', `${updatedDashboard.name} has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update dashboard';
      showError('Update Failed', message);
    },
  });

  const deleteDashboardMutation = useMutation({
    mutationFn: (id: number) => analyticsApi.deleteDashboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      showSuccess('Dashboard Deleted', 'Dashboard has been deleted successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete dashboard';
      showError('Delete Failed', message);
    },
  });

  const addWidgetMutation = useMutation({
    mutationFn: ({ dashboardId, data }: { dashboardId: number; data: CreateWidgetData }) =>
      analyticsApi.addWidgetToDashboard(dashboardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      showSuccess('Widget Added', 'Widget has been added to dashboard successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to add widget';
      showError('Add Widget Failed', message);
    },
  });

  return {
    // Data
    dashboards,
    
    // Loading states
    isLoadingDashboards,
    isCreatingDashboard: createDashboardMutation.isPending,
    isUpdatingDashboard: updateDashboardMutation.isPending,
    isDeletingDashboard: deleteDashboardMutation.isPending,
    isAddingWidget: addWidgetMutation.isPending,
    
    // Error states
    dashboardsError,
    createError: createDashboardMutation.error,
    updateError: updateDashboardMutation.error,
    deleteError: deleteDashboardMutation.error,
    addWidgetError: addWidgetMutation.error,
    
    // Actions
    createDashboard: createDashboardMutation.mutate,
    updateDashboard: updateDashboardMutation.mutate,
    deleteDashboard: deleteDashboardMutation.mutate,
    addWidget: addWidgetMutation.mutate,
    refetchDashboards,
    
    // Hooks for specific queries
    useDashboard,
    useDashboardData,
  };
};

export const useWidgets = (filters?: { dashboard_id?: number }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: widgets = [],
    isLoading: isLoadingWidgets,
    error: widgetsError,
    refetch: refetchWidgets
  } = useQuery({
    queryKey: ['widgets', filters],
    queryFn: () => analyticsApi.getWidgets(filters),
    staleTime: 2 * 60 * 1000,
  });

  const useWidget = (id: number) => {
    return useQuery({
      queryKey: ['widget', id],
      queryFn: () => analyticsApi.getWidget(id),
      enabled: !!id,
    });
  };

  // Mutations
  const addWidgetMutation = useMutation({
    mutationFn: ({ dashboardId, data }: { dashboardId: number; data: CreateWidgetData }) =>
      analyticsApi.addWidgetToDashboard(dashboardId, data),
    onSuccess: (newWidget) => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      // Update the specific dashboard's widgets cache
      if (filters?.dashboard_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['widgets', { dashboard_id: filters.dashboard_id }] 
        });
      }
      showSuccess('Widget Added', `${newWidget.title} has been added to the dashboard successfully.`);
    },
    onError: (error: any) => {
      console.error('Add widget error:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.title) {
          showError('Title Error', Array.isArray(errorData.title) ? errorData.title[0] : errorData.title);
        } else if (errorData.metric_definition) {
          showError('Metric Error', Array.isArray(errorData.metric_definition) ? errorData.metric_definition[0] : errorData.metric_definition);
        } else if (errorData.detail) {
          showError('Add Failed', errorData.detail);
        } else if (errorData.non_field_errors) {
          showError('Validation Error', errorData.non_field_errors[0] || 'A validation error occurred.');
        } else {
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${messageText}`;
            })
            .join('\n');
          showError('Validation Errors', fieldErrors);
        }
      } else {
        showError('Add Failed', 'Failed to add widget to dashboard. Please try again.');
      }
    },
  });

  const updateWidgetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWidgetData }) =>
      analyticsApi.updateWidget(id, data),
    onSuccess: (updatedWidget) => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['widget', updatedWidget.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      // Update the specific dashboard's widgets cache
      if (filters?.dashboard_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['widgets', { dashboard_id: filters.dashboard_id }] 
        });
      }
      showSuccess('Widget Updated', `${updatedWidget.title} has been updated successfully.`);
    },
    onError: (error: any) => {
      console.error('Update widget error:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.title) {
          showError('Title Error', Array.isArray(errorData.title) ? errorData.title[0] : errorData.title);
        } else if (errorData.detail) {
          showError('Update Failed', errorData.detail);
        } else if (errorData.non_field_errors) {
          showError('Validation Error', errorData.non_field_errors[0] || 'A validation error occurred.');
        } else {
          const fieldErrors = Object.entries(errorData)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${messageText}`;
            })
            .join('\n');
          showError('Validation Errors', fieldErrors);
        }
      } else {
        showError('Update Failed', 'Failed to update widget. Please try again.');
      }
    },
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: (id: number) => analyticsApi.deleteWidget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      // Update the specific dashboard's widgets cache
      if (filters?.dashboard_id) {
        queryClient.invalidateQueries({ 
          queryKey: ['widgets', { dashboard_id: filters.dashboard_id }] 
        });
      }
      showSuccess('Widget Deleted', 'Widget has been deleted successfully.');
    },
    onError: (error: any) => {
      console.error('Delete widget error:', error);
      const message = error.response?.data?.detail || 'Failed to delete widget. Please try again.';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    widgets,
    
    // Loading states
    isLoadingWidgets,
    isAddingWidget: addWidgetMutation.isPending,
    isUpdatingWidget: updateWidgetMutation.isPending,
    isDeletingWidget: deleteWidgetMutation.isPending,
    
    // Error states
    widgetsError,
    addError: addWidgetMutation.error,
    updateError: updateWidgetMutation.error,
    deleteError: deleteWidgetMutation.error,
    
    // Actions
    addWidget: addWidgetMutation.mutate,
    updateWidget: updateWidgetMutation.mutate,
    deleteWidget: deleteWidgetMutation.mutate,
    refetchWidgets,
    
    // Hooks for specific queries
    useWidget,
    
    // Success data
    addedWidget: addWidgetMutation.data,
  };
};

export const useAnalyticsReports = (filters?: AnalyticsReportFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: reports = [],
    isLoading: isLoadingReports,
    error: reportsError,
    refetch: refetchReports
  } = useQuery({
    queryKey: ['analytics-reports', filters],
    queryFn: () => analyticsApi.getAnalyticsReports(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useAnalyticsReport = (id: number) => {
    return useQuery({
      queryKey: ['analytics-report', id],
      queryFn: () => analyticsApi.getAnalyticsReport(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  const useReportExecutions = (reportId: number) => {
    return useQuery({
      queryKey: ['report-executions', reportId],
      queryFn: () => analyticsApi.getReportExecutions(reportId),
      enabled: !!reportId,
      staleTime: 1 * 60 * 1000,
    });
  };

  // Mutations
  const createReportMutation = useMutation({
    mutationFn: (data: CreateAnalyticsReportData) => analyticsApi.createAnalyticsReport(data),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['analytics-reports'] });
      showSuccess('Report Created', `${newReport.name} has been created successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create report';
      showError('Create Failed', message);
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAnalyticsReportData }) =>
      analyticsApi.updateAnalyticsReport(id, data),
    onSuccess: (updatedReport) => {
      queryClient.invalidateQueries({ queryKey: ['analytics-reports'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-report', updatedReport.id] });
      showSuccess('Report Updated', `${updatedReport.name} has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update report';
      showError('Update Failed', message);
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id: number) => analyticsApi.deleteAnalyticsReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-reports'] });
      showSuccess('Report Deleted', 'Report has been deleted successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete report';
      showError('Delete Failed', message);
    },
  });

  const executeReportMutation = useMutation({
    mutationFn: ({ id, request }: { id: number; request: ReportExecutionRequest }) =>
      analyticsApi.executeReport(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-executions'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-reports'] });
      showSuccess('Report Executed', 'Report has been executed successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to execute report';
      showError('Execution Failed', message);
    },
  });

  return {
    // Data
    reports,
    
    // Loading states
    isLoadingReports,
    isCreatingReport: createReportMutation.isPending,
    isUpdatingReport: updateReportMutation.isPending,
    isDeletingReport: deleteReportMutation.isPending,
    isExecutingReport: executeReportMutation.isPending,
    
    // Error states
    reportsError,
    createError: createReportMutation.error,
    updateError: updateReportMutation.error,
    deleteError: deleteReportMutation.error,
    executeError: executeReportMutation.error,
    
    // Actions
    createReport: createReportMutation.mutate,
    updateReport: updateReportMutation.mutate,
    deleteReport: deleteReportMutation.mutate,
    executeReport: executeReportMutation.mutate,
    refetchReports,
    
    // Hooks for specific queries
    useAnalyticsReport,
    useReportExecutions,
    
    // Execution result
    executionResult: executeReportMutation.data,
  };
};

export const useReportExecution = (executionId: string) => {
  return useQuery({
    queryKey: ['report-execution', executionId],
    queryFn: () => analyticsApi.getReportExecution(executionId),
    enabled: !!executionId,
    staleTime: 30 * 1000, // 30 seconds for execution status
    refetchInterval: (query) => {
      const data = query.state.data as ReportExecution | undefined;
      // Auto-refresh if execution is still running
      return data?.status === 'RUNNING' || data?.status === 'PENDING' ? 5000 : false;
    },
  });
};

export const useAnalyticsEvents = (filters?: EventFilters) => {
  const queryClient = useQueryClient();
  useToastActions();

  // Queries
  const {
    data: events = [],
    isLoading: isLoadingEvents,
    error: eventsError,
    refetch: refetchEvents
  } = useQuery({
    queryKey: ['analytics-events', filters],
    queryFn: () => analyticsApi.getAnalyticsEvents(filters),
    staleTime: 1 * 60 * 1000, // 1 minute for events
  });

  // Mutations
  const trackEventMutation = useMutation({
    mutationFn: (request: EventTrackingRequest) => analyticsApi.trackEvent(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-events'] });
      // Don't show success toast for tracking - too noisy
    },
    onError: (error: any) => {
      // Only show error if it's a manual tracking attempt
      console.error('Event tracking failed:', error);
    },
  });

  const trackPublicEventMutation = useMutation({
    mutationFn: (request: EventTrackingRequest) => analyticsApi.trackPublicEvent(request),
    onError: (error: any) => {
      console.error('Public event tracking failed:', error);
    },
  });

  return {
    // Data
    events,
    
    // Loading states
    isLoadingEvents,
    isTrackingEvent: trackEventMutation.isPending,
    isTrackingPublicEvent: trackPublicEventMutation.isPending,
    
    // Error states
    eventsError,
    trackError: trackEventMutation.error,
    trackPublicError: trackPublicEventMutation.error,
    
    // Actions
    trackEvent: trackEventMutation.mutate,
    trackPublicEvent: trackPublicEventMutation.mutate,
    refetchEvents,
  };
};

export const useConversionFunnels = (filters?: FunnelFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: funnels = [],
    isLoading: isLoadingFunnels,
    error: funnelsError,
    refetch: refetchFunnels
  } = useQuery({
    queryKey: ['conversion-funnels', filters],
    queryFn: () => analyticsApi.getConversionFunnels(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useConversionFunnel = (id: number) => {
    return useQuery({
      queryKey: ['conversion-funnel', id],
      queryFn: () => analyticsApi.getConversionFunnel(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  const useFunnelAnalytics = (funnelId: number, filters?: { start_date?: string; end_date?: string }) => {
    return useQuery({
      queryKey: ['funnel-analytics', funnelId, filters],
      queryFn: () => analyticsApi.getFunnelAnalytics(funnelId, filters),
      enabled: !!funnelId,
      staleTime: 10 * 60 * 1000, // 10 minutes for analytics
    });
  };

  // Mutations
  const createFunnelMutation = useMutation({
    mutationFn: (data: CreateConversionFunnelData) => analyticsApi.createConversionFunnel(data),
    onSuccess: (newFunnel) => {
      queryClient.invalidateQueries({ queryKey: ['conversion-funnels'] });
      showSuccess('Funnel Created', `${newFunnel.name} has been created successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create funnel';
      showError('Create Failed', message);
    },
  });

  const updateFunnelMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateConversionFunnelData }) =>
      analyticsApi.updateConversionFunnel(id, data),
    onSuccess: (updatedFunnel) => {
      queryClient.invalidateQueries({ queryKey: ['conversion-funnels'] });
      queryClient.invalidateQueries({ queryKey: ['conversion-funnel', updatedFunnel.id] });
      showSuccess('Funnel Updated', `${updatedFunnel.name} has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update funnel';
      showError('Update Failed', message);
    },
  });

  const deleteFunnelMutation = useMutation({
    mutationFn: (id: number) => analyticsApi.deleteConversionFunnel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversion-funnels'] });
      showSuccess('Funnel Deleted', 'Funnel has been deleted successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete funnel';
      showError('Delete Failed', message);
    },
  });

  const trackFunnelEventMutation = useMutation({
    mutationFn: ({ funnelId, request }: { funnelId: number; request: FunnelTrackingRequest }) =>
      analyticsApi.trackFunnelEvent(funnelId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-analytics'] });
      // Don't show success toast for tracking - too noisy
    },
    onError: (error: any) => {
      console.error('Funnel tracking failed:', error);
    },
  });

  return {
    // Data
    funnels,
    
    // Loading states
    isLoadingFunnels,
    isCreatingFunnel: createFunnelMutation.isPending,
    isUpdatingFunnel: updateFunnelMutation.isPending,
    isDeletingFunnel: deleteFunnelMutation.isPending,
    isTrackingFunnelEvent: trackFunnelEventMutation.isPending,
    
    // Error states
    funnelsError,
    createError: createFunnelMutation.error,
    updateError: updateFunnelMutation.error,
    deleteError: deleteFunnelMutation.error,
    trackError: trackFunnelEventMutation.error,
    
    // Actions
    createFunnel: createFunnelMutation.mutate,
    updateFunnel: updateFunnelMutation.mutate,
    deleteFunnel: deleteFunnelMutation.mutate,
    trackFunnelEvent: trackFunnelEventMutation.mutate,
    refetchFunnels,
    
    // Hooks for specific queries
    useConversionFunnel,
    useFunnelAnalytics,
  };
};

export const useAlertRules = (filters?: AlertRuleFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: rules = [],
    isLoading: isLoadingRules,
    error: rulesError,
    refetch: refetchRules
  } = useQuery({
    queryKey: ['alert-rules', filters],
    queryFn: () => analyticsApi.getAlertRules(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useAlertRule = (id: number) => {
    return useQuery({
      queryKey: ['alert-rule', id],
      queryFn: () => analyticsApi.getAlertRule(id),
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    });
  };

  // Mutations
  const createRuleMutation = useMutation({
    mutationFn: (data: CreateAlertRuleData) => analyticsApi.createAlertRule(data),
    onSuccess: (newRule) => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      showSuccess('Alert Rule Created', `${newRule.name} has been created successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create alert rule';
      showError('Create Failed', message);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAlertRuleData }) =>
      analyticsApi.updateAlertRule(id, data),
    onSuccess: (updatedRule) => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      queryClient.invalidateQueries({ queryKey: ['alert-rule', updatedRule.id] });
      showSuccess('Alert Rule Updated', `${updatedRule.name} has been updated successfully.`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to update alert rule';
      showError('Update Failed', message);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: number) => analyticsApi.deleteAlertRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      showSuccess('Alert Rule Deleted', 'Alert rule has been deleted successfully.');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to delete alert rule';
      showError('Delete Failed', message);
    },
  });

  const testRuleMutation = useMutation({
    mutationFn: ({ id, request }: { id: number; request: AlertRuleTestRequest }) =>
      analyticsApi.testAlertRule(id, request),
    onSuccess: (result) => {
      const message = result.threshold_met ? 
        `Alert would trigger! Current value: ${result.current_value}` :
        `Alert would not trigger. Current value: ${result.current_value}`;
      showSuccess('Test Completed', message);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to test alert rule';
      showError('Test Failed', message);
    },
  });

  return {
    // Data
    rules,
    
    // Loading states
    isLoadingRules,
    isCreatingRule: createRuleMutation.isPending,
    isUpdatingRule: updateRuleMutation.isPending,
    isDeletingRule: deleteRuleMutation.isPending,
    isTestingRule: testRuleMutation.isPending,
    
    // Error states
    rulesError,
    createError: createRuleMutation.error,
    updateError: updateRuleMutation.error,
    deleteError: deleteRuleMutation.error,
    testError: testRuleMutation.error,
    
    // Actions
    createRule: createRuleMutation.mutate,
    updateRule: updateRuleMutation.mutate,
    deleteRule: deleteRuleMutation.mutate,
    testRule: testRuleMutation.mutate,
    refetchRules,
    
    // Hooks for specific queries
    useAlertRule,
    
    // Test result
    testResult: testRuleMutation.data,
  };
};

export const useEventAggregations = (filters?: EventAggregationFilters) => {
  const {
    data: aggregations = [],
    isLoading: isLoadingAggregations,
    error: aggregationsError,
    refetch: refetchAggregations
  } = useQuery({
    queryKey: ['event-aggregations', filters],
    queryFn: () => analyticsApi.getEventAggregations(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes for aggregations
  });

  return {
    // Data
    aggregations,
    
    // Loading states
    isLoadingAggregations,
    
    // Error states
    aggregationsError,
    
    // Actions
    refetchAggregations,
  };
};

export const useBusinessMetrics = (filters?: { start_date?: string; end_date?: string }) => {
  const {
    data: businessMetrics,
    isLoading: isLoadingBusinessMetrics,
    error: businessMetricsError,
    refetch: refetchBusinessMetrics
  } = useQuery({
    queryKey: ['business-metrics', filters],
    queryFn: () => analyticsApi.getBusinessMetrics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes for business metrics
  });

  return {
    // Data
    businessMetrics,
    
    // Loading states
    isLoadingBusinessMetrics,
    
    // Error states
    businessMetricsError,
    
    // Actions
    refetchBusinessMetrics,
  };
};

export const useAnalyticsAdmin = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Admin mutations
  const createDailyAggregationsMutation = useMutation({
    mutationFn: (date?: string) => analyticsApi.createDailyAggregations(date),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['event-aggregations'] });
      showSuccess('Aggregations Created', `Daily aggregations created for ${result.date}`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create daily aggregations';
      showError('Aggregation Failed', message);
    },
  });

  const cleanupEventsMutation = useMutation({
    mutationFn: (daysToKeep: number = 90) => analyticsApi.cleanupOldEvents(daysToKeep),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['analytics-events'] });
      showSuccess('Cleanup Completed', `Deleted ${result.deleted_count} old events`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to cleanup old events';
      showError('Cleanup Failed', message);
    },
  });

  const evaluateAlertsMutation = useMutation({
    mutationFn: () => analyticsApi.evaluateAlerts(),
    onSuccess: () => {
      showSuccess('Alerts Evaluated', 'All alert rules have been evaluated');
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to evaluate alerts';
      showError('Evaluation Failed', message);
    },
  });

  return {
    // Loading states
    isCreatingAggregations: createDailyAggregationsMutation.isPending,
    isCleaningUpEvents: cleanupEventsMutation.isPending,
    isEvaluatingAlerts: evaluateAlertsMutation.isPending,
    
    // Error states
    createAggregationsError: createDailyAggregationsMutation.error,
    cleanupEventsError: cleanupEventsMutation.error,
    evaluateAlertsError: evaluateAlertsMutation.error,
    
    // Actions
    createDailyAggregations: createDailyAggregationsMutation.mutate,
    cleanupOldEvents: cleanupEventsMutation.mutate,
    evaluateAlerts: evaluateAlertsMutation.mutate,
  };
};

// Public tracking hook for client-side usage
export const usePublicAnalytics = () => {
  const trackPublicMutation = useMutation({
    mutationFn: (request: EventTrackingRequest) => analyticsApi.trackPublicAnalytics(request),
    onError: (error: any) => {
      // Silent fail for public tracking
      console.warn('Public analytics tracking failed:', error);
    },
  });

  return {
    // Loading states
    isTracking: trackPublicMutation.isPending,
    
    // Actions
    track: trackPublicMutation.mutate,
    
    // Silent tracking function that never throws
    trackSilent: (request: EventTrackingRequest) => {
      try {
        trackPublicMutation.mutate(request);
      } catch (error) {
        console.warn('Silent tracking failed:', error);
      }
    },
  };
};

// Additional hooks for metadata and helper functions
export const useActiveMetrics = () => {
  return useQuery({
    queryKey: ['metric-definitions', 'active'],
    queryFn: () => analyticsApi.getActiveMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for getting source domain options
export const useSourceDomains = () => {
  return useQuery({
    queryKey: ['analytics', 'source-domains'],
    queryFn: async () => {
      // This could be expanded to fetch from backend or use static list
      return [
        'bookings',
        'events', 
        'payments',
        'clients',
        'workflows',
        'products',
        'communications',
        'analytics',
      ];
    },
    staleTime: 60 * 60 * 1000, // 1 hour - these don't change often
  });
};

// Hook for getting available source models for a domain
export const useSourceModels = (domain?: string) => {
  return useQuery({
    queryKey: ['analytics', 'source-models', domain],
    queryFn: async () => {
      // This could be expanded to fetch from backend based on domain
      const modelsByDomain: Record<string, string[]> = {
        bookings: ['BookingSession', 'BookingConfirmation'],
        events: ['Event', 'EventBooking', 'EventType'],
        payments: ['Payment', 'PaymentIntent', 'Refund'],
        clients: ['Client', 'ClientProfile', 'ClientInteraction'],
        workflows: ['WorkflowExecution', 'WorkflowStep', 'WorkflowTemplate'],
        products: ['Product', 'Package', 'ProductVariant'],
        communications: ['Notification', 'Email', 'SMS'],
        analytics: ['AnalyticsEvent', 'MetricDefinition', 'Dashboard'],
      };
      
      return domain ? modelsByDomain[domain] || [] : [];
    },
    enabled: !!domain,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

// Hook for getting available fields for a model
export const useSourceFields = (domain?: string, model?: string) => {
  return useQuery({
    queryKey: ['analytics', 'source-fields', domain, model],
    queryFn: async () => {
      // This could be expanded to fetch actual field metadata from backend
      const commonFields = [
        'id',
        'created_at',
        'updated_at',
        'status',
      ];
      
      const fieldsByModel: Record<string, string[]> = {
        Payment: [...commonFields, 'amount', 'currency', 'payment_method'],
        Event: [...commonFields, 'duration_minutes', 'capacity', 'price'],
        Client: [...commonFields, 'total_spent', 'events_attended'],
        BookingSession: [...commonFields, 'session_duration', 'pages_viewed'],
      };
      
      return model ? fieldsByModel[model] || commonFields : [];
    },
    enabled: !!domain && !!model,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

// Export hooks
export const useAnalyticsExport = () => {
  const { showSuccess, showError } = useToastActions();

  const exportMetricsConfiguration = useMutation({
    mutationFn: (options?: ExportOptions) => analyticsApi.exportMetricsConfiguration(options),
    onSuccess: (data, variables) => {
      if (variables?.format === 'json') {
        showSuccess('Metrics configuration exported successfully');
      } else {
        showSuccess('Metrics configuration downloaded successfully');
      }
    },
    onError: (error: any) => {
      showError(error?.response?.data?.detail || 'Failed to export metrics configuration');
    },
  });

  const exportDashboardSettings = useMutation({
    mutationFn: (options?: ExportOptions) => analyticsApi.exportDashboardSettings(options),
    onSuccess: (data, variables) => {
      if (variables?.format === 'json') {
        showSuccess('Dashboard settings exported successfully');
      } else {
        showSuccess('Dashboard settings downloaded successfully');
      }
    },
    onError: (error: any) => {
      showError(error?.response?.data?.detail || 'Failed to export dashboard settings');
    },
  });

  const exportAlertRules = useMutation({
    mutationFn: (options?: ExportOptions) => analyticsApi.exportAlertRules(options),
    onSuccess: (data, variables) => {
      if (variables?.format === 'json') {
        showSuccess('Alert rules exported successfully');
      } else {
        showSuccess('Alert rules downloaded successfully');
      }
    },
    onError: (error: any) => {
      showError(error?.response?.data?.detail || 'Failed to export alert rules');
    },
  });

  const createFullBackup = useMutation({
    mutationFn: () => analyticsApi.createFullBackup(),
    onSuccess: () => {
      showSuccess('Full analytics backup created and downloaded successfully');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.detail || 'Failed to create full backup');
    },
  });

  return {
    exportMetricsConfiguration,
    exportDashboardSettings,
    exportAlertRules,
    createFullBackup,
    isExportingMetrics: exportMetricsConfiguration.isPending,
    isExportingDashboards: exportDashboardSettings.isPending,
    isExportingAlerts: exportAlertRules.isPending,
    isCreatingBackup: createFullBackup.isPending,
  };
};