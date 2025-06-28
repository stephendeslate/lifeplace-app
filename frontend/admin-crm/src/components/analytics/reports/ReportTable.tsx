// frontend/admin-crm/src/components/analytics/reports/ReportTable.tsx

import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  PlayArrow as ExecuteIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import type { AnalyticsReport } from '../../../types/analytics.types';

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
  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading reports...</Typography>
      </Box>
    );
  }

  if (reports.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No reports found</Typography>
      </Box>
    );
  }

  return (
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
              onView={onView}
              onEdit={onEdit}
              onExecute={onExecute}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};