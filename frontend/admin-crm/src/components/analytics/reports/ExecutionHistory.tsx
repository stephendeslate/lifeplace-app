// frontend/admin-crm/src/components/analytics/reports/ExecutionHistory.tsx

import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Alert,
  Card,
  CardContent,
  CardHeader,
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  PlayArrow as RunningIcon,
  Cancel as CancelledIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import type { ReportExecution } from '../../../types/analytics.types';

interface ExecutionHistoryProps {
  executions: ReportExecution[];
  isLoading: boolean;
  onView: (execution: ReportExecution) => void;
  onDownload?: (execution: ReportExecution) => void;
  onRefresh?: () => void;
  showRefresh?: boolean;
}

const ExecutionStatusChip: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { color: 'success' as const, icon: <SuccessIcon fontSize="small" /> };
      case 'RUNNING':
        return { color: 'info' as const, icon: <RunningIcon fontSize="small" /> };
      case 'PENDING':
        return { color: 'warning' as const, icon: <PendingIcon fontSize="small" /> };
      case 'FAILED':
        return { color: 'error' as const, icon: <ErrorIcon fontSize="small" /> };
      case 'CANCELLED':
        return { color: 'default' as const, icon: <CancelledIcon fontSize="small" /> };
      default:
        return { color: 'default' as const, icon: undefined };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <Chip
      label={status}
      size="small"
      color={config.color}
      variant={status === 'COMPLETED' ? 'filled' : 'outlined'}
      icon={config.icon}
    />
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

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getProgress = (): number | undefined => {
    if (execution.status === 'RUNNING') {
      // For running executions, we can estimate progress based on elapsed time
      // This is a simplified approach - real implementation might have actual progress data
      if (execution.started_at) {
        const startTime = new Date(execution.started_at).getTime();
        const now = Date.now();
        const elapsed = (now - startTime) / 1000; // seconds
        
        // Assume average execution time is 60 seconds, show progress up to 90%
        const estimatedProgress = Math.min((elapsed / 60) * 90, 90);
        return estimatedProgress;
      }
    }
    return undefined;
  };

  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontFamily="monospace">
          {execution.execution_id.slice(0, 8)}...
        </Typography>
      </TableCell>
      
      <TableCell>
        <Box>
          <ExecutionStatusChip status={execution.status} />
          {execution.status === 'RUNNING' && (
            <Box sx={{ mt: 1, minWidth: 100 }}>
              <LinearProgress 
                variant="determinate" 
                value={getProgress()} 
              />
            </Box>
          )}
        </Box>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {formatDateTime(execution.started_at)}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {execution.status === 'RUNNING' 
            ? 'In progress...' 
            : formatDateTime(execution.completed_at)
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
              <ViewIcon />
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

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({
  executions,
  isLoading,
  onView,
  onDownload,
  onRefresh,
  showRefresh = true,
}) => {

  const getExecutionSummary = () => {
    const total = executions.length;
    const completed = executions.filter(e => e.status === 'COMPLETED').length;
    const failed = executions.filter(e => e.status === 'FAILED').length;
    const running = executions.filter(e => e.status === 'RUNNING').length;
    
    return { total, completed, failed, running };
  };

  const summary = getExecutionSummary();

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" p={3}>
            <Typography>Loading execution history...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        avatar={<HistoryIcon />}
        title="Execution History"
        subheader={`${summary.total} total executions`}
        action={
          showRefresh && onRefresh && (
            <Tooltip title="Refresh">
              <IconButton onClick={onRefresh} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )
        }
      />
      
      <CardContent>
        {/* Summary Stats */}
        {executions.length > 0 && (
          <Box mb={3}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip
                label={`${summary.completed} Completed`}
                size="small"
                color="success"
                variant="outlined"
              />
              {summary.failed > 0 && (
                <Chip
                  label={`${summary.failed} Failed`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              )}
              {summary.running > 0 && (
                <Chip
                  label={`${summary.running} Running`}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        )}

        {/* Executions Table */}
        {executions.length === 0 ? (
          <Alert severity="info">
            No executions found. This report hasn't been run yet.
          </Alert>
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
                    onView={onView}
                    onDownload={onDownload}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Running Executions Alert */}
        {summary.running > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              {summary.running} execution{summary.running > 1 ? 's' : ''} currently running. 
              This page will automatically refresh to show updates.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};