// frontend/admin-crm/src/pages/analytics/DashboardView.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Edit as EditIcon,
  ArrowBack as BackIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  DateRange as DateRangeIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useDashboards } from '../../hooks/useAnalytics';
import { LoadingTable } from '../../components/common/LoadingTable';
import { EmptyState } from '../../components/common/EmptyState';
import type { DashboardDataRequest } from '../../types/analytics.types';

interface WidgetPlaceholderProps {
  title: string;
  size: string;
  type: string;
}

const WidgetPlaceholder: React.FC<WidgetPlaceholderProps> = ({ title, size, type }) => {
  const getWidgetHeight = (size: string) => {
    switch (size) {
      case 'SMALL': return 200;
      case 'MEDIUM': return 250;
      case 'LARGE': return 400;
      case 'TALL': return 350;
      default: return 250;
    }
  };

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 2, 
        height: getWidgetHeight(size),
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="medium">
          {title}
        </Typography>
        <Chip label={type} size="small" variant="outlined" />
      </Box>
      
      <Box 
        flex={1} 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        sx={{ bgcolor: 'action.hover', borderRadius: 1 }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">
            Loading widget data...
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
};

export const DashboardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [timeRange, setTimeRange] = useState<string>('last_30_days');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    navigate(`/analytics/dashboards/${dashboardId}/edit`);
  };

  const handleRefresh = () => {
    refetchData();
  };

  const handleBack = () => {
    navigate('/analytics/dashboards');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">
                {dashboard.description || 'No description'}
              </Typography>
              {dashboard.widgets && (
                <Chip
                  label={`${dashboard.widgets.length} widget${dashboard.widgets.length !== 1 ? 's' : ''}`}
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
          
          <Tooltip title="Edit dashboard">
            <IconButton onClick={handleEdit}>
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Dashboard Info */}
      {dashboardData && (
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
      ) : !dashboard.widgets || dashboard.widgets.length === 0 ? (
        <EmptyState
          icon={SettingsIcon}
          title="No widgets configured"
          description="This dashboard doesn't have any widgets yet. Add some widgets to start visualizing your data."
          action={
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Configure Dashboard
            </Button>
          }
        />
      ) : (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            flexWrap: { md: 'wrap' },
            gap: 3 
          }}
        >
          {dashboard.widgets.map((widget) => {
            const getWidgetWidth = (size: string) => {
              switch (size) {
                case 'SMALL': return { xs: '100%', md: 'calc(25% - 18px)' };
                case 'MEDIUM': return { xs: '100%', md: 'calc(50% - 12px)' };
                case 'LARGE': return { xs: '100%', md: 'calc(50% - 12px)' };
                case 'WIDE': return { xs: '100%', md: 'calc(75% - 9px)' };
                case 'EXTRA_WIDE': return { xs: '100%', md: '100%' };
                case 'TALL': return { xs: '100%', md: 'calc(25% - 18px)' };
                default: return { xs: '100%', md: 'calc(50% - 12px)' };
              }
            };

            return (
              <Box 
                key={widget.id}
                sx={{ 
                  flex: `1 1 ${getWidgetWidth(widget.size).md}`,
                  minWidth: 300
                }}
              >
                <WidgetPlaceholder
                  title={widget.title}
                  size={widget.size}
                  type={widget.widget_type}
                />
              </Box>
            );
          })}
        </Box>
      )}

      {/* Auto-refresh indicator */}
      {dashboard.auto_refresh_interval > 0 && (
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
    </Box>
  );
};