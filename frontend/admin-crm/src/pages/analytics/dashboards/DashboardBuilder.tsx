// frontend/admin-crm/src/pages/analytics/dashboards/DashboardBuilder.tsx

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
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  Widgets as WidgetsIcon,
  Palette as PaletteIcon,
  ViewModule as LayoutIcon,
  Add as AddIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useDashboards, useWidgets, useMetricDefinitions } from '../../../hooks/useAnalytics';
import { DashboardGrid } from '../../../components/analytics/dashboards/DashboardGrid';
import { WidgetForm } from '../../../components/analytics/widgets/WidgetForm';
import { DashboardForm } from '../../../components/analytics/dashboards/DashboardForm';
import type { Widget, CreateWidgetData, UpdateWidgetData } from '../../../types/analytics.types';

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

interface WidgetLibraryItemProps {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  onAdd: (type: string) => void;
}

const WidgetLibraryItem: React.FC<WidgetLibraryItemProps> = ({
  type,
  label,
  description,
  icon,
  onAdd,
}) => {
  return (
    <ListItem
      component="button"
      onClick={() => onAdd(type)}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        textAlign: 'left',
        width: '100%',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: 'primary.main',
        },
      }}
    >
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        secondary={description}
        primaryTypographyProps={{ fontWeight: 'medium' }}
      />
      <IconButton size="small" color="primary">
        <AddIcon />
      </IconButton>
    </ListItem>
  );
};

export const DashboardBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [currentTab, setCurrentTab] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [showWidgetForm, setShowWidgetForm] = useState(false);
  const [showDashboardForm, setShowDashboardForm] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const dashboardId = parseInt(id || '0', 10);
  const isNewDashboard = id === 'new';

  const { useDashboard, createDashboard, updateDashboard } = useDashboards();
  const { widgets, addWidget, updateWidget, deleteWidget, refetchWidgets } = useWidgets({
    dashboard_id: isNewDashboard ? undefined : dashboardId,
  });
  const { useActiveMetrics } = useMetricDefinitions();

  const {
    data: dashboard,
    isLoading: isLoadingDashboard,
    error: dashboardError,
  } = useDashboard(isNewDashboard ? 0 : dashboardId);

  const { data: metrics = [] } = useActiveMetrics();

  useEffect(() => {
    if (isNewDashboard) {
      setBreadcrumbs([
        { label: 'Analytics', path: '/analytics' },
        { label: 'Dashboards', path: '/analytics/dashboards' },
        { label: 'Create Dashboard' },
      ]);
    } else if (dashboard) {
      setBreadcrumbs([
        { label: 'Analytics', path: '/analytics' },
        { label: 'Dashboards', path: '/analytics/dashboards' },
        { label: dashboard.name, path: `/analytics/dashboards/${dashboard.id}` },
        { label: 'Builder' },
      ]);
    }
  }, [setBreadcrumbs, dashboard, isNewDashboard]);

  const handleBack = () => {
    if (isNewDashboard) {
      navigate('/analytics/dashboards');
    } else {
      navigate(`/analytics/dashboards/${dashboardId}`);
    }
  };

  const handleSave = () => {
    // Save current state - this would typically update layout positions
    if (dashboard) {
      updateDashboard({
        id: dashboard.id,
        data: {
          layout_config: {
            // Save widget positions and configurations
            widgets: widgets.map(w => ({
              id: w.id,
              position_x: w.position_x,
              position_y: w.position_y,
              size: w.size,
              order: w.order,
            })),
          },
        },
      });
    }
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
    setDrawerOpen(!previewMode); // Close drawer in preview mode
  };

  const handleAddWidget = (widgetType?: string) => {
    setEditingWidget(null);
    setShowWidgetForm(true);
    // Pre-select widget type if provided
    if (widgetType) {
      // This would be handled in the WidgetForm component
    }
  };

  // @ts-ignore
  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
    setShowWidgetForm(true);
  };

  const handleDeleteWidget = (widgetId: number) => {
    deleteWidget(widgetId);
  };

  const handleWidgetFormSubmit = (data: CreateWidgetData | UpdateWidgetData) => {
    if (editingWidget) {
      updateWidget({ id: editingWidget.id, data });
    } else {
      // Add new widget
      if (dashboard) {
        addWidget({ dashboardId: dashboard.id, data: data as CreateWidgetData });
      }
    }
    setShowWidgetForm(false);
    setEditingWidget(null);
  };

  const handleDashboardFormSubmit = (data: any) => {
    if (isNewDashboard) {
      createDashboard(data);
    } else if (dashboard) {
      updateDashboard({ id: dashboard.id, data });
    }
    setShowDashboardForm(false);
  };

  const widgetLibraryItems = [
    {
      type: 'METRIC_CARD',
      label: 'Metric Card',
      description: 'Single value with trend',
      icon: <WidgetsIcon />,
    },
    {
      type: 'LINE_CHART',
      label: 'Line Chart',
      description: 'Time series visualization',
      icon: <WidgetsIcon />,
    },
    {
      type: 'BAR_CHART',
      label: 'Bar Chart',
      description: 'Category comparisons',
      icon: <WidgetsIcon />,
    },
    {
      type: 'PIE_CHART',
      label: 'Pie Chart',
      description: 'Part-to-whole relationships',
      icon: <WidgetsIcon />,
    },
    {
      type: 'GAUGE',
      label: 'Gauge',
      description: 'Progress indicator',
      icon: <WidgetsIcon />,
    },
    {
      type: 'TABLE',
      label: 'Data Table',
      description: 'Structured data display',
      icon: <WidgetsIcon />,
    },
  ];

  if (isLoadingDashboard && !isNewDashboard) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Loading dashboard builder...</Typography>
      </Box>
    );
  }

  if (dashboardError && !isNewDashboard) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Failed to load dashboard</Alert>
        <Button startIcon={<BackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Side Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen && !previewMode}
        sx={{
          width: 320,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 320,
            boxSizing: 'border-box',
            position: 'relative',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Dashboard Builder
          </Typography>
          
          <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
            <Tab icon={<WidgetsIcon />} label="Widgets" />
            <Tab icon={<SettingsIcon />} label="Settings" />
            <Tab icon={<PaletteIcon />} label="Style" />
          </Tabs>
        </Box>

        <Divider />

        {/* Widgets Tab */}
        <TabPanel value={currentTab} index={0}>
          <Typography variant="subtitle1" gutterBottom>
            Widget Library
          </Typography>
          <List>
            {widgetLibraryItems.map((item) => (
              <WidgetLibraryItem
                key={item.type}
                type={item.type}
                label={item.label}
                description={item.description}
                icon={item.icon}
                onAdd={handleAddWidget}
              />
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>
            Current Widgets ({widgets.length})
          </Typography>
          <List dense>
            {widgets.map((widget) => (
              <ListItem key={widget.id} sx={{ pl: 0 }}>
                <ListItemIcon>
                  <DragIcon />
                </ListItemIcon>
                <ListItemText
                  primary={widget.title}
                  secondary={widget.widget_type}
                />
                <Chip
                  label={widget.size}
                  size="small"
                  variant="outlined"
                />
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={currentTab} index={1}>
          <Stack spacing={2}>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setShowDashboardForm(true)}
              fullWidth
            >
              Dashboard Settings
            </Button>

            <FormControl fullWidth size="small">
              <InputLabel>Grid Size</InputLabel>
              <Select value="medium" label="Grid Size">
                <MenuItem value="small">Small (Dense)</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large (Spacious)</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Snap to Grid"
            />

            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Show Grid Lines"
            />

            <Divider />

            <Typography variant="subtitle2">
              Dashboard Statistics
            </Typography>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Widgets: {widgets.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Metrics: {metrics.length}
              </Typography>
              {dashboard && (
                <Typography variant="body2" color="text.secondary">
                  Auto-refresh: {dashboard.auto_refresh_interval}s
                </Typography>
              )}
            </Box>
          </Stack>
        </TabPanel>

        {/* Style Tab */}
        <TabPanel value={currentTab} index={2}>
          <Stack spacing={2}>
            <Typography variant="subtitle2">
              Dashboard Theme
            </Typography>
            
            <FormControl fullWidth size="small">
              <InputLabel>Color Scheme</InputLabel>
              <Select value="default" label="Color Scheme">
                <MenuItem value="default">Default</MenuItem>
                <MenuItem value="blue">Blue Theme</MenuItem>
                <MenuItem value="green">Green Theme</MenuItem>
                <MenuItem value="dark">Dark Theme</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Widget Spacing</InputLabel>
              <Select value="normal" label="Widget Spacing">
                <MenuItem value="compact">Compact</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="relaxed">Relaxed</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={<Switch />}
              label="Show Widget Borders"
            />

            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable Animations"
            />
          </Stack>
        </TabPanel>
      </Drawer>

      {/* Main Content */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {/* Header */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 0,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handleBack} size="small">
              <BackIcon />
            </IconButton>
            <Typography variant="h6">
              {isNewDashboard ? 'Create Dashboard' : `Edit: ${dashboard?.name}`}
            </Typography>
            {previewMode && (
              <Chip label="Preview Mode" color="primary" size="small" />
            )}
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Button
              variant="outlined"
              startIcon={<LayoutIcon />}
              onClick={() => setDrawerOpen(!drawerOpen)}
              disabled={previewMode}
            >
              {drawerOpen ? 'Hide' : 'Show'} Panel
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handlePreview}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={previewMode}
            >
              Save
            </Button>
          </Box>
        </Paper>

        {/* Dashboard Canvas */}
        <Box
          sx={{
            flex: 1,
            p: previewMode ? 0 : 3,
            bgcolor: previewMode ? 'background.default' : 'background.paper',
            overflow: 'auto',
          }}
        >
          {dashboard || isNewDashboard ? (
            <DashboardGrid
              dashboard={dashboard || {
                id: 0,
                name: 'New Dashboard',
                description: '',
                dashboard_type: 'OPERATIONAL',
                is_public: false,
                allowed_roles: [],
                created_by: 0,
                layout_config: {},
                auto_refresh_interval: 300,
                is_active: true,
                is_default: false,
                created_at: '',
                updated_at: '',
              }}
              widgets={widgets}
              isEditable={!previewMode}
              onWidgetUpdate={() => refetchWidgets()}
              onWidgetDelete={handleDeleteWidget}
              onWidgetAdd={() => handleAddWidget()}
            />
          ) : (
            <Alert severity="info">
              Create a dashboard first to start adding widgets.
            </Alert>
          )}
        </Box>
      </Box>

      {/* Widget Form Dialog */}
      <WidgetForm
        open={showWidgetForm}
        onClose={() => {
          setShowWidgetForm(false);
          setEditingWidget(null);
        }}
        editingWidget={editingWidget}
        dashboardId={dashboard?.id}
        onSubmit={handleWidgetFormSubmit}
        isLoading={false}
      />

      {/* Dashboard Form Dialog */}
      {showDashboardForm && (
        <DashboardForm
          open={showDashboardForm}
          onClose={() => setShowDashboardForm(false)}
          editingDashboard={dashboard}
          onSubmit={handleDashboardFormSubmit}
          isLoading={false}
        />
      )}
    </Box>
  );
};