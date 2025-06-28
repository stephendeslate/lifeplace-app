// frontend/admin-crm/src/pages/analytics/dashboards/WidgetEditor.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Alert,
  IconButton,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Timeline as DataIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useWidgets, useDashboards, useMetricDefinitions } from '../../../hooks/useAnalytics';
import { WidgetRenderer } from '../../../components/analytics/dashboards/WidgetRenderer';
import type { Widget, UpdateWidgetData } from '../../../types/analytics.types';

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

export const WidgetEditor: React.FC = () => {
  const { dashboardId, widgetId } = useParams<{ dashboardId: string; widgetId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [currentTab, setCurrentTab] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { useWidget, updateWidget } = useWidgets();
  const { useDashboard } = useDashboards();
  const { useActiveMetrics } = useMetricDefinitions();

  const widgetIdNum = parseInt(widgetId || '0', 10);
  const dashboardIdNum = parseInt(dashboardId || '0', 10);

  const {
    data: widget,
    isLoading: isLoadingWidget,
    error: widgetError,
  } = useWidget(widgetIdNum);

  const {
    data: dashboard,
    isLoading: isLoadingDashboard,
  } = useDashboard(dashboardIdNum);

  const { data: metrics = [] } = useActiveMetrics();

  const [formData, setFormData] = useState<Partial<UpdateWidgetData>>({});

  useEffect(() => {
    if (widget && dashboard) {
      setBreadcrumbs([
        { label: 'Analytics', path: '/analytics' },
        { label: 'Dashboards', path: '/analytics/dashboards' },
        { label: dashboard.name, path: `/analytics/dashboards/${dashboard.id}` },
        { label: `Edit Widget: ${widget.title}` },
      ]);

      // Initialize form data
      setFormData({
        title: widget.title,
        widget_type: widget.widget_type,
        size: widget.size,
        position_x: widget.position_x,
        position_y: widget.position_y,
        order: widget.order,
        time_range: widget.time_range,
        comparison_enabled: widget.comparison_enabled,
        comparison_period: widget.comparison_period,
        is_visible: widget.is_visible,
        chart_config: widget.chart_config,
      });
    }
  }, [setBreadcrumbs, widget, dashboard]);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate(`/analytics/dashboards/${dashboardId}`);
      }
    } else {
      navigate(`/analytics/dashboards/${dashboardId}`);
    }
  };

  const handleSave = () => {
    if (widget && formData) {
      updateWidget({ id: widget.id, data: formData });
      setHasUnsavedChanges(false);
    }
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        newData[parent as keyof UpdateWidgetData] = {
          ...(newData[parent as keyof UpdateWidgetData] as any),
          [child]: value,
        };
      } else {
        (newData as any)[field] = value;
      }
      return newData;
    });
    setHasUnsavedChanges(true);
  };

  const selectedMetric = metrics.find(m => m.id === widget?.metric_definition);

  if (isLoadingWidget || isLoadingDashboard) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Loading widget editor...</Typography>
      </Box>
    );
  }

  if (widgetError || !widget) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Widget not found or failed to load</Alert>
        <Button startIcon={<BackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const mergedWidget = { ...widget, ...formData };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Settings Panel */}
      <Paper
        sx={{
          width: 400,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <IconButton onClick={handleBack} size="small">
              <BackIcon />
            </IconButton>
            <Typography variant="h6">
              Edit Widget
            </Typography>
            {hasUnsavedChanges && (
              <Chip label="Unsaved" color="warning" size="small" />
            )}
          </Box>

          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab icon={<SettingsIcon />} label="Settings" />
            <Tab icon={<PaletteIcon />} label="Style" />
            <Tab icon={<DataIcon />} label="Data" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* General Settings Tab */}
          <TabPanel value={currentTab} index={0}>
            <Stack spacing={3}>
              <TextField
                label="Widget Title"
                value={formData.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Widget Type</InputLabel>
                <Select
                  value={formData.widget_type || widget.widget_type}
                  label="Widget Type"
                  onChange={(e) => handleFieldChange('widget_type', e.target.value)}
                >
                  <MenuItem value="METRIC_CARD">Metric Card</MenuItem>
                  <MenuItem value="LINE_CHART">Line Chart</MenuItem>
                  <MenuItem value="BAR_CHART">Bar Chart</MenuItem>
                  <MenuItem value="PIE_CHART">Pie Chart</MenuItem>
                  <MenuItem value="GAUGE">Gauge</MenuItem>
                  <MenuItem value="TABLE">Table</MenuItem>
                  <MenuItem value="FUNNEL">Funnel</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Widget Size</InputLabel>
                <Select
                  value={formData.size || widget.size}
                  label="Widget Size"
                  onChange={(e) => handleFieldChange('size', e.target.value)}
                >
                  <MenuItem value="SMALL">Small (1x1)</MenuItem>
                  <MenuItem value="MEDIUM">Medium (2x1)</MenuItem>
                  <MenuItem value="LARGE">Large (2x2)</MenuItem>
                  <MenuItem value="WIDE">Wide (3x1)</MenuItem>
                  <MenuItem value="EXTRA_WIDE">Extra Wide (4x1)</MenuItem>
                  <MenuItem value="TALL">Tall (1x2)</MenuItem>
                </Select>
              </FormControl>

              <Box display="flex" gap={2}>
                <TextField
                  label="Position X"
                  type="number"
                  value={formData.position_x ?? widget.position_x}
                  onChange={(e) => handleFieldChange('position_x', parseInt(e.target.value))}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Position Y"
                  type="number"
                  value={formData.position_y ?? widget.position_y}
                  onChange={(e) => handleFieldChange('position_y', parseInt(e.target.value))}
                  sx={{ flex: 1 }}
                />
              </Box>

              <TextField
                label="Display Order"
                type="number"
                value={formData.order ?? widget.order}
                onChange={(e) => handleFieldChange('order', parseInt(e.target.value))}
                fullWidth
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_visible ?? widget.is_visible}
                    onChange={(e) => handleFieldChange('is_visible', e.target.checked)}
                  />
                }
                label="Visible"
              />
            </Stack>
          </TabPanel>

          {/* Style Settings Tab */}
          <TabPanel value={currentTab} index={1}>
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>Color Scheme</InputLabel>
                <Select
                  value={formData.chart_config?.color_scheme || widget.chart_config?.color_scheme || 'blue'}
                  label="Color Scheme"
                  onChange={(e) => handleFieldChange('chart_config.color_scheme', e.target.value)}
                >
                  <MenuItem value="blue">Blue</MenuItem>
                  <MenuItem value="green">Green</MenuItem>
                  <MenuItem value="orange">Orange</MenuItem>
                  <MenuItem value="purple">Purple</MenuItem>
                  <MenuItem value="red">Red</MenuItem>
                  <MenuItem value="multi">Multi-color</MenuItem>
                  <MenuItem value="gradient">Gradient</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.chart_config?.show_legend ?? widget.chart_config?.show_legend ?? true}
                    onChange={(e) => handleFieldChange('chart_config.show_legend', e.target.checked)}
                  />
                }
                label="Show Legend"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.chart_config?.show_grid ?? widget.chart_config?.show_grid ?? true}
                    onChange={(e) => handleFieldChange('chart_config.show_grid', e.target.checked)}
                  />
                }
                label="Show Grid Lines"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.chart_config?.animation_enabled ?? widget.chart_config?.animation_enabled ?? true}
                    onChange={(e) => handleFieldChange('chart_config.animation_enabled', e.target.checked)}
                  />
                }
                label="Enable Animations"
              />

              <Divider />

              <Typography variant="subtitle2">
                Style Preview
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Changes will be reflected in the preview panel
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </TabPanel>

          {/* Data Settings Tab */}
          <TabPanel value={currentTab} index={2}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Metric Information
                </Typography>
                {selectedMetric ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedMetric.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {selectedMetric.description || 'No description available'}
                      </Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <Chip label={selectedMetric.metric_type} size="small" color="primary" />
                        <Chip 
                          label={`${selectedMetric.source_domain}.${selectedMetric.source_model}`} 
                          size="small" 
                          variant="outlined" 
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                ) : (
                  <Alert severity="warning">
                    Metric definition not found
                  </Alert>
                )}
              </Box>

              <FormControl fullWidth>
                <InputLabel>Time Range</InputLabel>
                <Select
                  value={formData.time_range || widget.time_range || 'last_30_days'}
                  label="Time Range"
                  onChange={(e) => handleFieldChange('time_range', e.target.value)}
                >
                  <MenuItem value="last_24_hours">Last 24 Hours</MenuItem>
                  <MenuItem value="last_7_days">Last 7 Days</MenuItem>
                  <MenuItem value="last_30_days">Last 30 Days</MenuItem>
                  <MenuItem value="last_90_days">Last 90 Days</MenuItem>
                  <MenuItem value="this_month">This Month</MenuItem>
                  <MenuItem value="this_quarter">This Quarter</MenuItem>
                  <MenuItem value="this_year">This Year</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.comparison_enabled ?? widget.comparison_enabled}
                    onChange={(e) => handleFieldChange('comparison_enabled', e.target.checked)}
                  />
                }
                label="Enable Comparison"
              />

              {(formData.comparison_enabled ?? widget.comparison_enabled) && (
                <FormControl fullWidth>
                  <InputLabel>Comparison Period</InputLabel>
                  <Select
                    value={formData.comparison_period || widget.comparison_period || 'previous_period'}
                    label="Comparison Period"
                    onChange={(e) => handleFieldChange('comparison_period', e.target.value)}
                  >
                    <MenuItem value="previous_period">Previous Period</MenuItem>
                    <MenuItem value="previous_year">Previous Year</MenuItem>
                    <MenuItem value="previous_month">Previous Month</MenuItem>
                    <MenuItem value="previous_week">Previous Week</MenuItem>
                  </Select>
                </FormControl>
              )}

              <Divider />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Data Refresh
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Widget data is refreshed according to the dashboard's auto-refresh settings.
                </Typography>
                {dashboard && (
                  <Typography variant="body2">
                    Current interval: {dashboard.auto_refresh_interval}s
                  </Typography>
                )}
              </Box>
            </Stack>
          </TabPanel>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
              fullWidth
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              fullWidth
            >
              Save Changes
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Preview Panel */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
        }}
      >
        {/* Preview Header */}
        <Paper
          sx={{
            p: 2,
            borderRadius: 0,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Widget Preview
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {previewMode && (
                <Chip label="Live Preview" color="success" size="small" />
              )}
              <IconButton size="small" disabled>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>

        {/* Preview Content */}
        <Box
          sx={{
            flex: 1,
            p: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 800,
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WidgetRenderer
              widget={mergedWidget as Widget}
              isLoading={false}
              error={null}
              compact={false}
            />
          </Box>
        </Box>

        {/* Preview Info */}
        <Paper
          sx={{
            p: 2,
            borderRadius: 0,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Preview using mock data • Changes are applied in real-time
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body2" color="text.secondary">
                Size: {formData.size || widget.size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Type: {formData.widget_type || widget.widget_type}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Floating Help */}
      {hasUnsavedChanges && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            p: 2,
            zIndex: 1000,
            maxWidth: 300,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Unsaved Changes
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Your changes are automatically previewed but not saved yet.
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            startIcon={<SaveIcon />}
          >
            Save Now
          </Button>
        </Paper>
      )}
    </Box>
  );
};