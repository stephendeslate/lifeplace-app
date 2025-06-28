// frontend/admin-crm/src/types/analytics.types.ts

export interface MetricDefinition {
  id: number;
  name: string;
  description: string;
  metric_type: MetricType;
  source_domain: string;
  source_model: string;
  source_field: string;
  calculation_rules: Record<string, any>;
  filters: Record<string, any>;
  aggregation_period: AggregationPeriod;
  is_real_time: boolean;
  display_format: string;
  decimal_places: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dashboard {
  id: number;
  name: string;
  description: string;
  dashboard_type: DashboardType;
  is_public: boolean;
  allowed_roles: string[];
  created_by: number;
  created_by_name?: string;
  layout_config: Record<string, any>;
  auto_refresh_interval: number;
  is_active: boolean;
  is_default: boolean;
  widgets_count?: number;
  widgets?: Widget[];
  created_at: string;
  updated_at: string;
}

export interface Widget {
  id: number;
  dashboard: number;
  dashboard_name?: string;
  metric_definition: number;
  metric_definition_name?: string;
  metric_definition_type?: string;
  widget_type: WidgetType;
  title: string;
  size: WidgetSize;
  position_x: number;
  position_y: number;
  order: number;
  chart_config: Record<string, any>;
  time_range: string;
  data_filters: Record<string, any>;
  comparison_enabled: boolean;
  comparison_period: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsReport {
  id: number;
  name: string;
  description: string;
  report_type: ReportType;
  template_config: Record<string, any>;
  filters: Record<string, any>;
  schedule_frequency: ScheduleFrequency;
  schedule_time: string | null;
  schedule_day_of_week: number | null;
  schedule_day_of_month: number | null;
  output_format: OutputFormat;
  recipients: string[];
  created_by: number;
  created_by_name?: string;
  is_active: boolean;
  last_generated: string | null;
  metrics_count?: number;
  metrics?: MetricDefinition[];
  recent_executions?: ReportExecution[];
  created_at: string;
  updated_at: string;
}

export interface ReportExecution {
  id: number;
  report: number;
  report_name?: string;
  execution_id: string;
  status: ExecutionStatus;
  started_at: string | null;
  completed_at: string | null;
  execution_params: Record<string, any>;
  date_range_start: string;
  date_range_end: string;
  result_data: Record<string, any>;
  file_path: string;
  file_size: number | null;
  execution_time_seconds: number | null;
  error_message: string;
  requested_by: number;
  requested_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: number;
  event_name: string;
  event_category: EventCategory;
  source_domain: string;
  source_model: string;
  source_id: number | null;
  user: number | null;
  user_name?: string;
  session_id: string;
  ip_address: string | null;
  user_agent: string;
  event_data: Record<string, any>;
  numeric_value: number | null;
  event_timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface EventAggregation {
  id: number;
  metric_definition: number;
  metric_definition_name?: string;
  aggregation_type: AggregationType;
  period_start: string;
  period_end: string;
  total_count: number;
  total_sum: string;
  average_value: string | null;
  min_value: string | null;
  max_value: string | null;
  aggregated_data: Record<string, any>;
  is_complete: boolean;
  processed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversionFunnel {
  id: number;
  name: string;
  description: string;
  steps: FunnelStep[];
  time_window_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FunnelStep {
  event_name: string;
  name: string;
  description?: string;
  order: number;
}

export interface FunnelConversion {
  id: number;
  funnel: number;
  funnel_name?: string;
  user: number | null;
  user_name?: string;
  session_id: string;
  started_at: string;
  completed_at: string | null;
  is_completed: boolean;
  current_step: number;
  completed_steps: any[];
  conversion_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AlertRule {
  id: number;
  name: string;
  description: string;
  metric_definition: number;
  metric_definition_name?: string;
  operator: AlertOperator;
  threshold_value: string;
  evaluation_period: string;
  evaluation_frequency: number;
  notification_methods: string[];
  recipients: string[];
  is_active: boolean;
  last_triggered: string | null;
  last_evaluated: string | null;
  cooldown_minutes: number;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

// Enums and Types
export type MetricType = 'COUNT' | 'SUM' | 'AVERAGE' | 'PERCENTAGE' | 'RATIO' | 'CONVERSION_RATE' | 'REVENUE' | 'CUSTOM';
export type AggregationPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'REAL_TIME';
export type DashboardType = 'EXECUTIVE' | 'OPERATIONAL' | 'CLIENT' | 'FINANCIAL' | 'MARKETING' | 'CUSTOM';
export type WidgetType = 'METRIC_CARD' | 'LINE_CHART' | 'BAR_CHART' | 'PIE_CHART' | 'AREA_CHART' | 'TABLE' | 'FUNNEL' | 'GAUGE' | 'HEATMAP' | 'PROGRESS_BAR';
export type WidgetSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'WIDE' | 'EXTRA_WIDE' | 'TALL';
export type ReportType = 'BUSINESS_SUMMARY' | 'FINANCIAL' | 'BOOKING_PERFORMANCE' | 'CLIENT_ANALYSIS' | 'WORKFLOW_EFFICIENCY' | 'PAYMENT_ANALYSIS' | 'CUSTOM';
export type ScheduleFrequency = 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type OutputFormat = 'PDF' | 'EXCEL' | 'CSV' | 'HTML' | 'JSON';
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type EventCategory = 'USER_ACTION' | 'SYSTEM_EVENT' | 'BUSINESS_EVENT' | 'ERROR_EVENT' | 'PERFORMANCE';
export type AggregationType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type AlertOperator = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NE' | 'CHANGE_GT' | 'CHANGE_LT';

export const METRIC_TYPES = [
  { value: 'COUNT', label: 'Count' },
  { value: 'SUM', label: 'Sum' },
  { value: 'AVERAGE', label: 'Average' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'RATIO', label: 'Ratio' },
  { value: 'CONVERSION_RATE', label: 'Conversion Rate' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'CUSTOM', label: 'Custom Calculation' },
] as const;

export const AGGREGATION_PERIODS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'REAL_TIME', label: 'Real Time' },
] as const;

export const DASHBOARD_TYPES = [
  { value: 'EXECUTIVE', label: 'Executive Dashboard' },
  { value: 'OPERATIONAL', label: 'Operational Dashboard' },
  { value: 'CLIENT', label: 'Client Dashboard' },
  { value: 'FINANCIAL', label: 'Financial Dashboard' },
  { value: 'MARKETING', label: 'Marketing Dashboard' },
  { value: 'CUSTOM', label: 'Custom Dashboard' },
] as const;

export const WIDGET_TYPES = [
  { value: 'METRIC_CARD', label: 'Metric Card' },
  { value: 'LINE_CHART', label: 'Line Chart' },
  { value: 'BAR_CHART', label: 'Bar Chart' },
  { value: 'PIE_CHART', label: 'Pie Chart' },
  { value: 'AREA_CHART', label: 'Area Chart' },
  { value: 'TABLE', label: 'Data Table' },
  { value: 'FUNNEL', label: 'Conversion Funnel' },
  { value: 'GAUGE', label: 'Gauge Chart' },
  { value: 'HEATMAP', label: 'Heatmap' },
  { value: 'PROGRESS_BAR', label: 'Progress Bar' },
] as const;

export const WIDGET_SIZES = [
  { value: 'SMALL', label: 'Small (1x1)' },
  { value: 'MEDIUM', label: 'Medium (2x1)' },
  { value: 'LARGE', label: 'Large (2x2)' },
  { value: 'WIDE', label: 'Wide (3x1)' },
  { value: 'EXTRA_WIDE', label: 'Extra Wide (4x1)' },
  { value: 'TALL', label: 'Tall (1x2)' },
] as const;

export const REPORT_TYPES = [
  { value: 'BUSINESS_SUMMARY', label: 'Business Summary' },
  { value: 'FINANCIAL', label: 'Financial Report' },
  { value: 'BOOKING_PERFORMANCE', label: 'Booking Performance' },
  { value: 'CLIENT_ANALYSIS', label: 'Client Analysis' },
  { value: 'WORKFLOW_EFFICIENCY', label: 'Workflow Efficiency' },
  { value: 'PAYMENT_ANALYSIS', label: 'Payment Analysis' },
  { value: 'CUSTOM', label: 'Custom Report' },
] as const;

export const SCHEDULE_FREQUENCIES = [
  { value: 'MANUAL', label: 'Manual Only' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
] as const;

export const OUTPUT_FORMATS = [
  { value: 'PDF', label: 'PDF' },
  { value: 'EXCEL', label: 'Excel' },
  { value: 'CSV', label: 'CSV' },
  { value: 'HTML', label: 'HTML' },
  { value: 'JSON', label: 'JSON' },
] as const;

export const EXECUTION_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const EVENT_CATEGORIES = [
  { value: 'USER_ACTION', label: 'User Action' },
  { value: 'SYSTEM_EVENT', label: 'System Event' },
  { value: 'BUSINESS_EVENT', label: 'Business Event' },
  { value: 'ERROR_EVENT', label: 'Error Event' },
  { value: 'PERFORMANCE', label: 'Performance' },
] as const;

export const AGGREGATION_TYPES = [
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
] as const;

export const ALERT_OPERATORS = [
  { value: 'GT', label: 'Greater Than' },
  { value: 'GTE', label: 'Greater Than or Equal' },
  { value: 'LT', label: 'Less Than' },
  { value: 'LTE', label: 'Less Than or Equal' },
  { value: 'EQ', label: 'Equal' },
  { value: 'NE', label: 'Not Equal' },
  { value: 'CHANGE_GT', label: 'Change Greater Than' },
  { value: 'CHANGE_LT', label: 'Change Less Than' },
] as const;

// Create/Update Data Types
export interface CreateMetricDefinitionData {
  name: string;
  description?: string;
  metric_type: MetricType;
  source_domain: string;
  source_model: string;
  source_field?: string;
  calculation_rules?: Record<string, any>;
  filters?: Record<string, any>;
  aggregation_period?: AggregationPeriod;
  is_real_time?: boolean;
  display_format?: string;
  decimal_places?: number;
}

export interface UpdateMetricDefinitionData extends Partial<CreateMetricDefinitionData> {
  is_active?: boolean;
}

export interface CreateDashboardData {
  name: string;
  description?: string;
  dashboard_type: DashboardType;
  is_public?: boolean;
  allowed_roles?: string[];
  layout_config?: Record<string, any>;
  auto_refresh_interval?: number;
  is_active?: boolean;
  is_default?: boolean;
}

export interface UpdateDashboardData extends Partial<CreateDashboardData> {}

export interface CreateWidgetData {
  metric_definition: number;
  widget_type: WidgetType;
  title: string;
  size?: WidgetSize;
  position_x?: number;
  position_y?: number;
  order?: number;
  chart_config?: Record<string, any>;
  time_range?: string;
  data_filters?: Record<string, any>;
  comparison_enabled?: boolean;
  comparison_period?: string;
  is_visible?: boolean;
}

export interface UpdateWidgetData extends Partial<CreateWidgetData> {}

export interface CreateAnalyticsReportData {
  name: string;
  description?: string;
  report_type: ReportType;
  metrics?: number[];
  template_config?: Record<string, any>;
  filters?: Record<string, any>;
  schedule_frequency?: ScheduleFrequency;
  schedule_time?: string;
  schedule_day_of_week?: number;
  schedule_day_of_month?: number;
  output_format?: OutputFormat;
  recipients?: string[];
  is_active?: boolean;
}

export interface UpdateAnalyticsReportData extends Partial<CreateAnalyticsReportData> {}

export interface CreateConversionFunnelData {
  name: string;
  description?: string;
  steps: FunnelStep[];
  time_window_hours?: number;
  is_active?: boolean;
}

export interface UpdateConversionFunnelData extends Partial<CreateConversionFunnelData> {}

export interface CreateAlertRuleData {
  name: string;
  description?: string;
  metric_definition: number;
  operator: AlertOperator;
  threshold_value: string;
  evaluation_period?: string;
  evaluation_frequency?: number;
  notification_methods?: string[];
  recipients?: string[];
  cooldown_minutes?: number;
  is_active?: boolean;
}

export interface UpdateAlertRuleData extends Partial<CreateAlertRuleData> {}

// Request/Response Types
export interface MetricCalculationRequest {
  start_date?: string;
  end_date?: string;
  filters?: Record<string, any>;
}

export interface MetricCalculationResult {
  metric_id: number;
  metric_name: string;
  value: string;
  display_format: string;
  calculation_time: string;
  time_range: {
    start_date?: string;
    end_date?: string;
  };
}

export interface DashboardDataRequest {
  time_range?: string;
  refresh_cache?: boolean;
}

export interface DashboardDataResult {
  dashboard: Dashboard;
  widgets_data: Array<{
    widget: Widget;
    value: string | null;
    error: string | null;
  }>;
  time_range: {
    start_date: string;
    end_date: string;
    label: string;
  };
  last_updated: string;
}

export interface ReportExecutionRequest {
  start_date?: string;
  end_date?: string;
  custom_filters?: Record<string, any>;
  output_format?: OutputFormat;
}

export interface EventTrackingRequest {
  event_name: string;
  event_category?: EventCategory;
  source_domain?: string;
  source_model?: string;
  source_id?: number;
  session_id?: string;
  event_data?: Record<string, any>;
  numeric_value?: number;
}

export interface FunnelTrackingRequest {
  event_name: string;
  session_id?: string;
  event_data?: Record<string, any>;
}

export interface AlertRuleTestRequest {
  evaluation_period?: string;
  send_test_notification?: boolean;
}

export interface BusinessMetricsResult {
  total_events: number;
  confirmed_events: number;
  completed_events: number;
  event_conversion_rate: string;
  total_payments: number;
  completed_payments: number;
  total_revenue: string;
  average_payment_value: string;
  total_booking_sessions: number;
  completed_booking_sessions: number;
  abandoned_booking_sessions: number;
  booking_conversion_rate: string;
  new_users: number;
  new_clients: number;
  calculation_time: string;
  time_range: {
    start_date?: string;
    end_date?: string;
  };
}

export interface FunnelAnalyticsResult {
  funnel: ConversionFunnel;
  total_started: number;
  total_completed: number;
  overall_conversion_rate: string;
  step_analytics: Array<{
    step_index: number;
    step_name: string;
    completed_count: number;
    conversion_rate: number;
  }>;
  time_range: {
    start_date: string;
    end_date: string;
  };
}

export interface NotificationCounts {
  total: number;
  unread: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface NotificationStats {
  period: string;
  total_sent: number;
  total_read: number;
  read_rate: number;
  delivery_rates: Record<string, number>;
  popular_types: Array<{
    notification_type__name: string;
    notification_type__code: string;
    count: number;
  }>;
}

// Filter Types
export interface AnalyticsFilters {
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface MetricDefinitionFilters extends AnalyticsFilters {
  source_domain?: string;
  is_active?: boolean;
}

export interface DashboardFilters extends AnalyticsFilters {
  dashboard_type?: DashboardType;
  is_active?: boolean;
}

export interface AnalyticsReportFilters extends AnalyticsFilters {
  report_type?: ReportType;
  is_active?: boolean;
}

export interface EventFilters extends AnalyticsFilters {
  event_category?: EventCategory;
  source_domain?: string;
  user_id?: number;
}

export interface FunnelFilters {
  is_active?: boolean;
}

export interface AlertRuleFilters extends AnalyticsFilters {
  is_active?: boolean;
}

export interface EventAggregationFilters {
  metric_id?: number;
  aggregation_type?: AggregationType;
}

// Form Data Types
export interface MetricDefinitionFormData {
  name: string;
  description: string;
  metric_type: MetricType;
  source_domain: string;
  source_model: string;
  source_field: string;
  calculation_rules: Record<string, any>;
  filters: Record<string, any>;
  aggregation_period: AggregationPeriod;
  is_real_time: boolean;
  display_format: string;
  decimal_places: string;
  is_active: boolean;
}

export interface DashboardFormData {
  name: string;
  description: string;
  dashboard_type: DashboardType;
  is_public: boolean;
  allowed_roles: string[];
  layout_config: Record<string, any>;
  auto_refresh_interval: string;
  is_active: boolean;
  is_default: boolean;
}

export interface WidgetFormData {
  metric_definition: string;
  widget_type: WidgetType;
  title: string;
  size: WidgetSize;
  position_x: string;
  position_y: string;
  order: string;
  chart_config: Record<string, any>;
  time_range: string;
  data_filters: Record<string, any>;
  comparison_enabled: boolean;
  comparison_period: string;
  is_visible: boolean;
}

export interface AnalyticsReportFormData {
  name: string;
  description: string;
  report_type: ReportType;
  metrics: number[];
  template_config: Record<string, any>;
  filters: Record<string, any>;
  schedule_frequency: ScheduleFrequency;
  schedule_time: string;
  schedule_day_of_week: string;
  schedule_day_of_month: string;
  output_format: OutputFormat;
  recipients: string[];
  is_active: boolean;
}

export interface ConversionFunnelFormData {
  name: string;
  description: string;
  steps: FunnelStep[];
  time_window_hours: string;
  is_active: boolean;
}

export interface AlertRuleFormData {
  name: string;
  description: string;
  metric_definition: string;
  operator: AlertOperator;
  threshold_value: string;
  evaluation_period: string;
  evaluation_frequency: string;
  notification_methods: string[];
  recipients: string[];
  cooldown_minutes: string;
  is_active: boolean;
}

// Paginated Response
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Component Props Types
export interface MetricDefinitionTableProps {
  metrics: MetricDefinition[];
  isLoading: boolean;
  onEdit: (metric: MetricDefinition) => void;
  onDelete: (id: number) => void;
  onCalculate?: (metric: MetricDefinition) => void;
  isDeleting: boolean;
}

export interface MetricDefinitionFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingMetric?: MetricDefinition | null;
  onSubmit: (data: CreateMetricDefinitionData | UpdateMetricDefinitionData) => void;
  isLoading: boolean;
}

export interface DashboardTableProps {
  dashboards: Dashboard[];
  isLoading: boolean;
  onEdit: (dashboard: Dashboard) => void;
  onView: (dashboard: Dashboard) => void;
  onDelete: (id: number) => void;
  onDuplicate?: (dashboard: Dashboard) => void;
  isDeleting: boolean;
}

export interface DashboardFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingDashboard?: Dashboard | null;
  onSubmit: (data: CreateDashboardData | UpdateDashboardData) => void;
  isLoading: boolean;
}

export interface WidgetTableProps {
  widgets: Widget[];
  isLoading: boolean;
  onEdit: (widget: Widget) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface WidgetFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingWidget?: Widget | null;
  dashboardId?: number;
  onSubmit: (data: CreateWidgetData | UpdateWidgetData) => void;
  isLoading: boolean;
}

export interface AnalyticsReportTableProps {
  reports: AnalyticsReport[];
  isLoading: boolean;
  onEdit: (report: AnalyticsReport) => void;
  onView: (report: AnalyticsReport) => void;
  onExecute: (report: AnalyticsReport) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface AnalyticsReportFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingReport?: AnalyticsReport | null;
  onSubmit: (data: CreateAnalyticsReportData | UpdateAnalyticsReportData) => void;
  isLoading: boolean;
}

export interface ConversionFunnelTableProps {
  funnels: ConversionFunnel[];
  isLoading: boolean;
  onEdit: (funnel: ConversionFunnel) => void;
  onView: (funnel: ConversionFunnel) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface ConversionFunnelFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingFunnel?: ConversionFunnel | null;
  onSubmit: (data: CreateConversionFunnelData | UpdateConversionFunnelData) => void;
  isLoading: boolean;
}

export interface AlertRuleTableProps {
  rules: AlertRule[];
  isLoading: boolean;
  onEdit: (rule: AlertRule) => void;
  onTest: (rule: AlertRule) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export interface AlertRuleFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingRule?: AlertRule | null;
  onSubmit: (data: CreateAlertRuleData | UpdateAlertRuleData) => void;
  isLoading: boolean;
}

export interface DashboardViewProps {
  dashboard: Dashboard;
  data: DashboardDataResult;
  isLoading: boolean;
  onRefresh: () => void;
  onEditWidget?: (widget: Widget) => void;
}

export interface MetricCardProps {
  value: string | number;
  title: string;
  description?: string;
  format?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: string;
  icon?: React.ReactNode;
}

export interface FunnelVisualizationProps {
  funnel: ConversionFunnel;
  analytics: FunnelAnalyticsResult;
  compact?: boolean;
}

export interface BusinessMetricsSummaryProps {
  metrics: BusinessMetricsResult;
  isLoading: boolean;
  timeRange?: {
    start_date?: string;
    end_date?: string;
  };
}

export interface AnalyticsEventTableProps {
  events: AnalyticsEvent[];
  isLoading: boolean;
  onFilter?: (filters: EventFilters) => void;
}

export interface ReportExecutionTableProps {
  executions: ReportExecution[];
  isLoading: boolean;
  onView: (execution: ReportExecution) => void;
  onDownload?: (execution: ReportExecution) => void;
}