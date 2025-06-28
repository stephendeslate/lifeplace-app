// frontend/admin-crm/src/pages/analytics/DashboardView.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Skeleton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  DateRange as DateRangeIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useDashboards, useWidgets } from '../../hooks/useAnalytics';
import { DashboardGrid } from '../../components/analytics/dashboards/DashboardGrid';
import { LoadingTable } from '../../components/common/LoadingTable';
import { EmptyState } from '../../components/common/EmptyState';

export const DashboardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [timeRange, setTimeRange] = useState<string>('last_30_days');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { useDashboard, useDashboardData } = useDashboards();
  
  const dashboardId = parseInt(id || '0', 10);
  
  const {
    data: dashboard,
    isLoading: isLoadingDashboard,
    error: dashboardError
  } = useDashboard(dashboardId);

  const {
    data: dashboardData,
    isLoading: isLoadingData,
    error: dataError,
    refetch: refetchData
  } = useDashboardData(dashboardId, { time_range: timeRange });

  const { widgets, refetchWidgets } = useWidgets({ dashboard_id: dashboardId });

  useEffect(() => {
    if (dashboard) {
      setBreadcrumbs([
        { label: 'Analytics', path: '/analytics' },
        { label: 'Dashboards', path: '/analytics/dashboards' },
        { label: dashboard.name },
      ]);
    }
  }, [setBreadcrumbs, dashboard]);

  const handleTimeRangeChange = (newTimeRange: string) => {
    setTimeRange(newTimeRange);
  };

  const handleEdit = () => {
    setIsEditMode(!isEditMode);
  };

  const handleRefresh = () => {
    refetchData();
    refetchWidgets();
  };

  const handleBack = () => {
    navigate('/analytics/dashboards');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleWidgetUpdate = () => {
    refetchWidgets();
  };

  const handleWidgetDelete = () => {
    refetchWidgets();
  };

  const handleWidgetAdd = () => {
    // Widget add is handled within DashboardGrid
    refetchWidgets();
  };

  if (isLoadingDashboard) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
        <LoadingTable />
      </Box>
    );
  }

  if (dashboardError || !dashboard) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          {dashboardError ? 'Failed to load dashboard' : 'Dashboard not found'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Dashboards
        </Button>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        p: isFullscreen ? 1 : { xs: 2, sm: 3, md: 4 },
        height: isFullscreen ? '100vh' : 'auto',
        overflow: isFullscreen ? 'auto' : 'visible'
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          {!isFullscreen && (
            <IconButton onClick={handleBack} size="small">
              <BackIcon />
            </IconButton>
          )}
          
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="h4" fontWeight="bold">
                {dashboard.name}
              </Typography>
              {dashboard.is_public ? (
                <Tooltip title="Public dashboard">
                  <PublicIcon color="primary" />
                </Tooltip>
              ) : (
                <Tooltip title="Private dashboard">
                  <PrivateIcon color="action" />
                </Tooltip>
              )}
              {isEditMode && (
                <Chip
                  icon={<BuildIcon />}
                  label="Edit Mode"
                  size="small"
                  color="warning"
                  variant="filled"
                />
              )}
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {dashboard.description || 'No description'}
              </Typography>
              {widgets && (
                <Chip
                  label={`${widgets.length} widget${widgets.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              startAdornment={<DateRangeIcon sx={{ mr: 1 }} />}
            >
              <MenuItem value="last_24_hours">Last 24 Hours</MenuItem>
              <MenuItem value="last_7_days">Last 7 Days</MenuItem>
              <MenuItem value="last_30_days">Last 30 Days</MenuItem>
              <MenuItem value="last_90_days">Last 90 Days</MenuItem>
              <MenuItem value="this_month">This Month</MenuItem>
              <MenuItem value="this_year">This Year</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={isLoadingData}>
              {isLoadingData ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            <IconButton onClick={toggleFullscreen}>
              <FullscreenIcon />
            </IconButton>
          </Tooltip>
          
          <FormControlLabel
            control={
              <Switch
                checked={isEditMode}
                onChange={handleEdit}
                size="small"
              />
            }
            label="Edit"
            sx={{ ml: 1 }}
          />
        </Box>
      </Box>

      {/* Dashboard Info */}
      {dashboardData && !isFullscreen && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2">
              Last updated: {new Date(dashboardData.last_updated).toLocaleString()}
            </Typography>
            <Typography variant="body2">
              Time range: {dashboardData.time_range.start_date} to {dashboardData.time_range.end_date}
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Dashboard Content */}
      {dataError ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load dashboard data. Please try refreshing.
        </Alert>
      ) : !widgets || widgets.length === 0 ? (
        <EmptyState
          icon={SettingsIcon}
          title="No widgets configured"
          description="This dashboard doesn't have any widgets yet. Add some widgets to start visualizing your data."
          action={
            <Button
              variant="contained"
              startIcon={<BuildIcon />}
              onClick={() => setIsEditMode(true)}
            >
              Add Widgets
            </Button>
          }
        />
      ) : (
        <DashboardGrid
          dashboard={dashboard}
          widgets={widgets}
          isEditable={isEditMode}
          onWidgetUpdate={handleWidgetUpdate}
          onWidgetDelete={handleWidgetDelete}
          onWidgetAdd={handleWidgetAdd}
        />
      )}

      {/* Auto-refresh indicator */}
      {dashboard.auto_refresh_interval > 0 && !isFullscreen && (
        <Box 
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16, 
            zIndex: 1000 
          }}
        >
          <Chip
            icon={<RefreshIcon />}
            label={`Auto-refresh: ${dashboard.auto_refresh_interval}s`}
            size="small"
            color="info"
            variant="filled"
          />
        </Box>
      )}

      {/* Edit Mode Help */}
      {isEditMode && !isFullscreen && (
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
            Edit Mode Active
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Click the menu (⋮) on widgets to edit or delete them
            • Use the floating (+) button to add new widgets
            • Toggle off Edit mode when you're done
          </Typography>
        </Paper>
      )}
    </Box>
  );
};