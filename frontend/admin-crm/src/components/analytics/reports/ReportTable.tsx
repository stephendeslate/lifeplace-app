// frontend/admin-crm/src/components/analytics/reports/ReportTable.tsx

import React from 'react';
import {
  Box,
  Chip,
  Typography,
} from '@mui/material';
import {
  PlayArrow as ExecuteIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';
import type { AnalyticsReport } from '../../../types/analytics.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState } from '../../common';
import type { ModernTableColumn, ModernTableAction } from '../../common';

interface ReportTableProps {
  reports: AnalyticsReport[];
  isLoading: boolean;
  onView: (report: AnalyticsReport) => void;
  onEdit: (report: AnalyticsReport) => void;
  onExecute: (report: AnalyticsReport) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  reports,
  isLoading,
  onView,
  onEdit,
  onExecute,
  onDelete,
}) => {
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

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, report: any) => (
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
      key: 'type',
      label: 'Type',
      render: (_, report: any) => (
        <Chip
          label={report.report_type.replace('_', ' ')}
          size="small"
          color={getReportTypeColor(report.report_type) as any}
          variant="outlined"
        />
      ),
    },
    {
      key: 'schedule',
      label: 'Schedule',
      render: (_, report: any) => (
        <Box display="flex" alignItems="center" gap={1}>
          <ScheduleIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {getScheduleText(report)}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'format',
      label: 'Format',
      render: (_, report: any) => (
        <Chip
          label={report.output_format}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      key: 'metrics',
      label: 'Metrics',
      render: (_, report: any) => (
        <Typography variant="body2">
          {report.metrics_count || 0} metric{(report.metrics_count || 0) !== 1 ? 's' : ''}
        </Typography>
      ),
    },
    {
      key: 'last_generated',
      label: 'Last Generated',
      render: (_, report: any) => (
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
      render: (_, report: any) => (
        <Chip
          label={report.is_active ? 'Active' : 'Inactive'}
          size="small"
          color={report.is_active ? 'success' : 'default'}
          variant={report.is_active ? 'filled' : 'outlined'}
        />
      ),
    },
  ];

  const actions: ModernTableAction[] = [
    {
      label: 'View',
      icon: <ViewIcon fontSize="small" />,
      onClick: onView,
    },
    {
      label: 'Execute Now',
      icon: <ExecuteIcon fontSize="small" />,
      onClick: onExecute,
    },
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: onEdit,
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: onDelete,
      color: 'error' as const,
    },
  ];

  if (isLoading) {
    return <ModernLoadingStates.table />;
  }

  if (reports.length === 0) {
    return (
      <ModernEmptyState
        icon={ReportIcon}
        title="No reports found"
        description="Set up your first analytics report to track business metrics over time and schedule automated delivery"
        tip={{ text: "Reports help you track trends and schedule regular insights", type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns}
      data={reports}
      actions={actions}
      onRowClick={onView}
      sortBy="name"
      sortOrder="asc"
    />
  );
};