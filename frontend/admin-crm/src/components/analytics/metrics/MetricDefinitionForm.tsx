// frontend/admin-crm/src/components/analytics/metrics/MetricDefinitionForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider,
  Stack,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import type { 
  MetricDefinition, 
  CreateMetricDefinitionData, 
  UpdateMetricDefinitionData,
  MetricType,
  AggregationPeriod,
} from '../../../types/analytics.types';
import { 
  METRIC_TYPES, 
  AGGREGATION_PERIODS 
} from '../../../types/analytics.types';

interface FormData {
  name: string;
  description: string;
  metric_type: MetricType;
  source_domain: string;
  source_model: string;
  source_field: string;
  calculation_rules: string;
  filters: string;
  aggregation_period: AggregationPeriod;
  is_real_time: boolean;
  display_format: string;
  decimal_places: string;
  is_active: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  metric_type?: string;
  source_domain?: string;
  source_model?: string;
  source_field?: string;
  calculation_rules?: string;
  filters?: string;
  aggregation_period?: string;
  display_format?: string;
  decimal_places?: string;
  general?: string;
}

const getDefaultFormData = (editingMetric?: MetricDefinition | null): FormData => {
  if (editingMetric) {
    return {
      name: editingMetric.name,
      description: editingMetric.description || '',
      metric_type: editingMetric.metric_type,
      source_domain: editingMetric.source_domain,
      source_model: editingMetric.source_model,
      source_field: editingMetric.source_field || '',
      calculation_rules: JSON.stringify(editingMetric.calculation_rules || {}, null, 2),
      filters: JSON.stringify(editingMetric.filters || {}, null, 2),
      aggregation_period: editingMetric.aggregation_period,
      is_real_time: editingMetric.is_real_time,
      display_format: editingMetric.display_format,
      decimal_places: editingMetric.decimal_places.toString(),
      is_active: editingMetric.is_active,
    };
  }
  
  return {
    name: '',
    description: '',
    metric_type: 'COUNT' as MetricType,
    source_domain: '',
    source_model: '',
    source_field: '',
    calculation_rules: '{}',
    filters: '{}',
    aggregation_period: 'DAILY' as AggregationPeriod,
    is_real_time: false,
    display_format: 'number',
    decimal_places: '0',
    is_active: true,
  };
};

interface MetricDefinitionFormProps {
  open: boolean;
  onClose: () => void;
  editingMetric?: MetricDefinition | null;
  onSubmit: (data: CreateMetricDefinitionData | UpdateMetricDefinitionData) => void;
  isLoading: boolean;
}

export const MetricDefinitionForm: React.FC<MetricDefinitionFormProps> = ({
  open,
  onClose,
  editingMetric,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<FormData>(getDefaultFormData(editingMetric));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setFormData(getDefaultFormData(editingMetric));
      setErrors({});
    }
  }, [open, editingMetric]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Description validation
    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Metric type validation
    if (!formData.metric_type) {
      newErrors.metric_type = 'Metric type is required';
    }

    // Source domain validation
    if (!formData.source_domain.trim()) {
      newErrors.source_domain = 'Source domain is required';
    }

    // Source model validation
    if (!formData.source_model.trim()) {
      newErrors.source_model = 'Source model is required';
    }

    // Source field validation for certain metric types
    if ((formData.metric_type === 'SUM' || formData.metric_type === 'AVERAGE') && !formData.source_field.trim()) {
      newErrors.source_field = 'Source field is required for SUM and AVERAGE metric types';
    }

    // Aggregation period validation
    if (!formData.aggregation_period) {
      newErrors.aggregation_period = 'Aggregation period is required';
    }

    // Display format validation
    if (!formData.display_format) {
      newErrors.display_format = 'Display format is required';
    }

    // Decimal places validation
    if (!formData.decimal_places.trim()) {
      newErrors.decimal_places = 'Decimal places is required';
    } else if (!/^\d+$/.test(formData.decimal_places)) {
      newErrors.decimal_places = 'Must be a valid number';
    } else {
      const num = parseInt(formData.decimal_places);
      if (num < 0 || num > 10) {
        newErrors.decimal_places = 'Must be between 0 and 10';
      }
    }

    // JSON validation for calculation rules
    if (formData.calculation_rules.trim() !== '{}') {
      try {
        JSON.parse(formData.calculation_rules);
      } catch {
        newErrors.calculation_rules = 'Invalid JSON format';
      }
    }

    // JSON validation for filters
    if (formData.filters.trim() !== '{}') {
      try {
        JSON.parse(formData.filters);
      } catch {
        newErrors.filters = 'Invalid JSON format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Only allow keys that are present in both FormData and FormErrors
  type FormFieldWithError = keyof FormErrors & keyof FormData;

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field if it exists in FormErrors
    if (errors[field as FormFieldWithError]) {
      setErrors(prev => ({ ...prev, [field as FormFieldWithError]: undefined }));
    }
  };

  const handleSwitchChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.checked }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    let calculationRules = {};
    let filters = {};

    // Parse JSON fields
    try {
      if (formData.calculation_rules.trim() && formData.calculation_rules !== '{}') {
        calculationRules = JSON.parse(formData.calculation_rules);
      }
    } catch {
      setErrors(prev => ({ ...prev, calculation_rules: 'Invalid JSON format' }));
      return;
    }

    try {
      if (formData.filters.trim() && formData.filters !== '{}') {
        filters = JSON.parse(formData.filters);
      }
    } catch {
      setErrors(prev => ({ ...prev, filters: 'Invalid JSON format' }));
      return;
    }

    const submitData: CreateMetricDefinitionData | UpdateMetricDefinitionData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      metric_type: formData.metric_type,
      source_domain: formData.source_domain.trim(),
      source_model: formData.source_model.trim(),
      source_field: formData.source_field.trim() || undefined,
      calculation_rules: Object.keys(calculationRules).length > 0 ? calculationRules : undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      aggregation_period: formData.aggregation_period,
      is_real_time: formData.is_real_time,
      display_format: formData.display_format,
      decimal_places: parseInt(formData.decimal_places),
      ...(editingMetric ? { is_active: formData.is_active } : {}),
    };

    onSubmit(submitData);
  };

  const getMetricTypeDescription = (type: MetricType) => {
    switch (type) {
      case 'COUNT':
        return 'Count the number of records that match the criteria';
      case 'SUM':
        return 'Sum the values of a numeric field';
      case 'AVERAGE':
        return 'Calculate the average value of a numeric field';
      case 'PERCENTAGE':
        return 'Calculate a percentage based on two values';
      case 'RATIO':
        return 'Calculate a ratio between two metrics';
      case 'CONVERSION_RATE':
        return 'Calculate conversion rate between events';
      case 'REVENUE':
        return 'Calculate revenue-based metrics with currency formatting';
      case 'CUSTOM':
        return 'Custom calculation using advanced rules';
      default:
        return '';
    }
  };

  const sourceDomainOptions = [
    'bookings',
    'events',
    'payments',
    'clients',
    'workflows',
    'products',
    'communications',
    'analytics',
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          {editingMetric ? 'Edit Metric Definition' : 'Create Metric Definition'}
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3}>
            {errors.general && (
              <Alert severity="error">{errors.general}</Alert>
            )}

            {/* Basic Information */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              
              <Stack spacing={2}>
                <TextField
                  label="Metric Name"
                  placeholder="e.g., Total Event Bookings"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  fullWidth
                  required
                />

                <TextField
                  label="Description"
                  placeholder="Describe what this metric measures"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  multiline
                  rows={2}
                  error={!!errors.description}
                  helperText={errors.description}
                  fullWidth
                />
              </Stack>
            </Box>

            <Divider />

            {/* Metric Configuration */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Metric Configuration
              </Typography>
              
              <Stack spacing={2}>
                <FormControl fullWidth required error={!!errors.metric_type}>
                  <InputLabel>Metric Type</InputLabel>
                  <Select
                    value={formData.metric_type}
                    label="Metric Type"
                    onChange={handleInputChange('metric_type')}
                  >
                    {METRIC_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box>
                          <Typography variant="body2">{type.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getMetricTypeDescription(type.value)}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.metric_type && <FormHelperText>{errors.metric_type}</FormHelperText>}
                </FormControl>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl fullWidth required error={!!errors.source_domain}>
                    <InputLabel>Source Domain</InputLabel>
                    <Select
                      value={formData.source_domain}
                      label="Source Domain"
                      onChange={handleInputChange('source_domain')}
                    >
                      {sourceDomainOptions.map((domain) => (
                        <MenuItem key={domain} value={domain}>
                          {domain}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.source_domain && <FormHelperText>{errors.source_domain}</FormHelperText>}
                  </FormControl>

                  <TextField
                    label="Source Model"
                    placeholder="e.g., Event, Payment, Client"
                    value={formData.source_model}
                    onChange={handleInputChange('source_model')}
                    error={!!errors.source_model}
                    helperText={errors.source_model}
                    fullWidth
                    required
                  />
                </Stack>

                {(formData.metric_type === 'SUM' || formData.metric_type === 'AVERAGE') && (
                  <TextField
                    label="Source Field"
                    placeholder="e.g., total_amount, duration_minutes"
                    value={formData.source_field}
                    onChange={handleInputChange('source_field')}
                    error={!!errors.source_field}
                    helperText={errors.source_field || 'Required for SUM and AVERAGE metric types'}
                    fullWidth
                    required
                  />
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Aggregation & Timing */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Aggregation & Timing
              </Typography>
              
              <Stack spacing={2}>
                <FormControl fullWidth required error={!!errors.aggregation_period}>
                  <InputLabel>Aggregation Period</InputLabel>
                  <Select
                    value={formData.aggregation_period}
                    label="Aggregation Period"
                    onChange={handleInputChange('aggregation_period')}
                    disabled={formData.is_real_time}
                  >
                    {AGGREGATION_PERIODS.map((period) => (
                      <MenuItem key={period.value} value={period.value}>
                        {period.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.aggregation_period && <FormHelperText>{errors.aggregation_period}</FormHelperText>}
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_real_time}
                      onChange={handleSwitchChange('is_real_time')}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Real-time Calculation</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Calculate metric value on-demand instead of using pre-aggregated data
                      </Typography>
                    </Box>
                  }
                />

                {formData.is_real_time && (
                  <Alert severity="info" icon={<InfoIcon />}>
                    Real-time metrics are calculated dynamically and may have higher latency. 
                    Use for metrics that require up-to-the-minute accuracy.
                  </Alert>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Display Configuration */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Display Configuration
              </Typography>
              
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormControl fullWidth required error={!!errors.display_format}>
                    <InputLabel>Display Format</InputLabel>
                    <Select
                      value={formData.display_format}
                      label="Display Format"
                      onChange={handleInputChange('display_format')}
                    >
                      <MenuItem value="number">Number (1,234)</MenuItem>
                      <MenuItem value="currency">Currency ($1,234.56)</MenuItem>
                      <MenuItem value="percentage">Percentage (12.34%)</MenuItem>
                      <MenuItem value="duration">Duration (1h 23m)</MenuItem>
                      <MenuItem value="bytes">File Size (1.2 MB)</MenuItem>
                    </Select>
                    {errors.display_format && <FormHelperText>{errors.display_format}</FormHelperText>}
                  </FormControl>

                  <TextField
                    label="Decimal Places"
                    type="number"
                    value={formData.decimal_places}
                    onChange={handleInputChange('decimal_places')}
                    inputProps={{ min: 0, max: 10 }}
                    error={!!errors.decimal_places}
                    helperText={errors.decimal_places}
                    fullWidth
                    required
                  />
                </Stack>

                {editingMetric && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={handleSwitchChange('is_active')}
                      />
                    }
                    label="Active Metric"
                  />
                )}
              </Stack>
            </Box>

            {/* Advanced Configuration */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CodeIcon />
                  <Typography variant="subtitle1">Advanced Configuration</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Calculation Rules (JSON)
                    </Typography>
                    <TextField
                      multiline
                      rows={6}
                      value={formData.calculation_rules}
                      onChange={handleInputChange('calculation_rules')}
                      placeholder='{"custom_formula": "field1 * field2", "conditions": []}'
                      fullWidth
                      variant="outlined"
                      error={!!errors.calculation_rules}
                      helperText={errors.calculation_rules || "Define custom calculation logic for complex metrics"}
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Data Filters (JSON)
                    </Typography>
                    <TextField
                      multiline
                      rows={6}
                      value={formData.filters}
                      onChange={handleInputChange('filters')}
                      placeholder='{"status": "confirmed", "date_range": "last_30_days"}'
                      fullWidth
                      variant="outlined"
                      error={!!errors.filters}
                      helperText={errors.filters || "Define filters to apply when calculating this metric"}
                    />
                  </Box>

                  <Alert severity="info">
                    Use JSON format for advanced configuration. Leave empty for default behavior.
                  </Alert>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isLoading}
          >
            {editingMetric ? 'Update Metric' : 'Create Metric'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};