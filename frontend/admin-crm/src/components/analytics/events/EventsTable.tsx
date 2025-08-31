// Modern EventsTable component with ModernDesignSystem

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
import { ModernCard } from '../../common/ModernCard';
import { ModernEmptyState } from '../../common/ModernEmptyState';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

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
      <TableRow 
        hover 
        sx={{ 
          '& > *': { borderBottom: 'unset' },
          '&:hover': {
            backgroundColor: `${tokens.color.primary[500]}08`,
          }
        }}
      >
        <TableCell>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{
                color: tokens.color.primary[500],
                '&:hover': {
                  backgroundColor: `${tokens.color.primary[500]}15`,
                }
              }}
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
            color={getCategoryColor(event.event_category) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
            variant="outlined"
            sx={{
              borderRadius: tokens.spacing.radius.full,
              fontWeight: 500,
            }}
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
                <ModernCard
                  variant="glass"
                  sx={{
                    p: 2,
                    border: `1px solid ${tokens.color.borders.glass}`,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom fontWeight={600} color={tokens.color.neutral[700]}>
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
                </ModernCard>
                
                {Object.keys(event.event_data).length > 0 && (
                  <ModernCard
                    variant="outlined"
                    sx={{
                      p: 2,
                      border: `1px solid ${tokens.color.borders.subtle}`,
                      backgroundColor: `${tokens.color.neutral[50]}50`,
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom fontWeight={600} color={tokens.color.neutral[700]}>
                      Event Data Preview
                    </Typography>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: tokens.spacing.radius.lg,
                      backgroundColor: `${tokens.color.neutral[100]}80`,
                      border: `1px solid ${tokens.color.borders.subtle}`,
                      maxHeight: 100, 
                      overflow: 'auto' 
                    }}>
                      <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                        {getEventDataPreview()}
                      </Typography>
                    </Box>
                  </ModernCard>
                )}
                
                {event.user_agent && (
                  <ModernCard
                    variant="outlined"
                    sx={{
                      p: 2,
                      border: `1px solid ${tokens.color.borders.subtle}`,
                      backgroundColor: `${tokens.color.neutral[50]}30`,
                    }}
                  >
                    <Typography variant="subtitle2" gutterBottom fontWeight={600} color={tokens.color.neutral[700]}>
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
                  </ModernCard>
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

  // @ts-expect-error - Type compatibility issue requiring attention
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
    <ModernCard variant="glass" sx={{ overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight }}>
        <Table stickyHeader size="medium">
          <TableHead>
            <TableRow>
              {tableHeaders.map((header) => (
                <TableCell 
                  key={header}
                  align={header === 'Actions' ? 'right' : 'left'}
                  sx={{ 
                    fontWeight: 700,
                    color: tokens.color.neutral[700],
                    backgroundColor: `${tokens.color.neutral[50]}80`,
                    borderBottom: `2px solid ${tokens.color.borders.subtle}`,
                    fontSize: '0.875rem',
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
                <TableCell colSpan={tableHeaders.length} align="center" sx={{ py: 6 }}>
                  <ModernEmptyState
                    icon={TimeIcon}
                    title="No Events Found"
                    description="No analytics events match your current filters. Try adjusting your search criteria."
                    size="small"
                    illustration="minimal"
                  />
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
        <Box
          sx={{
            ...glassPresets.light,
            borderTop: `1px solid ${tokens.color.borders.glass}`,
          }}
        >
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
            sx={{
              '& .MuiTablePagination-toolbar': {
                backgroundColor: 'transparent',
              }
            }}
          />
        </Box>
      )}
    </ModernCard>
  );
};