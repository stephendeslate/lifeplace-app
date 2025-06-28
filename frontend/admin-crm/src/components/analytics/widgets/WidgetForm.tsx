// frontend/admin-crm/src/components/analytics/widgets/WidgetForm.tsx

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
  FormHelperText,
  Stack,
  Box,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Widgets as WidgetIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Palette as PaletteIcon,
  Settings as SettingsIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useMetricDefinitions } from '../../../hooks/useAnalytics';
import type { 
  Widget, 
  CreateWidgetData, 
  UpdateWidgetData,
  WidgetType,
  WidgetSize,
} from '../../../types/analytics.types';

interface WidgetFormProps {
  open: boolean;
  onClose: () => void;
  editingWidget?: Widget | null;
  dashboardId?: number;
  onSubmit: (data: CreateWidgetData | UpdateWidgetData) => void;
  isLoading: boolean;
}

interface FormData {
  metric_definition: string;
  widget_type: WidgetType;
  title: string;
  size: WidgetSize;
  position_x: string;
  position_y: string;
  order: string;
  time_range: string;
  comparison_enabled: boolean;
  comparison_period: string;
  is_visible: boolean;
  chart_config: {
    color_scheme: string;
    show_legend: boolean;
    show_grid: boolean;
    animation_enabled: boolean;
  };
}

const WIDGET_TYPE_OPTIONS: Array<{ value: WidgetType; label: string; description: string }> = [
  { value: 'METRIC_CARD', label: 'Metric Card', description: 'Single metric value with trend' },
  { value: 'LINE_CHART', label: 'Line Chart', description: 'Time series line chart' },
  { value: 'BAR_CHART', label: 'Bar Chart', description: 'Vertical or horizontal bars' },
  { value: 'PIE_CHART', label: 'Pie Chart', description: 'Pie or donut chart' },
  { value: 'AREA_CHART', label: 'Area Chart', description: 'Filled area chart' },
  { value: 'TABLE', label: 'Data Table', description: 'Tabular data display' },
  { value: 'FUNNEL', label: 'Funnel Chart', description: 'Conversion funnel' },
  { value: 'GAUGE', label: 'Gauge', description: 'Circular gauge display' },
  { value: 'HEATMAP', label: 'Heatmap', description: 'Color-coded matrix' },
  { value: 'PROGRESS_BAR', label: 'Progress Bar', description: 'Linear progress indicator' },
];

const WIDGET_SIZE_OPTIONS: Array<{ value: WidgetSize; label: string; description: string }> = [
  { value: 'SMALL', label: 'Small (1x1)', description: 'Compact single metric' },
  { value: 'MEDIUM', label: 'Medium (2x1)', description: 'Standard chart size' },
  { value: 'LARGE', label: 'Large (2x2)', description: 'Detailed visualization' },
  { value: 'WIDE', label: 'Wide (3x1)', description: 'Wide charts or tables' },
  { value: 'EXTRA_WIDE', label: 'Extra Wide (4x1)', description: 'Full-width content' },
  { value: 'TALL', label: 'Tall (1x2)', description: 'Vertical layout' },
];

const TIME_RANGE_OPTIONS = [
  { value: 'last_24_hours', label: 'Last 24 Hours' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const COMPARISON_PERIOD_OPTIONS = [
  { value: 'previous_period', label: 'Previous Period' },
  { value: 'previous_year', label: 'Previous Year' },
  { value: 'previous_month', label: 'Previous Month' },
  { value: 'previous_week', label: 'Previous Week' },
];

const COLOR_SCHEME_OPTIONS = [
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
  { value: 'purple', label: 'Purple' },
  { value: 'red', label: 'Red' },
  { value: 'multi', label: 'Multi-color' },
  { value: 'gradient', label: 'Gradient' },
];

export const WidgetForm: React.FC<WidgetFormProps> = ({
  open,
  onClose,
  editingWidget,
  dashboardId,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<FormData>({
    metric_definition: '',
    widget_type: 'METRIC_CARD',
    title: '',
    size: 'MEDIUM',
    position_x: '0',
    position_y: '0',
    order: '0',
    time_range: 'last_30_days',
    comparison_enabled: false,
    comparison_period: 'previous_period',
    is_visible: true,
    chart_config: {
      color_scheme: 'blue',
      show_legend: true,
      show_grid: true,
      animation_enabled: true,
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<string[]>(['basic']);

  const { useActiveMetrics } = useMetricDefinitions();
  const { data: metrics = [] } = useActiveMetrics();

  useEffect(() => {
    if (editingWidget) {
      setFormData({
        metric_definition: editingWidget.metric_definition.toString(),
        widget_type: editingWidget.widget_type,
        title: editingWidget.title,
        size: editingWidget.size,
        position_x: editingWidget.position_x.toString(),
        position_y: editingWidget.position_y.toString(),
        order: editingWidget.order.toString(),
        time_range: editingWidget.time_range || 'last_30_days',
        comparison_enabled: editingWidget.comparison_enabled,
        comparison_period: editingWidget.comparison_period || 'previous_period',
        is_visible: editingWidget.is_visible,
        chart_config: {
          color_scheme: editingWidget.chart_config?.color_scheme || 'blue',
          show_legend: editingWidget.chart_config?.show_legend ?? true,
          show_grid: editingWidget.chart_config?.show_grid ?? true,
          animation_enabled: editingWidget.chart_config?.animation_enabled ?? true,
        },
      });
    } else {
      setFormData({
        metric_definition: '',
        widget_type: 'METRIC_CARD',
        title: '',
        size: 'MEDIUM',
        position_x: '0',
        position_y: '0',
        order: '0',
        time_range: 'last_30_days',
        comparison_enabled: false,
        comparison_period: 'previous_period',
        is_visible: true,
        chart_config: {
          color_scheme: 'blue',
          show_legend: true,
          show_grid: true,
          animation_enabled: true,
        },
      });
    }
    setErrors({});
  }, [editingWidget, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.metric_definition) {
      newErrors.metric_definition = 'Metric definition is required';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Widget title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }

    const positionX = parseInt(formData.position_x);
    if (isNaN(positionX) || positionX < 0) {
      newErrors.position_x = 'Position X must be a valid number';
    }

    const positionY = parseInt(formData.position_y);
    if (isNaN(positionY) || positionY < 0) {
      newErrors.position_y = 'Position Y must be a valid number';
    }

    const order = parseInt(formData.order);
    if (isNaN(order) || order < 0) {
      newErrors.order = 'Order must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: CreateWidgetData | UpdateWidgetData = {
      metric_definition: parseInt(formData.metric_definition),
      widget_type: formData.widget_type,
      title: formData.title.trim(),
      size: formData.size,
      position_x: parseInt(formData.position_x),
      position_y: parseInt(formData.position_y),
      order: parseInt(formData.order),
      time_range: formData.time_range,
      comparison_enabled: formData.comparison_enabled,
      comparison_period: formData.comparison_period,
      is_visible: formData.is_visible,
      chart_config: formData.chart_config,
      data_filters: {},
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    setFormData({
      metric_definition: '',
      widget_type: 'METRIC_CARD',
      title: '',
      size: 'MEDIUM',
      position_x: '0',
      position_y: '0',
      order: '0',
      time_range: 'last_30_days',
      comparison_enabled: false,
      comparison_period: 'previous_period',
      is_visible: true,
      chart_config: {
        color_scheme: 'blue',
        show_legend: true,
        show_grid: true,
        animation_enabled: true,
      },
    });
    setErrors({});
    setExpandedSections(['basic']);
    onClose();
  };

  const handleFieldChange = (field: keyof FormData | string, value: any) => {
    if (field.includes('.')) {
      // Handle nested fields like chart_config.color_scheme
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof FormData] as any),
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-generate title based on metric selection
    if (field === 'metric_definition' && value && !formData.title) {
      const selectedMetric = metrics.find(m => m.id.toString() === value);
      if (selectedMetric) {
        setFormData(prev => ({ ...prev, title: selectedMetric.name }));
      }
    }
  };

  const handleAccordionToggle = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const selectedMetric = metrics.find(m => m.id.toString() === formData.metric_definition);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WidgetIcon />
          {editingWidget ? 'Edit Widget' : 'Add Widget'}
          {dashboardId && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              to Dashboard
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={1}>
          {/* Basic Configuration */}
          <Accordion 
            expanded={expandedSections.includes('basic')}
            onChange={() => handleAccordionToggle('basic')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <SettingsIcon fontSize="small" />
                <Typography variant="h6">Basic Configuration</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <FormControl fullWidth error={!!errors.metric_definition}>
                  <InputLabel>Metric Definition</InputLabel>
                  <Select
                    value={formData.metric_definition}
                    label="Metric Definition"
                    onChange={(e) => handleFieldChange('metric_definition', e.target.value)}
                  >
                    {metrics.map((metric) => (
                      <MenuItem key={metric.id} value={metric.id.toString()}>
                        <Box>
                          <Typography variant="body1">{metric.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {metric.metric_type} • {metric.source_domain}.{metric.source_model}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>{errors.metric_definition}</FormHelperText>
                </FormControl>

                {selectedMetric && (
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Selected Metric:</strong> {selectedMetric.description || 'No description available'}
                    </Typography>
                  </Alert>
                )}

                <TextField
                  label="Widget Title"
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  error={!!errors.title}
                  helperText={errors.title}
                  required
                  fullWidth
                  placeholder="Enter widget title"
                />

                <FormControl fullWidth>
                  <InputLabel>Widget Type</InputLabel>
                  <Select
                    value={formData.widget_type}
                    label="Widget Type"
                    onChange={(e) => handleFieldChange('widget_type', e.target.value)}
                  >
                    {WIDGET_TYPE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box>
                          <Typography variant="body1">{option.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Widget Size</InputLabel>
                  <Select
                    value={formData.size}
                    label="Widget Size"
                    onChange={(e) => handleFieldChange('size', e.target.value)}
                  >
                    {WIDGET_SIZE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box>
                          <Typography variant="body1">{option.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Layout & Position */}
          <Accordion 
            expanded={expandedSections.includes('layout')}
            onChange={() => handleAccordionToggle('layout')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Layout & Position</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box display="flex" gap={2}>
                  <TextField
                    label="Position X"
                    type="number"
                    value={formData.position_x}
                    onChange={(e) => handleFieldChange('position_x', e.target.value)}
                    error={!!errors.position_x}
                    helperText={errors.position_x}
                    inputProps={{ min: 0 }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Position Y"
                    type="number"
                    value={formData.position_y}
                    onChange={(e) => handleFieldChange('position_y', e.target.value)}
                    error={!!errors.position_y}
                    helperText={errors.position_y}
                    inputProps={{ min: 0 }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Display Order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => handleFieldChange('order', e.target.value)}
                    error={!!errors.order}
                    helperText={errors.order}
                    inputProps={{ min: 0 }}
                    sx={{ flex: 1 }}
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_visible}
                      onChange={(e) => handleFieldChange('is_visible', e.target.checked)}
                    />
                  }
                  label="Visible"
                />
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Time Range & Comparison */}
          <Accordion 
            expanded={expandedSections.includes('time')}
            onChange={() => handleAccordionToggle('time')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <TimeIcon fontSize="small" />
                <Typography variant="h6">Time Range & Comparison</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Time Range</InputLabel>
                  <Select
                    value={formData.time_range}
                    label="Time Range"
                    onChange={(e) => handleFieldChange('time_range', e.target.value)}
                  >
                    {TIME_RANGE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.comparison_enabled}
                      onChange={(e) => handleFieldChange('comparison_enabled', e.target.checked)}
                    />
                  }
                  label="Enable Comparison"
                />

                {formData.comparison_enabled && (
                  <FormControl fullWidth>
                    <InputLabel>Comparison Period</InputLabel>
                    <Select
                      value={formData.comparison_period}
                      label="Comparison Period"
                      onChange={(e) => handleFieldChange('comparison_period', e.target.value)}
                    >
                      {COMPARISON_PERIOD_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>

          {/* Chart Styling */}
          <Accordion 
            expanded={expandedSections.includes('styling')}
            onChange={() => handleAccordionToggle('styling')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <PaletteIcon fontSize="small" />
                <Typography variant="h6">Chart Styling</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Color Scheme</InputLabel>
                  <Select
                    value={formData.chart_config.color_scheme}
                    label="Color Scheme"
                    onChange={(e) => handleFieldChange('chart_config.color_scheme', e.target.value)}
                  >
                    {COLOR_SCHEME_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.chart_config.show_legend}
                        onChange={(e) => handleFieldChange('chart_config.show_legend', e.target.checked)}
                      />
                    }
                    label="Show Legend"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.chart_config.show_grid}
                        onChange={(e) => handleFieldChange('chart_config.show_grid', e.target.checked)}
                      />
                    }
                    label="Show Grid Lines"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.chart_config.animation_enabled}
                        onChange={(e) => handleFieldChange('chart_config.animation_enabled', e.target.checked)}
                      />
                    }
                    label="Enable Animations"
                  />
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          startIcon={<CloseIcon />}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isLoading}
          startIcon={<SaveIcon />}
        >
          {editingWidget ? 'Update Widget' : 'Add Widget'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};