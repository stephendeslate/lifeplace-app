// Events Overview - Flat design matching Analytics page style

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  EventNote as EventIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday,
  Visibility as VisibilityIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useEvents, useEventTypes } from '../../hooks/useEvents';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import { EventForm } from '../../components/events/EventForm';
import { eventsApi } from '../../apis/events.api';
import type { Event, EventFilters, CreateEventData, EventStatus } from '../../types/events.types';
import { EVENT_STATUSES } from '../../types/events.types';
import { ModernPageLayout, ModernPageHeader, ModernEmptyState } from '../../components/common';

export const EventsOverview: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState<EventFilters>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchValue, setSearchValue] = useState('');

  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [] } = useActiveEventTypes();

  const {
    events = [],
    totalEvents,
    isLoadingEvents,
    createEvent,
    isCreatingEvent,
  } = useEvents({
    ...filters,
    page: page + 1,
    page_size: rowsPerPage,
  });

  // Get user's currency settings for proper formatting
  const { settings: currencySettings } = useCurrencySettings();

  // Format event price based on user's currency settings
  const formatEventPrice = (event: Event) => {
    if (!event.total_price) return null;
    
    // Events might have different currencies, but for now assume default currency
    // In the future, this should check event.currency field if it exists
    const currency = currencySettings?.defaultCurrency || 'PHP';
    
    return formatCurrency(event.total_price, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Events' },
    ]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchValue || undefined
      }));
      setPage(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // @ts-expect-error - Type compatibility issue requiring attention
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (event: Event) => {
    navigate(`/events/${event.id}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, eventItem: Event) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedEvent(eventItem);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedEvent(null);
  };

  const handleExport = async () => {
    try {
      const blob = await eventsApi.exportEvents(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleFilterChange = (key: keyof EventFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value === 'true' ? true : value === 'false' ? false : parseInt(value) || value
    }));
    setPage(0);
  };

  const getStatusColor = (status: EventStatus) => {
    switch (status) {
      case 'LEAD':
        return 'info';
      case 'CONFIRMED':
        return 'success';
      case 'COMPLETED':
        return 'default';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDateRange = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const startStr = start.toLocaleDateString() + ' ' + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (!endDate) {
      return startStr;
    }
    
    const end = new Date(endDate);
    const endStr = end.toLocaleDateString() + ' ' + end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Check if same day
    if (start.toDateString() === end.toDateString()) {
      return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `${startStr} - ${endStr}`;
  };


  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);
  const filteredCount = totalEvents || 0;

  if (isLoadingEvents) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </ModernPageLayout>
    );
  }

  return (
    <ModernPageLayout backgroundPattern="default">
        {/* Page Header - flat style */}
        <ModernPageHeader
          title="Events"
          subtitle={`${filteredCount} event${filteredCount !== 1 ? 's' : ''} found`}
          icon={<CalendarToday />}
          size="medium"
          primaryAction={{
            label: 'Add Event',
            icon: <AddIcon />,
            onClick: () => setCreateDialogOpen(true),
            variant: 'contained',
            color: 'primary',
          }}
          secondaryActions={[
            {
              label: 'Export',
              icon: <ExportIcon />,
              onClick: handleExport,
              variant: 'outlined',
            },
            {
              label: 'Refresh',
              icon: <RefreshIcon />,
              onClick: () => window.location.reload(),
              variant: 'outlined',
            },
          ]}
        />

        {events.length === 0 && !hasActiveFilters ? (
          <ModernEmptyState
            icon={EventIcon}
            title="No Events Yet"
            description="Transform your business with powerful event management. Create, track, and optimize your event workflows from lead to completion."
            primaryAction={{
              label: 'Create First Event',
              onClick: () => setCreateDialogOpen(true),
              icon: <AddIcon />,
              color: 'primary'
            }}
            secondaryAction={{
              label: 'Learn About Workflows',
              onClick: () => {},
              icon: <TimelineIcon />
            }}
            tip={{
              text: 'Link events to automated workflows to streamline your entire process from booking to completion',
              type: 'pro'
            }}
            size="medium"
          />
        ) : (
          <>
            {/* Filters - flat style */}
            <Box sx={{ mb: 3, p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder="Search events..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                  sx={{ flex: 1, minWidth: 200 }}
                />

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || 'all'}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    {EVENT_STATUSES.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={filters.event_type || 'all'}
                    label="Event Type"
                    onChange={(e) => handleFilterChange('event_type', String(e.target.value))}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {eventTypes.map((type) => (
                      <MenuItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {hasActiveFilters && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="warning"
                    onClick={() => {
                      setFilters({});
                      setSearchValue('');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Stack>
            </Box>

            {/* Events Table - flat style */}
            <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
              <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date & Time</TableCell>
                        <TableCell>Event</TableCell>
                        <TableCell>Client</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Workflow Progress</TableCell>
                        <TableCell>Current Task</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell width="50"></TableCell>
                      </TableRow>
                    </TableHead>
                <TableBody>
                  {Array.isArray(events) && events.map((event) => (
                    <TableRow 
                      key={event.id} 
                      hover 
                      className="table-row"
                      onClick={() => handleRowClick(event)}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {formatDateRange(event.start_date, event.end_date)}
                          </Typography>
                          {event.lead_source && (
                            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                              <TrendingUpIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {event.lead_source}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {event.name || 'Untitled Event'}
                          </Typography>
                          {event.total_price && (
                            <Typography variant="caption" color="text.secondary">
                              {formatEventPrice(event)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {event.client_name || 'Unknown Client'}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        {event.event_type_name ? (
                          <Chip
                            label={event.event_type_name}
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {typeof event.workflow_progress === 'number' && event.workflow_progress > 0 ? (
                          <Box sx={{ minWidth: 140 }}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="caption" color="text.secondary">
                                {event.current_stage_name || 'In Progress'}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={event.workflow_progress}
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 2,
                                },
                              }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {Math.round(event.workflow_progress)}% complete
                            </Typography>
                          </Box>
                        ) : event.workflow_template_name ? (
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {event.workflow_template_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Not started
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No workflow
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={EVENT_STATUSES.find(s => s.value === event.status)?.label || event.status}
                          color={getStatusColor(event.status)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, event)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  component="div"
                  count={totalEvents || 0}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Box>
        </>
      )}

        {/* Action Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={() => {
              if (selectedEvent) navigate(`/events/${selectedEvent.id}`);
              handleMenuClose();
            }}
          >
            <VisibilityIcon sx={{ mr: 1.5, fontSize: 18 }} />
            <Typography variant="body2" fontWeight={500}>View Event Details</Typography>
          </MenuItem>
        </Menu>

        {/* Create Event Dialog */}
        <Dialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create New Event</DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <EventForm
              onSubmit={(data) => {
                createEvent(data as CreateEventData, {
                  onSuccess: () => setCreateDialogOpen(false)
                });
              }}
              onCancel={() => setCreateDialogOpen(false)}
              isLoading={isCreatingEvent}
            />
          </DialogContent>
        </Dialog>
    </ModernPageLayout>
  );
};