// frontend/admin-crm/src/components/analytics/events/EventsTable.tsx

import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Collapse,
  Paper,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as UserIcon,
  Business as DomainIcon,
  Schedule as TimeIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import type { AnalyticsEvent } from '../../../types/analytics.types';

interface EventsTableProps {
  events: AnalyticsEvent[];
  isLoading?: boolean;
  onViewDetails?: (event: AnalyticsEvent) => void;
  pageSize?: number;
  showPagination?: boolean;
  maxHeight?: number | string;
}

interface EventTableRowProps {
  event: AnalyticsEvent;
  onViewDetails?: (event: AnalyticsEvent) => void;
}

const EventTableRow: React.FC<EventTableRowProps> = ({ 
  event, 
  onViewDetails,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'USER_ACTION': return 'primary';
      case 'SYSTEM_EVENT': return 'info';
      case 'BUSINESS_EVENT': return 'success';
      case 'ERROR_EVENT': return 'error';
      case 'PERFORMANCE': return 'warning';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const formatNumericValue = (value: number | null) => {
    if (value === null) return 'N/A';
    
    // Format large numbers with commas
    if (Math.abs(value) >= 1000) {
      return value.toLocaleString();
    }
    
    // Format decimals appropriately
    if (value % 1 !== 0) {
      return value.toFixed(2);
    }
    
    return value.toString();
  };

  const getEventDataPreview = () => {
    if (!event.event_data || Object.keys(event.event_data).length === 0) {
      return 'No additional data';
    }
    
    const preview = JSON.stringify(event.event_data);
    return preview.length > 100 ? `${preview.slice(0, 100)}...` : preview;
  };

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Box>
              <Typography variant="subtitle2" fontWeight="medium">
                {event.event_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTimestamp(event.event_timestamp)}
              </Typography>
            </Box>
          </Box>
        </TableCell>
        
        <TableCell>
          <Chip
            label={event.event_category.replace('_', ' ')}
            size="small"
            color={getCategoryColor(event.event_category) as any}
            variant="outlined"
          />
        </TableCell>
        
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            <UserIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {event.user_name || 'Anonymous'}
            </Typography>
          </Box>
        </TableCell>
        
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            <DomainIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {event.source_domain || 'N/A'}
            </Typography>
          </Box>
        </TableCell>
        
        <TableCell>
          <Typography variant="body2" fontWeight="medium">
            {formatNumericValue(event.numeric_value)}
          </Typography>
        </TableCell>
        
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {new Date(event.event_timestamp).toLocaleString()}
          </Typography>
        </TableCell>
        
        <TableCell align="right">
          {onViewDetails && (
            <Tooltip title="View details">
              <IconButton size="small" onClick={() => onViewDetails(event)}>
                <ViewIcon />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>
      
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Source Details
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Typography variant="body2" color="text.secondary">
                      Model: {event.source_model || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {event.source_id || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Session: {event.session_id?.slice(0, 8) || 'N/A'}...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      IP: {event.ip_address || 'N/A'}
                    </Typography>
                  </Stack>
                </Box>
                
                {Object.keys(event.event_data).length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Event Data Preview
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1, bgcolor: 'grey.50', maxHeight: 100, overflow: 'auto' }}>
                      <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                        {getEventDataPreview()}
                      </Typography>
                    </Paper>
                  </Box>
                )}
                
                {event.user_agent && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      User Agent
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        fontSize: '0.75rem',
                        wordBreak: 'break-word'
                      }}
                    >
                      {event.user_agent}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const LoadingEventRow: React.FC = () => (
  <TableRow>
    <TableCell>
      <Box display="flex" alignItems="center" gap={1}>
        <Skeleton variant="circular" width={24} height={24} />
        <Box>
          <Skeleton variant="text" width={120} height={20} />
          <Skeleton variant="text" width={80} height={16} />
        </Box>
      </Box>
    </TableCell>
    <TableCell>
      <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 1 }} />
    </TableCell>
    <TableCell>
      <Skeleton variant="text" width={80} height={20} />
    </TableCell>
    <TableCell>
      <Skeleton variant="text" width={60} height={20} />
    </TableCell>
    <TableCell>
      <Skeleton variant="text" width={40} height={20} />
    </TableCell>
    <TableCell>
      <Skeleton variant="text" width={120} height={20} />
    </TableCell>
    <TableCell align="right">
      <Skeleton variant="circular" width={32} height={32} />
    </TableCell>
  </TableRow>
);

export const EventsTable: React.FC<EventsTableProps> = ({
  events,
  isLoading = false,
  onViewDetails,
  pageSize = 25,
  showPagination = true,
  maxHeight = 600,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // @ts-ignore
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedEvents = showPagination 
    ? events.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : events;

  const tableHeaders = [
    'Event',
    'Category', 
    'User',
    'Domain',
    'Value',
    'Timestamp',
    'Actions'
  ];

  return (
    <Box>
      <TableContainer sx={{ maxHeight }}>
        <Table stickyHeader size="medium">
          <TableHead>
            <TableRow>
              {tableHeaders.map((header) => (
                <TableCell 
                  key={header}
                  align={header === 'Actions' ? 'right' : 'left'}
                  sx={{ 
                    fontWeight: 'bold',
                    backgroundColor: 'grey.50'
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              // Show loading rows
              Array.from({ length: Math.min(rowsPerPage, 10) }, (_, index) => (
                <LoadingEventRow key={index} />
              ))
            ) : paginatedEvents.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={tableHeaders.length} align="center" sx={{ py: 4 }}>
                  <Stack spacing={1} alignItems="center">
                    <TimeIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                    <Typography variant="h6" color="text.secondary">
                      No events found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No analytics events match your current filters
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              // Event rows
              paginatedEvents.map((event) => (
                <EventTableRow
                  key={event.id}
                  event={event}
                  onViewDetails={onViewDetails}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {showPagination && !isLoading && events.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={events.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          showFirstButton
          showLastButton
        />
      )}
    </Box>
  );
};