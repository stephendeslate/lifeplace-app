// frontend/admin-crm/src/pages/analytics/ReportView.tsx

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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  PlayArrow as ExecuteIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Assessment as ReportIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useAnalyticsReports } from '../../hooks/useAnalytics';
import { LoadingTable } from '../../components/common/LoadingTable';
import { EmptyState } from '../../components/common/EmptyState';
import type { ReportExecution } from '../../types/analytics.types';

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

interface ExecutionTableRowProps {
  execution: ReportExecution;
  onView: (execution: ReportExecution) => void;
  onDownload?: (execution: ReportExecution) => void;
}

const ExecutionTableRow: React.FC<ExecutionTableRowProps> = ({
  execution,
  onView,
  onDownload,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'RUNNING': return 'info';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'error';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontFamily="monospace">
          {execution.execution_id.slice(0, 8)}...
        </Typography>
      </TableCell>
      
      <TableCell>
        <Chip
          label={execution.status}
          size="small"
          color={getStatusColor(execution.status) as any}
          variant={execution.status === 'COMPLETED' ? 'filled' : 'outlined'}
        />
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {execution.started_at 
            ? new Date(execution.started_at).toLocaleString()
            : 'Not started'
          }
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {execution.completed_at 
            ? new Date(execution.completed_at).toLocaleString()
            : execution.status === 'RUNNING' ? 'In progress...' : 'N/A'
          }
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {formatDuration(execution.execution_time_seconds)}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {formatFileSize(execution.file_size)}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {execution.requested_by_name || 'Unknown'}
        </Typography>
      </TableCell>
      
      <TableCell align="right">
        <Stack direction="row" spacing={1}>
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => onView(execution)}>
              <ReportIcon />
            </IconButton>
          </Tooltip>
          {execution.status === 'COMPLETED' && execution.file_path && onDownload && (
            <Tooltip title="Download">
              <IconButton size="small" onClick={() => onDownload(execution)}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );
};

export const ReportView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [currentTab, setCurrentTab] = useState(0);

  const { useAnalyticsReport, useReportExecutions, executeReport } = useAnalyticsReports();
  
  const reportId = parseInt(id || '0', 10);
  
  const {
    data: report,
    isLoading: isLoadingReport,
    error: reportError
  } = useAnalyticsReport(reportId);

  const {
    data: executions = [],
    isLoading: isLoadingExecutions,
    refetch: refetchExecutions
  } = useReportExecutions(reportId);

  const { isExecutingReport } = useAnalyticsReports();

  useEffect(() => {
    if (report) {
      setBreadcrumbs([
        { label: 'Analytics', path: '/analytics' },
        { label: 'Reports', path: '/analytics/reports' },
        { label: report.name },
      ]);
    }
  }, [setBreadcrumbs, report]);

  const handleBack = () => {
    navigate('/analytics/reports');
  };

  const handleEdit = () => {
    // TODO: Navigate to edit form or open dialog
    console.log('Edit report:', report);
  };

  const handleExecute = () => {
    executeReport({ id: reportId, request: {} });
  };

  const handleViewExecution = (execution: ReportExecution) => {
    // TODO: Show execution details in a modal or navigate to detailed view
    console.log('View execution:', execution);
  };

  const handleDownloadExecution = (execution: ReportExecution) => {
    // TODO: Implement file download
    console.log('Download execution:', execution);
  };

  const handleRefreshExecutions = () => {
    refetchExecutions();
  };

  const getScheduleText = () => {
    if (!report) return '';
    
    if (report.schedule_frequency === 'MANUAL') {
      return 'Manual execution only';
    }
    
    let text = `Runs ${report.schedule_frequency.toLowerCase()}`;
    
    if (report.schedule_time) {
      text += ` at ${report.schedule_time}`;
    }
    
    if (report.schedule_frequency === 'WEEKLY' && report.schedule_day_of_week !== null) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      text += ` on ${days[report.schedule_day_of_week]}s`;
    }
    
    if (report.schedule_frequency === 'MONTHLY' && report.schedule_day_of_month) {
      const suffix = getOrdinalSuffix(report.schedule_day_of_month);
      text += ` on the ${report.schedule_day_of_month}${suffix}`;
    }
    
    return text;
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  if (isLoadingReport) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
        <LoadingTable />
      </Box>
    );
  }

  if (reportError || !report) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          {reportError ? 'Failed to load report' : 'Report not found'}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Reports
        </Button>
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
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {report.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {report.description || 'No description'}
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="contained"
            startIcon={<ExecuteIcon />}
            onClick={handleExecute}
            disabled={isExecutingReport}
          >
            Execute Now
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Edit
          </Button>
        </Box>
      </Box>

      {/* Report Info */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Box sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Box flex={1}>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Report Type
                  </Typography>
                  <Chip
                    label={report.report_type.replace('_', ' ')}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Output Format
                  </Typography>
                  <Chip
                    label={report.output_format}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={report.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={report.is_active ? 'success' : 'default'}
                    variant={report.is_active ? 'filled' : 'outlined'}
                  />
                </Box>
              </Stack>
            </Box>
            
            <Divider orientation="vertical" flexItem />
            
            <Box flex={1}>
              <Typography variant="h6" gutterBottom>
                Schedule
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <ScheduleIcon color="action" />
                <Typography variant="body2">
                  {getScheduleText()}
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Last Generated: {report.last_generated 
                  ? new Date(report.last_generated).toLocaleString()
                  : 'Never'
                }
              </Typography>
            </Box>
            
            <Divider orientation="vertical" flexItem />
            
            <Box flex={1}>
              <Typography variant="h6" gutterBottom>
                Recipients
              </Typography>
              <Stack spacing={1}>
                {report.recipients.length > 0 ? (
                  report.recipients.map((email, index) => (
                    <Typography key={index} variant="body2">
                      {email}
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recipients configured
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper variant="outlined">
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<HistoryIcon />}
            label="Execution History"
            iconPosition="start"
          />
          <Tab
            icon={<SettingsIcon />}
            label="Metrics"
            iconPosition="start"
          />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          {/* Execution History */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Execution History
            </Typography>
            <Tooltip title="Refresh executions">
              <IconButton onClick={handleRefreshExecutions} disabled={isLoadingExecutions}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {isLoadingExecutions ? (
            <LoadingTable />
          ) : executions.length === 0 ? (
            <EmptyState
              icon={HistoryIcon}
              title="No executions yet"
              description="This report hasn't been executed yet. Click 'Execute Now' to generate the first report."
            />
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Execution ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Started</TableCell>
                    <TableCell>Completed</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>File Size</TableCell>
                    <TableCell>Requested By</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {executions.map((execution) => (
                    <ExecutionTableRow
                      key={execution.id}
                      execution={execution}
                      onView={handleViewExecution}
                      onDownload={handleDownloadExecution}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          {/* Metrics */}
          <Typography variant="h6" gutterBottom>
            Included Metrics
          </Typography>
          
          {report.metrics && report.metrics.length > 0 ? (
            <Stack spacing={2}>
              {report.metrics.map((metric) => (
                <Paper key={metric.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {metric.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {metric.description || 'No description'}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      label={metric.metric_type}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${metric.source_domain}.${metric.source_model}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={metric.display_format}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <EmptyState
              icon={ReportIcon}
              title="No metrics configured"
              description="This report doesn't have any metrics assigned yet."
            />
          )}
        </TabPanel>
      </Paper>

      {/* Status Messages */}
      {isExecutingReport && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Executing report... This may take a few moments.
        </Alert>
      )}
    </Box>
  );
};