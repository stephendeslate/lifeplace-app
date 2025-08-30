// frontend/admin-crm/src/components/analytics/reports/ReportPreview.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Preview as PreviewIcon,
  GetApp as DownloadIcon,
  Description as ReportIcon,
  Schedule as ScheduleIcon,
  Assessment as MetricsIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import type { 
  AnalyticsReport, 
  ReportExecution,
  MetricDefinition 
} from '../../../types/analytics.types';

interface ReportPreviewProps {
  report: AnalyticsReport;
  execution?: ReportExecution;
  isLoading?: boolean;
  onDownload?: (execution: ReportExecution) => void;
  onExecute?: () => void;
  showExecuteButton?: boolean;
}

interface ReportPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  report: AnalyticsReport;
  execution?: ReportExecution;
  onDownload?: (execution: ReportExecution) => void;
}

const ReportMetricsTable: React.FC<{ metrics: MetricDefinition[] }> = ({ metrics }) => {
  if (metrics.length === 0) {
    return (
      <Alert severity="warning">
        No metrics configured for this report.
      </Alert>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Metric Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Source</TableCell>
            <TableCell>Display Format</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {metrics.map((metric) => (
            <TableRow key={metric.id}>
              <TableCell>
                <Typography variant="body2" fontWeight="medium">
                  {metric.name}
                </Typography>
                {metric.description && (
                  <Typography variant="caption" color="text.secondary">
                    {metric.description}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip
                  label={metric.metric_type}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {metric.source_domain}.{metric.source_model}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {metric.display_format}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ReportExecutionDetails: React.FC<{ execution: ReportExecution }> = ({ execution }) => {
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

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Execution Status
        </Typography>
        <Chip
          label={execution.status}
          size="small"
          color={getStatusColor(execution.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
          variant={execution.status === 'COMPLETED' ? 'filled' : 'outlined'}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Execution Details
        </Typography>
        <Stack spacing={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Execution ID:
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {execution.execution_id}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Started:
            </Typography>
            <Typography variant="body2">
              {formatDateTime(execution.started_at)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Completed:
            </Typography>
            <Typography variant="body2">
              {formatDateTime(execution.completed_at)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Duration:
            </Typography>
            <Typography variant="body2">
              {formatDuration(execution.execution_time_seconds)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              File Size:
            </Typography>
            <Typography variant="body2">
              {formatFileSize(execution.file_size)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Requested By:
            </Typography>
            <Typography variant="body2">
              {execution.requested_by_name || 'Unknown'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {execution.error_message && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Error Details
          </Typography>
          <Alert severity="error">
            <Typography variant="body2">
              {execution.error_message}
            </Typography>
          </Alert>
        </Box>
      )}
    </Stack>
  );
};

export const ReportPreviewDialog: React.FC<ReportPreviewDialogProps> = ({
  open,
  onClose,
  report,
  execution,
  onDownload,
}) => {
  const getScheduleText = (): string => {
    if (report.schedule_frequency === 'MANUAL') {
      return 'Manual execution only';
    }
    
    let text = `${report.schedule_frequency.toLowerCase()}`;
    
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

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon />
            <Typography variant="h6">
              Report Preview: {report.name}
            </Typography>
          </Box>
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
        <Stack spacing={3}>
          {/* Report Overview */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <ReportIcon color="primary" />
              <Typography variant="h6">
                Report Overview
              </Typography>
            </Box>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {report.description || 'No description provided'}
                </Typography>
              </Box>

              <Box display="flex" gap={3} flexWrap="wrap">
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Type
                  </Typography>
                  <Chip
                    label={report.report_type.replace('_', ' ')}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Output Format
                  </Typography>
                  <Chip
                    label={report.output_format}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={report.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={report.is_active ? 'success' : 'default'}
                    variant={report.is_active ? 'filled' : 'outlined'}
                  />
                </Box>
              </Box>
            </Stack>
          </Paper>

          {/* Schedule Information */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <ScheduleIcon color="primary" />
              <Typography variant="h6">
                Schedule Configuration
              </Typography>
            </Box>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Frequency
                </Typography>
                <Typography variant="body2">
                  {getScheduleText()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Recipients ({report.recipients.length})
                </Typography>
                {report.recipients.length > 0 ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {report.recipients.map((email) => (
                      <Chip
                        key={email}
                        label={email}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recipients configured
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Last Generated
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {report.last_generated 
                    ? new Date(report.last_generated).toLocaleString()
                    : 'Never generated'
                  }
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Metrics Configuration */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <MetricsIcon color="primary" />
              <Typography variant="h6">
                Included Metrics ({report.metrics?.length || 0})
              </Typography>
            </Box>
            
            <ReportMetricsTable metrics={report.metrics || []} />
          </Paper>

          {/* Execution Details */}
          {execution && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <ViewIcon color="primary" />
                <Typography variant="h6">
                  Latest Execution
                </Typography>
              </Box>
              
              <ReportExecutionDetails execution={execution} />
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        {execution && execution.status === 'COMPLETED' && execution.file_path && onDownload && (
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

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  report,
  execution,
  isLoading = false,
  onDownload,
  onExecute,
  showExecuteButton = false,
}) => {
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'BUSINESS_SUMMARY': return 'primary';
      case 'FINANCIAL': return 'success';
      case 'BOOKING_PERFORMANCE': return 'info';
      case 'CLIENT_ANALYSIS': return 'warning';
      case 'WORKFLOW_EFFICIENCY': return 'secondary';
      case 'PAYMENT_ANALYSIS': return 'success';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={3}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          avatar={<ReportIcon />}
          title={report.name}
          subheader={report.description || 'No description'}
          action={
            <Stack direction="row" spacing={1}>
              {showExecuteButton && onExecute && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onExecute}
                >
                  Execute
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<PreviewIcon />}
                onClick={() => setPreviewDialogOpen(true)}
              >
                Preview
              </Button>
            </Stack>
          }
        />
        
        <CardContent>
          <Stack spacing={2}>
            {/* Report Info */}
            <Box display="flex" gap={2} flexWrap="wrap">
              <Chip
                label={report.report_type.replace('_', ' ')}
                size="small"
                color={getReportTypeColor(report.report_type) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                variant="outlined"
              />
              <Chip
                label={report.output_format}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${report.metrics?.length || 0} metrics`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={report.is_active ? 'Active' : 'Inactive'}
                size="small"
                color={report.is_active ? 'success' : 'default'}
                variant={report.is_active ? 'filled' : 'outlined'}
              />
            </Box>

            <Divider />

            {/* Latest Execution Info */}
            {execution ? (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Latest Execution
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(execution.started_at || '').toLocaleString()}
                    </Typography>
                    <Chip
                      label={execution.status}
                      size="small"
                      color={execution.status === 'COMPLETED' ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </Box>
                  {execution.status === 'COMPLETED' && execution.file_path && onDownload && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => onDownload(execution)}
                    >
                      Download
                    </Button>
                  )}
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                This report has not been executed yet.
              </Alert>
            )}

            {/* Schedule Info */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Schedule
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {report.schedule_frequency === 'MANUAL' 
                  ? 'Manual execution only'
                  : `Runs ${report.schedule_frequency.toLowerCase()}`
                }
              </Typography>
            </Box>

            {/* Recipients */}
            {report.recipients.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Recipients ({report.recipients.length})
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {report.recipients.slice(0, 3).map((email) => (
                    <Chip
                      key={email}
                      label={email}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                  {report.recipients.length > 3 && (
                    <Chip
                      label={`+${report.recipients.length - 3} more`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      <ReportPreviewDialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        report={report}
        execution={execution}
        onDownload={onDownload}
      />
    </>
  );
};