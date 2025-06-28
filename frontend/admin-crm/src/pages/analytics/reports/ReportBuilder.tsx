// frontend/admin-crm/src/pages/analytics/reports/ReportBuilder.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Alert,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  TextField,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as ReportIcon,
  Timeline as MetricIcon,
  Settings as ConfigIcon,
  Schedule as ScheduleIcon,
  Email as RecipientsIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAnalyticsReports, useMetricDefinitions } from '../../../hooks/useAnalytics';
import { ReportScheduler, ReportPreview } from '../../../components/analytics/reports';
import { LoadingTable } from '../../../components/common/LoadingTable';
import type {
  CreateAnalyticsReportData,
  UpdateAnalyticsReportData,
  MetricDefinition,
  ReportType,
  ScheduleFrequency,
  OutputFormat,
} from '../../../types/analytics.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

interface ReportBuilderState {
  // Basic Configuration
  name: string;
  description: string;
  report_type: ReportType;
  output_format: OutputFormat;
  is_active: boolean;
  
  // Metrics Configuration
  selectedMetrics: MetricDefinition[];
  metricConfigs: Record<number, {
    displayName?: string;
    sortOrder: number;
    includeInSummary: boolean;
    chartType?: string;
    aggregationPeriod?: string;
  }>;
  
  // Template Configuration
  templateConfig: {
    includeHeader: boolean;
    includeFooter: boolean;
    includeSummary: boolean;
    includeCharts: boolean;
    includeDataTables: boolean;
    customStyling: boolean;
    logoUrl?: string;
    headerText?: string;
    footerText?: string;
    summaryText?: string;
  };
  
  // Schedule Configuration
  scheduleConfig: {
    frequency: ScheduleFrequency;
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    recipients: string[];
  };
  
  // Filters Configuration
  reportFilters: {
    dateRange: {
      type: 'relative' | 'absolute' | 'custom';
      relativePeriod?: string;
      startDate?: string;
      endDate?: string;
    };
    customFilters: Array<{
      id: string;
      field: string;
      operator: string;
      value: any;
      enabled: boolean;
    }>;
  };
}

export const ReportBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [currentTab, setCurrentTab] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const isEditing = !!id && id !== 'new';
  const reportId = isEditing ? parseInt(id!, 10) : undefined;

  // Hooks
  const { useAnalyticsReport, createReport, updateReport, isCreatingReport, isUpdatingReport } = useAnalyticsReports();
  const { useActiveMetrics } = useMetricDefinitions();
  
  const { data: existingReport, isLoading: isLoadingReport } = useAnalyticsReport(reportId || 0);
  const { data: availableMetrics = [] } = useActiveMetrics();

  // Builder state
  const [builderState, setBuilderState] = useState<ReportBuilderState>({
    name: '',
    description: '',
    report_type: 'BUSINESS_SUMMARY',
    output_format: 'PDF',
    is_active: true,
    selectedMetrics: [],
    metricConfigs: {},
    templateConfig: {
      includeHeader: true,
      includeFooter: true,
      includeSummary: true,
      includeCharts: true,
      includeDataTables: true,
      customStyling: false,
    },
    scheduleConfig: {
      frequency: 'MANUAL',
      time: '',
      recipients: [],
    },
    reportFilters: {
      dateRange: {
        type: 'relative',
        relativePeriod: 'last_30_days',
      },
      customFilters: [],
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing) {
      setBreadcrumbs([
        { label: 'Analytics', path: '/analytics' },
        { label: 'Reports', path: '/analytics/reports' },
        { label: existingReport?.name || 'Loading...', path: `/analytics/reports/${id}` },
        { label: 'Edit' },
      ]);
    } else {
      setBreadcrumbs([
        { label: 'Analytics', path: '/analytics' },
        { label: 'Reports', path: '/analytics/reports' },
        { label: 'Create Report' },
      ]);
    }
  }, [setBreadcrumbs, isEditing, existingReport, id]);

  // Load existing report data
  useEffect(() => {
    if (existingReport && isEditing) {
      setBuilderState({
        name: existingReport.name,
        description: existingReport.description || '',
        report_type: existingReport.report_type,
        output_format: existingReport.output_format,
        is_active: existingReport.is_active,
        selectedMetrics: existingReport.metrics || [],
        metricConfigs: {},
        templateConfig: {
          includeHeader: true,
          includeFooter: true,
          includeSummary: true,
          includeCharts: true,
          includeDataTables: true,
          customStyling: false,
          ...existingReport.template_config,
        },
        scheduleConfig: {
          frequency: existingReport.schedule_frequency,
          time: existingReport.schedule_time || '',
          dayOfWeek: existingReport.schedule_day_of_week || undefined,
          dayOfMonth: existingReport.schedule_day_of_month || undefined,
          recipients: existingReport.recipients,
        },
        reportFilters: {
          dateRange: {
            type: 'relative',
            relativePeriod: 'last_30_days',
          },
          customFilters: [],
          ...existingReport.filters,
        },
      });
    }
  }, [existingReport, isEditing]);

  const handleBack = () => {
    if (isEditing) {
      navigate(`/analytics/reports/${id}`);
    } else {
      navigate('/analytics/reports');
    }
  };

  const validateBuilder = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!builderState.name.trim()) {
      newErrors.general = 'Report name is required';
    }

    if (builderState.selectedMetrics.length === 0) {
      newErrors.metrics = 'At least one metric must be selected';
    }

    if (builderState.scheduleConfig.frequency !== 'MANUAL') {
      if (!builderState.scheduleConfig.time) {
        newErrors.schedule = 'Schedule time is required for automated reports';
      }

      if (builderState.scheduleConfig.frequency === 'WEEKLY' && builderState.scheduleConfig.dayOfWeek === undefined) {
        newErrors.schedule = 'Day of week is required for weekly reports';
      }

      if (builderState.scheduleConfig.frequency === 'MONTHLY' && !builderState.scheduleConfig.dayOfMonth) {
        newErrors.schedule = 'Day of month is required for monthly reports';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateBuilder()) {
      return;
    }

    const createReportData: CreateAnalyticsReportData = {
      name: builderState.name.trim(),
      description: builderState.description.trim() || undefined,
      report_type: builderState.report_type,
      metrics: builderState.selectedMetrics.map(m => m.id),
      template_config: builderState.templateConfig,
      filters: builderState.reportFilters,
      schedule_frequency: builderState.scheduleConfig.frequency,
      schedule_time: builderState.scheduleConfig.time || undefined,
      schedule_day_of_week: builderState.scheduleConfig.dayOfWeek,
      schedule_day_of_month: builderState.scheduleConfig.dayOfMonth,
      output_format: builderState.output_format,
      recipients: builderState.scheduleConfig.recipients,
      is_active: builderState.is_active,
    };

    const updateReportData: UpdateAnalyticsReportData = {
      ...createReportData,
    };

    try {
      if (isEditing && reportId) {
        await updateReport({ id: reportId, data: updateReportData });
        navigate(`/analytics/reports/${reportId}`);
      } else {
        const newReport = await createReport(createReportData);
        // If createReport returns the new report object with an id, navigate to its page
        if (
          typeof newReport === 'object' &&
          newReport !== null &&
          'id' in newReport &&
          typeof (newReport as { id?: number }).id === 'number'
        ) {
          navigate(`/analytics/reports/${(newReport as { id: number }).id}`);
        } else {
          // If createReport returns void or an object without id, fallback to navigating to the reports list
          navigate('/analytics/reports');
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleAddMetric = (metric: MetricDefinition) => {
    if (!builderState.selectedMetrics.find(m => m.id === metric.id)) {
      const newSelectedMetrics = [...builderState.selectedMetrics, metric];
      const newMetricConfigs = {
        ...builderState.metricConfigs,
        [metric.id]: {
          sortOrder: newSelectedMetrics.length,
          includeInSummary: true,
          chartType: 'line',
          aggregationPeriod: 'daily',
        },
      };

      setBuilderState({
        ...builderState,
        selectedMetrics: newSelectedMetrics,
        metricConfigs: newMetricConfigs,
      });
    }
  };

  const handleRemoveMetric = (metricId: number) => {
    const newSelectedMetrics = builderState.selectedMetrics.filter(m => m.id !== metricId);
    const newMetricConfigs = { ...builderState.metricConfigs };
    delete newMetricConfigs[metricId];

    setBuilderState({
      ...builderState,
      selectedMetrics: newSelectedMetrics,
      metricConfigs: newMetricConfigs,
    });
  };

  const steps = [
    'Basic Information',
    'Metrics Selection',
    'Template Configuration',
    'Schedule & Recipients',
    'Review & Save',
  ];

  if (isLoadingReport && isEditing) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <LoadingTable />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={handleBack} size="small">
            <BackIcon />
          </IconButton>
          
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {isEditing ? 'Edit Report' : 'Create New Report'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditing ? `Editing: ${existingReport?.name}` : 'Build a custom analytics report'}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => setShowPreview(true)}
            disabled={builderState.selectedMetrics.length === 0}
          >
            Preview
          </Button>
          
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isCreatingReport || isUpdatingReport}
          >
            {isCreatingReport || isUpdatingReport 
              ? 'Saving...' 
              : isEditing ? 'Update Report' : 'Create Report'
            }
          </Button>
        </Box>
      </Box>

      {/* Progress Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel 
                  onClick={() => setCurrentStep(index)}
                  sx={{ cursor: 'pointer' }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Error Display */}
      {Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following issues:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Builder Content */}
      <Card>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<ReportIcon />} label="Basic Info" iconPosition="start" />
          <Tab icon={<MetricIcon />} label="Metrics" iconPosition="start" />
          <Tab icon={<ConfigIcon />} label="Template" iconPosition="start" />
          <Tab icon={<ScheduleIcon />} label="Schedule" iconPosition="start" />
          <Tab icon={<RecipientsIcon />} label="Review" iconPosition="start" />
        </Tabs>

        {/* Basic Information Tab */}
        <TabPanel value={currentTab} index={0}>
          <Stack spacing={3}>
            <TextField
              label="Report Name"
              value={builderState.name}
              onChange={(e) => setBuilderState({ ...builderState, name: e.target.value })}
              error={!!errors.general}
              helperText={errors.general}
              fullWidth
              required
            />

            <TextField
              label="Description"
              value={builderState.description}
              onChange={(e) => setBuilderState({ ...builderState, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />

            <Box display="flex" gap={2} flexWrap="wrap">
              <Box flex={1} minWidth={200}>
                <Typography variant="subtitle2" gutterBottom>
                  Report Type
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {[
                    { value: 'BUSINESS_SUMMARY', label: 'Business Summary' },
                    { value: 'FINANCIAL', label: 'Financial' },
                    { value: 'BOOKING_PERFORMANCE', label: 'Booking Performance' },
                    { value: 'CLIENT_ANALYSIS', label: 'Client Analysis' },
                    { value: 'CUSTOM', label: 'Custom' },
                  ].map((type) => (
                    <Chip
                      key={type.value}
                      label={type.label}
                      clickable
                      color={builderState.report_type === type.value ? 'primary' : 'default'}
                      variant={builderState.report_type === type.value ? 'filled' : 'outlined'}
                      onClick={() => setBuilderState({ 
                        ...builderState, 
                        report_type: type.value as ReportType 
                      })}
                    />
                  ))}
                </Stack>
              </Box>

              <Box flex={1} minWidth={200}>
                <Typography variant="subtitle2" gutterBottom>
                  Output Format
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {[
                    { value: 'PDF', label: 'PDF' },
                    { value: 'EXCEL', label: 'Excel' },
                    { value: 'CSV', label: 'CSV' },
                    { value: 'HTML', label: 'HTML' },
                  ].map((format) => (
                    <Chip
                      key={format.value}
                      label={format.label}
                      clickable
                      color={builderState.output_format === format.value ? 'primary' : 'default'}
                      variant={builderState.output_format === format.value ? 'filled' : 'outlined'}
                      onClick={() => setBuilderState({ 
                        ...builderState, 
                        output_format: format.value as OutputFormat 
                      })}
                    />
                  ))}
                </Stack>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={builderState.is_active}
                  onChange={(e) => setBuilderState({ ...builderState, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Stack>
        </TabPanel>

        {/* Metrics Selection Tab */}
        <TabPanel value={currentTab} index={1}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Available Metrics
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Select the metrics to include in your report. You can configure display options for each metric.
              </Typography>
              
              {errors.metrics && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.metrics}
                </Alert>
              )}

              <Box display="flex" flexWrap="wrap" gap={2} mb={3}>
                {availableMetrics.map((metric) => (
                  <Card
                    key={metric.id}
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      border: builderState.selectedMetrics.find(m => m.id === metric.id)
                        ? 2
                        : 1,
                      borderColor: builderState.selectedMetrics.find(m => m.id === metric.id)
                        ? 'primary.main'
                        : 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                    onClick={() => {
                      if (builderState.selectedMetrics.find(m => m.id === metric.id)) {
                        handleRemoveMetric(metric.id);
                      } else {
                        handleAddMetric(metric);
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {metric.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {metric.description || 'No description'}
                          </Typography>
                        </Box>
                        {builderState.selectedMetrics.find(m => m.id === metric.id) && (
                          <Chip
                            label="Selected"
                            size="small"
                            color="primary"
                            variant="filled"
                          />
                        )}
                      </Box>
                      
                      <Stack direction="row" spacing={1} mt={1}>
                        <Chip
                          label={metric.metric_type}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${metric.source_domain}.${metric.source_model}`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>

            {/* Selected Metrics Configuration */}
            {builderState.selectedMetrics.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Selected Metrics ({builderState.selectedMetrics.length})
                </Typography>
                
                <Stack spacing={2}>
                  {builderState.selectedMetrics.map((metric) => (
                    <Accordion key={metric.id}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" gap={2} width="100%">
                          <DragIcon color="action" />
                          <Typography variant="subtitle2" fontWeight="medium">
                            {metric.name}
                          </Typography>
                          <Chip
                            label={metric.metric_type}
                            size="small"
                            variant="outlined"
                          />
                          <Box flex={1} />
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMetric(metric.id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={2}>
                          <TextField
                            label="Display Name"
                            value={builderState.metricConfigs[metric.id]?.displayName || metric.name}
                            onChange={(e) => {
                              const newConfigs = {
                                ...builderState.metricConfigs,
                                [metric.id]: {
                                  ...builderState.metricConfigs[metric.id],
                                  displayName: e.target.value,
                                },
                              };
                              setBuilderState({ ...builderState, metricConfigs: newConfigs });
                            }}
                            size="small"
                            fullWidth
                          />
                          
                          <FormControlLabel
                            control={
                              <Switch
                                checked={builderState.metricConfigs[metric.id]?.includeInSummary ?? true}
                                onChange={(e) => {
                                  const newConfigs = {
                                    ...builderState.metricConfigs,
                                    [metric.id]: {
                                      ...builderState.metricConfigs[metric.id],
                                      includeInSummary: e.target.checked,
                                    },
                                  };
                                  setBuilderState({ ...builderState, metricConfigs: newConfigs });
                                }}
                              />
                            }
                            label="Include in Summary"
                          />
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </TabPanel>

        {/* Template Configuration Tab */}
        <TabPanel value={currentTab} index={2}>
          <Stack spacing={3}>
            <Typography variant="h6">
              Template Configuration
            </Typography>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Report Sections
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={builderState.templateConfig.includeHeader}
                      onChange={(e) => setBuilderState({
                        ...builderState,
                        templateConfig: {
                          ...builderState.templateConfig,
                          includeHeader: e.target.checked,
                        },
                      })}
                    />
                  }
                  label="Include Header"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={builderState.templateConfig.includeSummary}
                      onChange={(e) => setBuilderState({
                        ...builderState,
                        templateConfig: {
                          ...builderState.templateConfig,
                          includeSummary: e.target.checked,
                        },
                      })}
                    />
                  }
                  label="Include Executive Summary"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={builderState.templateConfig.includeCharts}
                      onChange={(e) => setBuilderState({
                        ...builderState,
                        templateConfig: {
                          ...builderState.templateConfig,
                          includeCharts: e.target.checked,
                        },
                      })}
                    />
                  }
                  label="Include Charts"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={builderState.templateConfig.includeDataTables}
                      onChange={(e) => setBuilderState({
                        ...builderState,
                        templateConfig: {
                          ...builderState.templateConfig,
                          includeDataTables: e.target.checked,
                        },
                      })}
                    />
                  }
                  label="Include Data Tables"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={builderState.templateConfig.includeFooter}
                      onChange={(e) => setBuilderState({
                        ...builderState,
                        templateConfig: {
                          ...builderState.templateConfig,
                          includeFooter: e.target.checked,
                        },
                      })}
                    />
                  }
                  label="Include Footer"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Custom Content
              </Typography>
              <Stack spacing={2}>
                {builderState.templateConfig.includeHeader && (
                  <TextField
                    label="Header Text"
                    value={builderState.templateConfig.headerText || ''}
                    onChange={(e) => setBuilderState({
                      ...builderState,
                      templateConfig: {
                        ...builderState.templateConfig,
                        headerText: e.target.value,
                      },
                    })}
                    multiline
                    rows={2}
                    fullWidth
                  />
                )}
                
                {builderState.templateConfig.includeSummary && (
                  <TextField
                    label="Summary Text"
                    value={builderState.templateConfig.summaryText || ''}
                    onChange={(e) => setBuilderState({
                      ...builderState,
                      templateConfig: {
                        ...builderState.templateConfig,
                        summaryText: e.target.value,
                      },
                    })}
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Optional custom summary text..."
                  />
                )}
                
                {builderState.templateConfig.includeFooter && (
                  <TextField
                    label="Footer Text"
                    value={builderState.templateConfig.footerText || ''}
                    onChange={(e) => setBuilderState({
                      ...builderState,
                      templateConfig: {
                        ...builderState.templateConfig,
                        footerText: e.target.value,
                      },
                    })}
                    multiline
                    rows={2}
                    fullWidth
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        </TabPanel>

        {/* Schedule & Recipients Tab */}
        <TabPanel value={currentTab} index={3}>
          <ReportScheduler
            value={builderState.scheduleConfig}
            onChange={(config) => setBuilderState({ ...builderState, scheduleConfig: config })}
            showRecipients={true}
          />
          {errors.schedule && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errors.schedule}
            </Alert>
          )}
        </TabPanel>

        {/* Review Tab */}
        <TabPanel value={currentTab} index={4}>
          <Stack spacing={3}>
            <Typography variant="h6">
              Review Report Configuration
            </Typography>
            
            <Alert severity="info">
              Review your report configuration below. You can go back to make changes or save the report.
            </Alert>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Basic Information
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Name:</Typography>
                  <Typography variant="body2">{builderState.name}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Type:</Typography>
                  <Typography variant="body2">{builderState.report_type.replace('_', ' ')}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Format:</Typography>
                  <Typography variant="body2">{builderState.output_format}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Metrics:</Typography>
                  <Typography variant="body2">{builderState.selectedMetrics.length} selected</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Schedule:</Typography>
                  <Typography variant="body2">
                    {builderState.scheduleConfig.frequency === 'MANUAL' 
                      ? 'Manual' 
                      : `${builderState.scheduleConfig.frequency.toLowerCase()}${builderState.scheduleConfig.time ? ` at ${builderState.scheduleConfig.time}` : ''}`
                    }
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Recipients:</Typography>
                  <Typography variant="body2">{builderState.scheduleConfig.recipients.length} configured</Typography>
                </Box>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Metrics ({builderState.selectedMetrics.length})
              </Typography>
              <Stack spacing={1}>
                {builderState.selectedMetrics.map((metric) => (
                  <Box key={metric.id} display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2">
                        {builderState.metricConfigs[metric.id]?.displayName || metric.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {metric.metric_type} - {metric.source_domain}.{metric.source_model}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={metric.metric_type}
                        size="small"
                        variant="outlined"
                      />
                      {builderState.metricConfigs[metric.id]?.includeInSummary && (
                        <Chip
                          label="In Summary"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Template Configuration
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {builderState.templateConfig.includeHeader && (
                  <Chip label="Header" size="small" color="primary" variant="outlined" />
                )}
                {builderState.templateConfig.includeSummary && (
                  <Chip label="Summary" size="small" color="primary" variant="outlined" />
                )}
                {builderState.templateConfig.includeCharts && (
                  <Chip label="Charts" size="small" color="primary" variant="outlined" />
                )}
                {builderState.templateConfig.includeDataTables && (
                  <Chip label="Data Tables" size="small" color="primary" variant="outlined" />
                )}
                {builderState.templateConfig.includeFooter && (
                  <Chip label="Footer" size="small" color="primary" variant="outlined" />
                )}
              </Stack>
            </Paper>
          </Stack>
        </TabPanel>
      </Card>

      {/* Preview Dialog */}
      {showPreview && (
        <ReportPreview
          report={{
            id: reportId || 0,
            name: builderState.name,
            description: builderState.description,
            report_type: builderState.report_type,
            template_config: builderState.templateConfig,
            filters: builderState.reportFilters,
            schedule_frequency: builderState.scheduleConfig.frequency,
            schedule_time: builderState.scheduleConfig.time || null,
            schedule_day_of_week: builderState.scheduleConfig.dayOfWeek || null,
            schedule_day_of_month: builderState.scheduleConfig.dayOfMonth || null,
            output_format: builderState.output_format,
            recipients: builderState.scheduleConfig.recipients,
            created_by: 0,
            is_active: builderState.is_active,
            last_generated: null,
            metrics_count: builderState.selectedMetrics.length,
            metrics: builderState.selectedMetrics,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          showExecuteButton={false}
        />
      )}

      {/* Navigation Controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
        <Button
          variant="outlined"
          onClick={() => {
            if (currentTab > 0) {
              setCurrentTab(currentTab - 1);
              setCurrentStep(currentTab - 1);
            }
          }}
          disabled={currentTab === 0}
        >
          Previous
        </Button>

        <Typography variant="body2" color="text.secondary">
          Step {currentTab + 1} of {steps.length}
        </Typography>

        <Button
          variant="contained"
          onClick={() => {
            if (currentTab < steps.length - 1) {
              setCurrentTab(currentTab + 1);
              setCurrentStep(currentTab + 1);
            } else {
              handleSave();
            }
          }}
        >
          {currentTab === steps.length - 1 ? 'Save Report' : 'Next'}
        </Button>
      </Box>
    </Box>
  );
};