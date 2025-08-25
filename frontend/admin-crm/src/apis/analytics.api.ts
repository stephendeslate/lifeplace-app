// frontend/admin-crm/src/apis/analytics.api.ts

import api from '../utils/api';
import type {
  MetricDefinition,
  Dashboard,
  Widget,
  AnalyticsReport,
  ReportExecution,
  AnalyticsEvent,
  ConversionFunnel,
  AlertRule,
  EventAggregation,
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
  MetricCalculationResult,
  DashboardDataRequest,
  DashboardDataResult,
  ReportExecutionRequest,
  EventTrackingRequest,
  FunnelTrackingRequest,
  AlertRuleTestRequest,
  BusinessMetricsResult,
  FunnelAnalyticsResult,
  MetricDefinitionFilters,
  DashboardFilters,
  AnalyticsReportFilters,
  EventFilters,
  FunnelFilters,
  AlertRuleFilters,
  EventAggregationFilters,
  ExportData,
  ExportOptions,
  BackupData,
} from '../types/analytics.types';

export const analyticsApi = {
  // Metric Definitions
  getMetricDefinitions: async (filters?: MetricDefinitionFilters): Promise<MetricDefinition[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.source_domain) params.append('source_domain', filters.source_domain);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const response = await api.get(`/analytics/metrics/?${params.toString()}`);
    const data = response.data as { results?: MetricDefinition[] } | MetricDefinition[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getMetricDefinition: async (id: number): Promise<MetricDefinition> => {
    const response = await api.get<MetricDefinition>(`/analytics/metrics/${id}/`);
    return response.data;
  },

  createMetricDefinition: async (data: CreateMetricDefinitionData): Promise<MetricDefinition> => {
    const response = await api.post<MetricDefinition>('/analytics/metrics/', data);
    return response.data;
  },

  updateMetricDefinition: async (id: number, data: UpdateMetricDefinitionData): Promise<MetricDefinition> => {
    const response = await api.patch<MetricDefinition>(`/analytics/metrics/${id}/`, data);
    return response.data;
  },

  deleteMetricDefinition: async (id: number): Promise<void> => {
    await api.delete(`/analytics/metrics/${id}/`);
  },

  calculateMetric: async (id: number, request: MetricCalculationRequest): Promise<MetricCalculationResult> => {
    const response = await api.post<MetricCalculationResult>(`/analytics/metrics/${id}/calculate/`, request);
    return response.data;
  },

  getActiveMetrics: async (): Promise<MetricDefinition[]> => {
    const response = await api.get<MetricDefinition[]>('/analytics/metrics/active/');
    const data = response.data as { results?: MetricDefinition[] } | MetricDefinition[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  // Dashboards
  getDashboards: async (filters?: DashboardFilters): Promise<Dashboard[]> => {
    const params = new URLSearchParams();
    if (filters?.dashboard_type) params.append('dashboard_type', filters.dashboard_type);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const response = await api.get(`/analytics/dashboards/?${params.toString()}`);
    const data = response.data as { results?: Dashboard[] } | Dashboard[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getDashboard: async (id: number): Promise<Dashboard> => {
    const response = await api.get<Dashboard>(`/analytics/dashboards/${id}/`);
    return response.data;
  },

  createDashboard: async (data: CreateDashboardData): Promise<Dashboard> => {
    const response = await api.post<Dashboard>('/analytics/dashboards/', data);
    return response.data;
  },

  updateDashboard: async (id: number, data: UpdateDashboardData): Promise<Dashboard> => {
    const response = await api.patch<Dashboard>(`/analytics/dashboards/${id}/`, data);
    return response.data;
  },

  deleteDashboard: async (id: number): Promise<void> => {
    await api.delete(`/analytics/dashboards/${id}/`);
  },

  getDashboardData: async (id: number, request: DashboardDataRequest): Promise<DashboardDataResult> => {
    const response = await api.post<DashboardDataResult>(`/analytics/dashboards/${id}/get_data/`, request);
    return response.data;
  },

  addWidgetToDashboard: async (dashboardId: number, data: CreateWidgetData): Promise<Widget> => {
    const response = await api.post<Widget>(`/analytics/dashboards/${dashboardId}/add_widget/`, data);
    return response.data;
  },

  // Widgets
  getWidgets: async (filters?: { dashboard_id?: number }): Promise<Widget[]> => {
    const params = new URLSearchParams();
    if (filters?.dashboard_id) params.append('dashboard_id', filters.dashboard_id.toString());
    
    const response = await api.get(`/analytics/widgets/?${params.toString()}`);
    const data = response.data as { results?: Widget[] } | Widget[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getWidget: async (id: number): Promise<Widget> => {
    const response = await api.get<Widget>(`/analytics/widgets/${id}/`);
    return response.data;
  },

  updateWidget: async (id: number, data: UpdateWidgetData): Promise<Widget> => {
    const response = await api.patch<Widget>(`/analytics/widgets/${id}/`, data);
    return response.data;
  },

  deleteWidget: async (id: number): Promise<void> => {
    await api.delete(`/analytics/widgets/${id}/`);
  },

  // Analytics Reports
  getAnalyticsReports: async (filters?: AnalyticsReportFilters): Promise<AnalyticsReport[]> => {
    const params = new URLSearchParams();
    if (filters?.report_type) params.append('report_type', filters.report_type);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const response = await api.get(`/analytics/reports/?${params.toString()}`);
    const data = response.data as { results?: AnalyticsReport[] } | AnalyticsReport[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getAnalyticsReport: async (id: number): Promise<AnalyticsReport> => {
    const response = await api.get<AnalyticsReport>(`/analytics/reports/${id}/`);
    return response.data;
  },

  createAnalyticsReport: async (data: CreateAnalyticsReportData): Promise<AnalyticsReport> => {
    const response = await api.post<AnalyticsReport>('/analytics/reports/', data);
    return response.data;
  },

  updateAnalyticsReport: async (id: number, data: UpdateAnalyticsReportData): Promise<AnalyticsReport> => {
    const response = await api.patch<AnalyticsReport>(`/analytics/reports/${id}/`, data);
    return response.data;
  },

  deleteAnalyticsReport: async (id: number): Promise<void> => {
    await api.delete(`/analytics/reports/${id}/`);
  },

  executeReport: async (id: number, request: ReportExecutionRequest): Promise<ReportExecution> => {
    const response = await api.post<ReportExecution>(`/analytics/reports/${id}/execute/`, request);
    return response.data;
  },

  getReportExecutions: async (reportId: number): Promise<ReportExecution[]> => {
    const response = await api.get<ReportExecution[]>(`/analytics/reports/${reportId}/executions/`);
    const data = response.data as { results?: ReportExecution[] } | ReportExecution[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  // Report Executions
  getReportExecution: async (executionId: string): Promise<ReportExecution> => {
    const response = await api.get<ReportExecution>(`/analytics/executions/${executionId}/`);
    return response.data;
  },

  // Analytics Events
  getAnalyticsEvents: async (filters?: EventFilters): Promise<AnalyticsEvent[]> => {
    const params = new URLSearchParams();
    if (filters?.event_category) params.append('event_category', filters.event_category);
    if (filters?.source_domain) params.append('source_domain', filters.source_domain);
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const response = await api.get(`/analytics/events/?${params.toString()}`);
    const data = response.data as { results?: AnalyticsEvent[] } | AnalyticsEvent[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  trackEvent: async (request: EventTrackingRequest): Promise<AnalyticsEvent> => {
    const response = await api.post<AnalyticsEvent>('/analytics/events/', request);
    return response.data;
  },

  // Conversion Funnels
  getConversionFunnels: async (filters?: FunnelFilters): Promise<ConversionFunnel[]> => {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const response = await api.get(`/analytics/funnels/?${params.toString()}`);
    const data = response.data as { results?: ConversionFunnel[] } | ConversionFunnel[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getConversionFunnel: async (id: number): Promise<ConversionFunnel> => {
    const response = await api.get<ConversionFunnel>(`/analytics/funnels/${id}/`);
    return response.data;
  },

  createConversionFunnel: async (data: CreateConversionFunnelData): Promise<ConversionFunnel> => {
    const response = await api.post<ConversionFunnel>('/analytics/funnels/', data);
    return response.data;
  },

  updateConversionFunnel: async (id: number, data: UpdateConversionFunnelData): Promise<ConversionFunnel> => {
    const response = await api.patch<ConversionFunnel>(`/analytics/funnels/${id}/`, data);
    return response.data;
  },

  deleteConversionFunnel: async (id: number): Promise<void> => {
    await api.delete(`/analytics/funnels/${id}/`);
  },

  trackFunnelEvent: async (funnelId: number, request: FunnelTrackingRequest): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>(`/analytics/funnels/${funnelId}/track/`, request);
    return response.data;
  },

  getFunnelAnalytics: async (funnelId: number, filters?: { start_date?: string; end_date?: string }): Promise<FunnelAnalyticsResult> => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get<FunnelAnalyticsResult>(`/analytics/funnels/${funnelId}/analytics/?${params.toString()}`);
    return response.data;
  },

  // Alert Rules
  getAlertRules: async (filters?: AlertRuleFilters): Promise<AlertRule[]> => {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const response = await api.get(`/analytics/alerts/?${params.toString()}`);
    const data = response.data as { results?: AlertRule[] } | AlertRule[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getAlertRule: async (id: number): Promise<AlertRule> => {
    const response = await api.get<AlertRule>(`/analytics/alerts/${id}/`);
    return response.data;
  },

  createAlertRule: async (data: CreateAlertRuleData): Promise<AlertRule> => {
    const response = await api.post<AlertRule>('/analytics/alerts/', data);
    return response.data;
  },

  updateAlertRule: async (id: number, data: UpdateAlertRuleData): Promise<AlertRule> => {
    const response = await api.patch<AlertRule>(`/analytics/alerts/${id}/`, data);
    return response.data;
  },

  deleteAlertRule: async (id: number): Promise<void> => {
    await api.delete(`/analytics/alerts/${id}/`);
  },

  testAlertRule: async (id: number, request: AlertRuleTestRequest): Promise<{ alert_rule: string; current_value: number; threshold_value: number; operator: string; threshold_met: boolean; test_time: string }> => {
    const response = await api.post<{ alert_rule: string; current_value: number; threshold_value: number; operator: string; threshold_met: boolean; test_time: string }>(`/analytics/alerts/${id}/test/`, request);
    return response.data;
  },

  // Event Aggregations
  getEventAggregations: async (filters?: EventAggregationFilters): Promise<EventAggregation[]> => {
    const params = new URLSearchParams();
    if (filters?.metric_id) params.append('metric_id', filters.metric_id.toString());
    if (filters?.aggregation_type) params.append('aggregation_type', filters.aggregation_type);
    
    const response = await api.get(`/analytics/aggregations/?${params.toString()}`);
    const data = response.data as { results?: EventAggregation[] } | EventAggregation[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  // Analytics API endpoints
  getBusinessMetrics: async (filters?: { start_date?: string; end_date?: string }): Promise<BusinessMetricsResult> => {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    
    const response = await api.get<BusinessMetricsResult>(`/analytics/api/business_metrics/?${params.toString()}`);
    return response.data;
  },

  trackPublicEvent: async (request: EventTrackingRequest): Promise<{ success: boolean; event_tracked: boolean }> => {
    const response = await api.post<{ success: boolean; event_tracked: boolean }>('/analytics/api/track_event/', request);
    return response.data;
  },

  createDailyAggregations: async (date?: string): Promise<{ success: boolean; date: string }> => {
    const data = date ? { date } : {};
    const response = await api.post<{ success: boolean; date: string }>('/analytics/api/create_daily_aggregations/', data);
    return response.data;
  },

  cleanupOldEvents: async (daysToKeep: number = 90): Promise<{ success: boolean; deleted_count: number }> => {
    const response = await api.post<{ success: boolean; deleted_count: number }>('/analytics/api/cleanup_events/', { days_to_keep: daysToKeep });
    return response.data;
  },

  evaluateAlerts: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>('/analytics/api/evaluate_alerts/');
    return response.data;
  },

  // Public tracking endpoint
  trackPublicAnalytics: async (request: EventTrackingRequest): Promise<{ success: boolean }> => {
    const response = await api.post<{ success: boolean }>('/analytics/public/track/', request);
    return response.data;
  },

  // Export functions
  exportMetricsConfiguration: async (options: ExportOptions = { format: 'json' }): Promise<ExportData | void> => {
    const params = new URLSearchParams();
    params.append('format', options.format);
    
    if (options.format === 'json') {
      const response = await api.get<ExportData>(`/analytics/api/export_metrics_configuration/?${params.toString()}`);
      return response.data;
    } else {
      // For CSV downloads, trigger file download
      const response = await api.get(`/analytics/api/export_metrics_configuration/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `metrics_configuration_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  },

  exportDashboardSettings: async (options: ExportOptions = { format: 'json' }): Promise<ExportData | void> => {
    const params = new URLSearchParams();
    params.append('format', options.format);
    
    if (options.format === 'json') {
      const response = await api.get<ExportData>(`/analytics/api/export_dashboard_settings/?${params.toString()}`);
      return response.data;
    } else {
      // For CSV downloads, trigger file download
      const response = await api.get(`/analytics/api/export_dashboard_settings/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard_settings_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  },

  exportAlertRules: async (options: ExportOptions = { format: 'json' }): Promise<ExportData | void> => {
    const params = new URLSearchParams();
    params.append('format', options.format);
    
    if (options.format === 'json') {
      const response = await api.get<ExportData>(`/analytics/api/export_alert_rules/?${params.toString()}`);
      return response.data;
    } else {
      // For CSV downloads, trigger file download
      const response = await api.get(`/analytics/api/export_alert_rules/?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `alert_rules_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  },

  createFullBackup: async (): Promise<void> => {
    const response = await api.get('/analytics/api/create_full_backup/', {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};