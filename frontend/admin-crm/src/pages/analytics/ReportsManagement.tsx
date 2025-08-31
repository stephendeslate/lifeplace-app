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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
} from '@mui/material';
import { ModernTable, ModernEmptyState, TableSkeleton, type ModernTableColumn, type ModernTableAction } from '../../components/common';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
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
import type { AnalyticsReport, AnalyticsReportFilters } from '../../types/analytics.types';


export const ReportsManagement: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState<AnalyticsReportFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const {
    reports,
    isLoadingReports,
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
    // TODO: Implement edit functionality
    console.log('Edit report:', report);
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

  // Helper functions for table rendering
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

  // Table columns for ModernTable
  const getTableColumns = (): ModernTableColumn<AnalyticsReport>[] => [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, report) => (
        <Box>
          <Typography variant="subtitle2" fontWeight="medium">
            {report.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {report.description || 'No description'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'report_type',
      label: 'Type',
      render: (_, report) => (
        <Chip
          label={report.report_type.replace('_', ' ')}
          size="small"
          color={getReportTypeColor(report.report_type) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
          variant="outlined"
        />
      ),
    },
    {
      key: 'schedule',
      label: 'Schedule',
      render: (_, report) => (
        <Box display="flex" alignItems="center" gap={1}>
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {getScheduleText(report)}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'output_format',
      label: 'Format',
      render: (_, report) => (
        <Chip
          label={report.output_format}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      key: 'metrics_count',
      label: 'Metrics',
      render: (_, report) => (
        <Typography variant="body2">
          {report.metrics_count || 0} metric{(report.metrics_count || 0) !== 1 ? 's' : ''}
        </Typography>
      ),
    },
    {
      key: 'last_generated',
      label: 'Last Generated',
      render: (_, report) => (
        <Typography variant="body2" color="text.secondary">
          {report.last_generated 
            ? new Date(report.last_generated).toLocaleDateString()
            : 'Never'
          }
        </Typography>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, report) => (
        <Chip
          label={report.is_active ? 'Active' : 'Inactive'}
          size="small"
          color={report.is_active ? 'success' : 'default'}
          variant={report.is_active ? 'filled' : 'outlined'}
        />
      ),
    },
  ];

  // Table actions for ModernTable
  const getTableActions = (): ModernTableAction<AnalyticsReport>[] => [
    {
      label: 'View Report',
      icon: <ViewIcon />,
      onClick: handleView,
      color: 'primary',
    },
    {
      label: 'Execute Report',
      icon: <ExecuteIcon />,
      onClick: handleExecute,
      color: 'default',
    },
    {
      label: 'Edit Report',
      icon: <EditIcon />,
      onClick: handleEdit,
      color: 'default',
    },
    {
      label: 'Delete Report',
      icon: <DeleteIcon />,
      onClick: (report) => handleDelete(report.id),
      color: 'error',
    },
  ];

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
          <TableSkeleton />
        ) : reports.length === 0 ? (
          <ModernEmptyState
            icon={ReportIcon}
            title="No reports found"
            description={
              Object.keys(filters).length > 0
                ? "No reports match your current filters. Try adjusting your search criteria."
                : "Get started by creating your first analytics report to track business metrics over time."
            }
            primaryAction={
              Object.keys(filters).length === 0 ? {
                label: 'Create First Report',
                onClick: () => setShowCreateDialog(true),
                icon: <AddIcon />,
                color: 'primary' as const
              } : undefined
            }
          />
        ) : (
          <ModernTable
            columns={getTableColumns() as unknown as ModernTableColumn<Record<string, unknown>>[]}
            data={reports as unknown as Record<string, unknown>[]}
            actions={getTableActions() as unknown as ModernTableAction<Record<string, unknown>>[]}
            loading={isLoadingReports}
            emptyState={
              <ModernEmptyState
                icon={ReportIcon}
                title="No Reports Found"
                description={
                  Object.keys(filters).length > 0
                    ? "No reports match your current filters. Try adjusting your search criteria."
                    : "Create your first analytics report to start generating insights from your business data."
                }
                size="large"
                color="primary"
                primaryAction={{
                  label: "Create First Report",
                  onClick: () => setShowCreateDialog(true),
                  icon: <AddIcon />,
                  color: 'primary'
                }}
              />
            }
          />
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