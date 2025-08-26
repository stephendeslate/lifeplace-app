// frontend/admin-crm/src/pages/analytics/ReportsManagement.tsx

import React, { useEffect, useState } from 'react';
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
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as ExecuteIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as ReportIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useAnalyticsReports } from '../../hooks/useAnalytics';
import { LoadingTable } from '../../components/common/LoadingTable';
import { EmptyState } from '../../components/common/EmptyState';
import type { AnalyticsReport, AnalyticsReportFilters } from '../../types/analytics.types';

interface ReportRowActionsProps {
  report: AnalyticsReport;
  onView: (report: AnalyticsReport) => void;
  onEdit: (report: AnalyticsReport) => void;
  onExecute: (report: AnalyticsReport) => void;
  onDelete: (id: number) => void;
}

const ReportRowActions: React.FC<ReportRowActionsProps> = ({
  report,
  onView,
  onEdit,
  onExecute,
  onDelete,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleView = () => {
    onView(report);
    handleClose();
  };

  const handleEdit = () => {
    onEdit(report);
    handleClose();
  };

  const handleExecute = () => {
    onExecute(report);
    handleClose();
  };

  const handleDelete = () => {
    onDelete(report.id);
    handleClose();
  };

  return (
    <>
      <IconButton size="small" onClick={handleClick}>
        <MoreVertIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleView}>
          <ViewIcon sx={{ mr: 1 }} fontSize="small" />
          View
        </MenuItem>
        <MenuItem onClick={handleExecute}>
          <ExecuteIcon sx={{ mr: 1 }} fontSize="small" />
          Execute Now
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </>
  );
};

interface ReportTableRowProps {
  report: AnalyticsReport;
  onView: (report: AnalyticsReport) => void;
  onEdit: (report: AnalyticsReport) => void;
  onExecute: (report: AnalyticsReport) => void;
  onDelete: (id: number) => void;
}

const ReportTableRow: React.FC<ReportTableRowProps> = ({
  report,
  onView,
  onEdit,
  onExecute,
  onDelete,
}) => {
  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'BUSINESS_SUMMARY':
        return 'primary';
      case 'FINANCIAL':
        return 'success';
      case 'BOOKING_PERFORMANCE':
        return 'info';
      case 'CLIENT_ANALYSIS':
        return 'warning';
      case 'WORKFLOW_EFFICIENCY':
        return 'secondary';
      case 'PAYMENT_ANALYSIS':
        return 'success';
      default:
        return 'default';
    }
  };

  const getScheduleText = (report: AnalyticsReport) => {
    if (report.schedule_frequency === 'MANUAL') {
      return 'Manual';
    }
    
    let text = report.schedule_frequency.toLowerCase();
    
    if (report.schedule_time) {
      text += ` at ${report.schedule_time}`;
    }
    
    if (report.schedule_frequency === 'WEEKLY' && report.schedule_day_of_week !== null) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      text += ` (${days[report.schedule_day_of_week]})`;
    }
    
    if (report.schedule_frequency === 'MONTHLY' && report.schedule_day_of_month) {
      text += ` (${report.schedule_day_of_month}${getOrdinalSuffix(report.schedule_day_of_month)})`;
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

  return (
    <TableRow hover>
      <TableCell>
        <Box>
          <Typography variant="subtitle2" fontWeight="medium">
            {report.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {report.description || 'No description'}
          </Typography>
        </Box>
      </TableCell>
      
      <TableCell>
        <Chip
          label={report.report_type.replace('_', ' ')}
          size="small"
          color={getReportTypeColor(report.report_type) as any}
          variant="outlined"
        />
      </TableCell>
      
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {getScheduleText(report)}
          </Typography>
        </Box>
      </TableCell>
      
      <TableCell>
        <Chip
          label={report.output_format}
          size="small"
          variant="outlined"
        />
      </TableCell>
      
      <TableCell>
        <Typography variant="body2">
          {report.metrics_count || 0} metric{(report.metrics_count || 0) !== 1 ? 's' : ''}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {report.last_generated 
            ? new Date(report.last_generated).toLocaleDateString()
            : 'Never'
          }
        </Typography>
      </TableCell>
      
      <TableCell>
        <Chip
          label={report.is_active ? 'Active' : 'Inactive'}
          size="small"
          color={report.is_active ? 'success' : 'default'}
          variant={report.is_active ? 'filled' : 'outlined'}
        />
      </TableCell>
      
      <TableCell align="right">
        <ReportRowActions
          report={report}
          onView={onView}
          onEdit={onEdit}
          onExecute={onExecute}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
};

export const ReportsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<AnalyticsReport | null>(null);
  const [filters, setFilters] = useState<AnalyticsReportFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const {
    reports,
    isLoadingReports,
    createReport,
    updateReport,
    deleteReport,
    executeReport,
    refetchReports,
    isCreatingReport,
    isDeletingReport,
    isExecutingReport,
  } = useAnalyticsReports(filters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Analytics', path: '/analytics' },
      { label: 'Reports' },
    ]);
  }, [setBreadcrumbs]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  const handleTypeFilter = (type: string) => {
    setFilters({ ...filters, report_type: type || undefined } as AnalyticsReportFilters);
  };

  const handleActiveFilter = (isActive: string) => {
    setFilters({ 
      ...filters, 
      is_active: isActive === 'all' ? undefined : isActive === 'true' 
    });
  };

  const handleView = (report: AnalyticsReport) => {
    navigate(`/analytics/reports/${report.id}`);
  };

  const handleEdit = (report: AnalyticsReport) => {
    setEditingReport(report);
    setShowCreateDialog(true);
  };

  const handleExecute = (report: AnalyticsReport) => {
    executeReport({ id: report.id, request: {} });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      deleteReport(id);
    }
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setEditingReport(null);
  };


  // Get unique report types for filter
  const reportTypes = ['BUSINESS_SUMMARY', 'FINANCIAL', 'BOOKING_PERFORMANCE', 'CLIENT_ANALYSIS', 'WORKFLOW_EFFICIENCY', 'PAYMENT_ANALYSIS', 'CUSTOM'];

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Analytics Reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create, schedule, and manage automated analytics reports
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Tooltip title="Refresh reports">
            <IconButton onClick={() => refetchReports()} disabled={isLoadingReports}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateDialog(true)}
            disabled={isCreatingReport}
          >
            Create Report
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search reports..."
            size="small"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={filters.report_type || ''}
              label="Report Type"
              onChange={(e) => handleTypeFilter(e.target.value)}
            >
              <MenuItem value="">All Types</MenuItem>
              {reportTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.is_active === undefined ? 'all' : filters.is_active ? 'true' : 'false'}
              label="Status"
              onChange={(e) => handleActiveFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>

          <Chip
            icon={<FilterIcon />}
            label={`${reports.length} report${reports.length !== 1 ? 's' : ''}`}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Content */}
      <Paper variant="outlined">
        {isLoadingReports ? (
          <LoadingTable />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={ReportIcon}
            title="No reports found"
            description={
              Object.keys(filters).length > 0
                ? "No reports match your current filters. Try adjusting your search criteria."
                : "Get started by creating your first analytics report to track business metrics over time."
            }
            action={
              Object.keys(filters).length === 0 && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setShowCreateDialog(true)}
                >
                  Create First Report
                </Button>
              )
            }
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Metrics</TableCell>
                  <TableCell>Last Generated</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => (
                  <ReportTableRow
                    key={report.id}
                    report={report}
                    onView={handleView}
                    onEdit={handleEdit}
                    onExecute={handleExecute}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Status Messages */}
      {isDeletingReport && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Deleting report...
        </Alert>
      )}

      {isExecutingReport && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Executing report...
        </Alert>
      )}

      {/* TODO: Add ReportFormDialog component */}
      {showCreateDialog && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Report form dialog not yet implemented. Coming soon!
        </Alert>
      )}
    </Box>
  );
};