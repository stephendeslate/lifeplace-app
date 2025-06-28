// frontend/admin-crm/src/components/analytics/reports/ReportForm.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useMetricDefinitions } from '../../../hooks/useAnalytics';
import type {
  AnalyticsReport,
  CreateAnalyticsReportData,
  UpdateAnalyticsReportData,
  ReportType,
  ScheduleFrequency,
  OutputFormat,
} from '../../../types/analytics.types';

interface ReportFormData {
  name: string;
  description: string;
  report_type: ReportType;
  metrics: number[];
  schedule_frequency: ScheduleFrequency;
  schedule_time: string;
  schedule_day_of_week: string;
  schedule_day_of_month: string;
  output_format: OutputFormat;
  recipients: string[];
  is_active: boolean;
}

interface ReportFormProps {
  open: boolean;
  onClose: () => void;
  editingReport?: AnalyticsReport | null;
  onSubmit: (data: CreateAnalyticsReportData | UpdateAnalyticsReportData) => void;
  isLoading: boolean;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  open,
  onClose,
  editingReport,
  onSubmit,
  isLoading,
}) => {
  const { useActiveMetrics } = useMetricDefinitions();
  const { data: availableMetrics = [] } = useActiveMetrics();

  const [formData, setFormData] = useState<ReportFormData>({
    name: '',
    description: '',
    report_type: 'BUSINESS_SUMMARY',
    metrics: [],
    schedule_frequency: 'MANUAL',
    schedule_time: '',
    schedule_day_of_week: '',
    schedule_day_of_month: '',
    output_format: 'PDF',
    recipients: [],
    is_active: true,
  });

  const [newRecipient, setNewRecipient] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingReport && open) {
      setFormData({
        name: editingReport.name,
        description: editingReport.description || '',
        report_type: editingReport.report_type,
        metrics: editingReport.metrics?.map(m => m.id) || [],
        schedule_frequency: editingReport.schedule_frequency,
        schedule_time: editingReport.schedule_time || '',
        schedule_day_of_week: editingReport.schedule_day_of_week?.toString() || '',
        schedule_day_of_month: editingReport.schedule_day_of_month?.toString() || '',
        output_format: editingReport.output_format,
        recipients: editingReport.recipients || [],
        is_active: editingReport.is_active,
      });
    } else if (!editingReport && open) {
      setFormData({
        name: '',
        description: '',
        report_type: 'BUSINESS_SUMMARY',
        metrics: [],
        schedule_frequency: 'MANUAL',
        schedule_time: '',
        schedule_day_of_week: '',
        schedule_day_of_month: '',
        output_format: 'PDF',
        recipients: [],
        is_active: true,
      });
    }
    setErrors({});
  }, [editingReport, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Report name is required';
    }

    if (formData.metrics.length === 0) {
      newErrors.metrics = 'At least one metric must be selected';
    }

    if (formData.schedule_frequency === 'WEEKLY' && !formData.schedule_day_of_week) {
      newErrors.schedule_day_of_week = 'Day of week is required for weekly reports';
    }

    if (formData.schedule_frequency === 'MONTHLY' && !formData.schedule_day_of_month) {
      newErrors.schedule_day_of_month = 'Day of month is required for monthly reports';
    }

    if ((formData.schedule_frequency === 'DAILY' || 
         formData.schedule_frequency === 'WEEKLY' || 
         formData.schedule_frequency === 'MONTHLY') && !formData.schedule_time) {
      newErrors.schedule_time = 'Schedule time is required for automated reports';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const submitData: CreateAnalyticsReportData | UpdateAnalyticsReportData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      report_type: formData.report_type,
      metrics: formData.metrics,
      schedule_frequency: formData.schedule_frequency,
      schedule_time: formData.schedule_time || undefined,
      schedule_day_of_week: formData.schedule_day_of_week ? parseInt(formData.schedule_day_of_week) : undefined,
      schedule_day_of_month: formData.schedule_day_of_month ? parseInt(formData.schedule_day_of_month) : undefined,
      output_format: formData.output_format,
      recipients: formData.recipients,
      is_active: formData.is_active,
    };

    onSubmit(submitData);
  };

  const handleAddRecipient = () => {
    if (newRecipient.trim() && !formData.recipients.includes(newRecipient.trim())) {
      setFormData({
        ...formData,
        recipients: [...formData.recipients, newRecipient.trim()],
      });
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setFormData({
      ...formData,
      recipients: formData.recipients.filter(r => r !== email),
    });
  };

  const isEmailValid = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const reportTypes: Array<{ value: ReportType; label: string }> = [
    { value: 'BUSINESS_SUMMARY', label: 'Business Summary' },
    { value: 'FINANCIAL', label: 'Financial Report' },
    { value: 'BOOKING_PERFORMANCE', label: 'Booking Performance' },
    { value: 'CLIENT_ANALYSIS', label: 'Client Analysis' },
    { value: 'WORKFLOW_EFFICIENCY', label: 'Workflow Efficiency' },
    { value: 'PAYMENT_ANALYSIS', label: 'Payment Analysis' },
    { value: 'CUSTOM', label: 'Custom Report' },
  ];

  const scheduleFrequencies: Array<{ value: ScheduleFrequency; label: string }> = [
    { value: 'MANUAL', label: 'Manual Only' },
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
  ];

  const outputFormats: Array<{ value: OutputFormat; label: string }> = [
    { value: 'PDF', label: 'PDF' },
    { value: 'EXCEL', label: 'Excel' },
    { value: 'CSV', label: 'CSV' },
    { value: 'HTML', label: 'HTML' },
    { value: 'JSON', label: 'JSON' },
  ];

  const weekDays = [
    { value: '0', label: 'Monday' },
    { value: '1', label: 'Tuesday' },
    { value: '2', label: 'Wednesday' },
    { value: '3', label: 'Thursday' },
    { value: '4', label: 'Friday' },
    { value: '5', label: 'Saturday' },
    { value: '6', label: 'Sunday' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {editingReport ? 'Edit Report' : 'Create New Report'}
          </Typography>
          <Button
            variant="text"
            color="inherit"
            onClick={onClose}
            startIcon={<CloseIcon />}
            size="small"
          >
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            
            <Stack spacing={2}>
              <TextField
                label="Report Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                required
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={formData.report_type}
                  label="Report Type"
                  onChange={(e) => setFormData({ ...formData, report_type: e.target.value as ReportType })}
                >
                  {reportTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>

          <Divider />

          {/* Metrics Selection */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Metrics
            </Typography>
            
            <Autocomplete
              multiple
              value={availableMetrics.filter(m => formData.metrics.includes(m.id))}
              onChange={(_, selectedMetrics) => {
                setFormData({ ...formData, metrics: selectedMetrics.map(m => m.id) });
              }}
              options={availableMetrics}
              getOptionLabel={(metric) => metric.name}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Metrics"
                  error={!!errors.metrics}
                  helperText={errors.metrics || 'Choose the metrics to include in this report'}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((metric, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={metric.id}
                    label={metric.name}
                    size="small"
                  />
                ))
              }
            />
          </Box>

          <Divider />

          {/* Schedule Configuration */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Schedule
            </Typography>
            
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={formData.schedule_frequency}
                  label="Frequency"
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    schedule_frequency: e.target.value as ScheduleFrequency,
                    schedule_time: '',
                    schedule_day_of_week: '',
                    schedule_day_of_month: '',
                  })}
                >
                  {scheduleFrequencies.map((freq) => (
                    <MenuItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {formData.schedule_frequency !== 'MANUAL' && (
                <TextField
                  label="Time"
                  type="time"
                  value={formData.schedule_time}
                  onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                  error={!!errors.schedule_time}
                  helperText={errors.schedule_time}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }} // 5 min intervals
                  fullWidth
                />
              )}

              {formData.schedule_frequency === 'WEEKLY' && (
                <FormControl fullWidth>
                  <InputLabel>Day of Week</InputLabel>
                  <Select
                    value={formData.schedule_day_of_week}
                    label="Day of Week"
                    onChange={(e) => setFormData({ ...formData, schedule_day_of_week: e.target.value })}
                    error={!!errors.schedule_day_of_week}
                  >
                    {weekDays.map((day) => (
                      <MenuItem key={day.value} value={day.value}>
                        {day.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.schedule_day_of_week && (
                    <FormHelperText error>{errors.schedule_day_of_week}</FormHelperText>
                  )}
                </FormControl>
              )}

              {formData.schedule_frequency === 'MONTHLY' && (
                <TextField
                  label="Day of Month"
                  type="number"
                  value={formData.schedule_day_of_month}
                  onChange={(e) => setFormData({ ...formData, schedule_day_of_month: e.target.value })}
                  error={!!errors.schedule_day_of_month}
                  helperText={errors.schedule_day_of_month || 'Day of the month (1-28)'}
                  inputProps={{ min: 1, max: 28 }}
                  fullWidth
                />
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Output and Recipients */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Output & Recipients
            </Typography>
            
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Output Format</InputLabel>
                <Select
                  value={formData.output_format}
                  label="Output Format"
                  onChange={(e) => setFormData({ ...formData, output_format: e.target.value as OutputFormat })}
                >
                  {outputFormats.map((format) => (
                    <MenuItem key={format.value} value={format.value}>
                      {format.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Recipients
                </Typography>
                
                <Box display="flex" gap={1} mb={1}>
                  <TextField
                    placeholder="Enter email address"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRecipient();
                      }
                    }}
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddRecipient}
                    disabled={!newRecipient.trim() || !isEmailValid(newRecipient.trim())}
                    startIcon={<AddIcon />}
                  >
                    Add
                  </Button>
                </Box>

                <Box display="flex" flexWrap="wrap" gap={1}>
                  {formData.recipients.map((email) => (
                    <Chip
                      key={email}
                      label={email}
                      onDelete={() => handleRemoveRecipient(email)}
                      deleteIcon={<DeleteIcon />}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Settings */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : editingReport ? 'Update Report' : 'Create Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};