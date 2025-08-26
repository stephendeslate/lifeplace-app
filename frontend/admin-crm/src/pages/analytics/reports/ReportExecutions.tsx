// frontend/admin-crm/src/pages/analytics/reports/ReportExecutions.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
  Alert,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
  PlayArrow as ExecuteIcon,
  Stop as CancelIcon,
  FilterList as FilterIcon,
  Timeline as ChartIcon,
  Assessment as ReportIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  PendingActions as PendingIcon,
  Cancel as CancelledIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useLayout } from '../../../contexts/LayoutContext';
import { useAnalyticsReports} from '../../../hooks/useAnalytics';
import { useReportOperations } from '../../../hooks/useReportOperations';
import { LoadingTable } from '../../../components/common/LoadingTable';
import { EmptyState } from '../../../components/common/EmptyState';
import type { ReportExecution } from '../../../types/analytics.types';

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

interface ExecutionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  execution: ReportExecution | null;
  onDownload?: (execution: ReportExecution) => void;
  onCancel?: (executionId: string) => void;
}

const ExecutionDetailsDialog: React.FC<ExecutionDetailsDialogProps> = ({
  open,
  onClose,
  execution,
  onDownload,
  onCancel,
}) => {
  if (!execution) return null;

  const getStatusIcon = () => {
    switch (execution.status) {
      case 'COMPLETED': return <SuccessIcon color="success" />;
      case 'RUNNING': return <PendingIcon color="info" />;
      case 'PENDING': return <ScheduleIcon color="warning" />;
      case 'FAILED': return <ErrorIcon color="error" />;
      case 'CANCELLED': return <CancelledIcon color="action" />;
      default: return <InfoIcon />;
    }
  };

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {getStatusIcon()}
          <Typography variant="h6">
            Execution Details
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Basic Information */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Execution Information
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Execution ID:</Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {execution.execution_id}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Status:</Typography>
                <Chip
                  label={execution.status}
                  size="small"
                  color={execution.status === 'COMPLETED' ? 'success' : execution.status === 'FAILED' ? 'error' : 'default'}
                  variant={execution.status === 'COMPLETED' ? 'filled' : 'outlined'}
                />
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Requested By:</Typography>
                <Typography variant="body2">
                  {execution.requested_by_name || 'Unknown'}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Timing Information */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Timing Information
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Started:</Typography>
                <Typography variant="body2">
                  {formatDateTime(execution.started_at)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Completed:</Typography>
                <Typography variant="body2">
                  {execution.status === 'RUNNING' 
                    ? 'In progress...' 
                    : formatDateTime(execution.completed_at)
                  }
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Duration:</Typography>
                <Typography variant="body2">
                  {formatDuration(execution.execution_time_seconds)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Date Range:</Typography>
                <Typography variant="body2">
                  {execution.date_range_start} to {execution.date_range_end}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Output Information */}
          {execution.status === 'COMPLETED' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Output Information
              </Typography>
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">File Size:</Typography>
                  <Typography variant="body2">
                    {formatFileSize(execution.file_size)}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">File Path:</Typography>
                  <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {execution.file_path || 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Execution Parameters */}
          {Object.keys(execution.execution_params).length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Execution Parameters
              </Typography>
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                  {JSON.stringify(execution.execution_params, null, 2)}
                </pre>
              </Box>
            </Paper>
          )}

          {/* Result Data Preview */}
          {execution.status === 'COMPLETED' && Object.keys(execution.result_data).length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Result Data Preview
              </Typography>
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                  {JSON.stringify(execution.result_data, null, 2)}
                </pre>
              </Box>
            </Paper>
          )}

          {/* Error Information */}
          {execution.error_message && (
            <Alert severity="error">
              <Typography variant="subtitle2" gutterBottom>
                Error Details
              </Typography>
              <Typography variant="body2">
                {execution.error_message}
              </Typography>
            </Alert>
          )}

          {/* Progress Indicator for Running Executions */}
          {execution.status === 'RUNNING' && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Execution Progress
              </Typography>
              <LinearProgress sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Execution in progress... This page will automatically refresh to show updates.
              </Typography>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        {execution.status === 'RUNNING' && onCancel && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => onCancel(execution.execution_id)}
          >
            Cancel Execution
          </Button>
        )}
        {execution.status === 'COMPLETED' && execution.file_path && onDownload && (
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => onDownload(execution)}
          >
            Download Report
          </Button>
        )}
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface ExecutionStatsProps {
  executions: ReportExecution[];
}

const ExecutionStats: React.FC<ExecutionStatsProps> = ({ executions }) => {
  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'COMPLETED').length;
    const failed = executions.filter(e => e.status === 'FAILED').length;
    const running = executions.filter(e => e.status === 'RUNNING').length;
    const pending = executions.filter(e => e.status === 'PENDING').length;

    const successRate = total > 0 ? (completed / total) * 100 : 0;
    
    // Calculate average execution time
    const completedExecutions = executions.filter(e => 
      e.status === 'COMPLETED' && e.execution_time_seconds
    );
    const avgExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.execution_time_seconds || 0), 0) / completedExecutions.length
      : 0;

    // Calculate average file size
    const avgFileSize = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.file_size || 0), 0) / completedExecutions.length
      : 0;

    return {
      total,
      completed,
      failed,
      running,
      pending,
      successRate,
      avgExecutionTime,
      avgFileSize,
    };
  }, [executions]);

  // Prepare chart data for execution trends
  const chartData = React.useMemo(() => {
    const dailyData: Record<string, { date: string; completed: number; failed: number; total: number }> = {};
    
    executions.forEach(execution => {
      if (execution.started_at) {
        const date = execution.started_at.split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { date, completed: 0, failed: 0, total: 0 };
        }
        dailyData[date].total++;
        if (execution.status === 'COMPLETED') dailyData[date].completed++;
        if (execution.status === 'FAILED') dailyData[date].failed++;
      }
    });

    return Object.values(dailyData)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days
  }, [executions]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Stack spacing={3}>
      {/* Summary Cards */}
      <Box display="flex" gap={2} flexWrap="wrap">
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="primary">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Executions
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="success.main">
              {stats.successRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Success Rate
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="info.main">
              {formatDuration(stats.avgExecutionTime)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Duration
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h3" color="secondary.main">
              {formatFileSize(stats.avgFileSize)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg File Size
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Status Breakdown */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Status Breakdown
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Badge badgeContent={stats.completed} color="success">
            <Chip label="Completed" color="success" variant="outlined" />
          </Badge>
          <Badge badgeContent={stats.failed} color="error">
            <Chip label="Failed" color="error" variant="outlined" />
          </Badge>
          <Badge badgeContent={stats.running} color="info">
            <Chip label="Running" color="info" variant="outlined" />
          </Badge>
          <Badge badgeContent={stats.pending} color="warning">
            <Chip label="Pending" color="warning" variant="outlined" />
          </Badge>
        </Stack>
      </Paper>

      {/* Execution Trends Chart */}
      {chartData.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Execution Trends (Last 14 Days)
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" />
                <Line type="monotone" dataKey="completed" stroke="#82ca9d" name="Completed" />
                <Line type="monotone" dataKey="failed" stroke="#ff7300" name="Failed" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}
    </Stack>
  );
};

export const ReportExecutions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [currentTab, setCurrentTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedExecution, setSelectedExecution] = useState<ReportExecution | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const reportId = parseInt(id || '0', 10);

  // Hooks
  const { useAnalyticsReport, useReportExecutions, executeReport, isExecutingReport } = useAnalyticsReports();
  const { executionStats } = useReportOperations({ reportId });
  
  const { data: report, isLoading: isLoadingReport } = useAnalyticsReport(reportId);
  const { data: executions = [], isLoading: isLoadingExecutions, refetch: refetchExecutions } = useReportExecutions(reportId);

  useEffect(() => {
    if (report) {
      setBreadcrumbs([
        { label: 'Analytics', path: '/analytics' },
        { label: 'Reports', path: '/analytics/reports' },
        { label: report.name, path: `/analytics/reports/${id}` },
        { label: 'Executions' },
      ]);
    }
  }, [setBreadcrumbs, report, id]);

  const handleBack = () => {
    navigate(`/analytics/reports/${id}`);
  };

  const handleExecuteReport = () => {
    executeReport({ id: reportId, request: {} });
  };


  const handleDownloadExecution = (execution: ReportExecution) => {
    // TODO: Implement actual download logic
    console.log('Download execution:', execution);
  };

  const handleCancelExecution = (executionId: string) => {
    // TODO: Implement cancel execution logic
    console.log('Cancel execution:', executionId);
  };

  const handleCloseDetails = () => {
    setSelectedExecution(null);
    setDetailsDialogOpen(false);
  };

  // Filter executions based on status
  const filteredExecutions = React.useMemo(() => {
    if (statusFilter === 'all') return executions;
    return executions.filter(execution => execution.status === statusFilter);
  }, [executions, statusFilter]);

  if (isLoadingReport) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <LoadingTable />
      </Box>
    );
  }

  if (!report) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          Report not found
        </Alert>
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
              Report Executions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {report.name} - Execution history and statistics
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
              startAdornment={<FilterIcon sx={{ mr: 1 }} />}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="RUNNING">Running</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh executions">
            <IconButton onClick={() => refetchExecutions()} disabled={isLoadingExecutions}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<ExecuteIcon />}
            onClick={handleExecuteReport}
            disabled={isExecutingReport || !report.is_active}
          >
            Execute Report
          </Button>
        </Box>
      </Box>

      {/* Report Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <ReportIcon />
          <Box>
            <Typography variant="body2">
              <strong>{report.name}</strong> - {report.report_type.replace('_', ' ')} Report
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Output: {report.output_format} | Schedule: {report.schedule_frequency === 'MANUAL' ? 'Manual' : report.schedule_frequency.toLowerCase()}
            </Typography>
          </Box>
        </Box>
      </Alert>

      {/* Tabs */}
      <Paper variant="outlined">
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<ScheduleIcon />}
            label={`History (${filteredExecutions.length})`}
            iconPosition="start"
          />
          <Tab
            icon={<ChartIcon />}
            label="Statistics"
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={currentTab} index={1}>
          {/* Statistics */}
          <ExecutionStats executions={executions} />
        </TabPanel>
      </Paper>

      {/* Execution Details Dialog */}
      <ExecutionDetailsDialog
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
        execution={selectedExecution}
        onDownload={handleDownloadExecution}
        onCancel={handleCancelExecution}
      />

      {/* Status Messages */}
      {isExecutingReport && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Executing report... This may take a few moments.
        </Alert>
      )}

      {executionStats?.running > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            There is currently a running execution for this report. 
            Multiple executions cannot run simultaneously.
          </Typography>
        </Alert>
      )}

      {/* Empty State for No Executions */}
      {executions.length === 0 && !isLoadingExecutions && (
        <Box sx={{ mt: 4 }}>
          <EmptyState
            icon={ScheduleIcon}
            title="No executions yet"
            description="This report hasn't been executed yet. Click 'Execute Report' to generate the first report."
            action={
              <Button
                variant="contained"
                startIcon={<ExecuteIcon />}
                onClick={handleExecuteReport}
                disabled={isExecutingReport || !report.is_active}
              >
                Execute First Report
              </Button>
            }
          />
        </Box>
      )}
    </Box>
  );
};