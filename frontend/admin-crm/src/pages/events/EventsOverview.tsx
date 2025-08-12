// frontend/admin-crm/src/pages/events/EventsOverview.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
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
  CircularProgress,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  FileDownload as ExportIcon,
  MoreVert as MoreVertIcon,
  EventNote as EventIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useEvents, useEventTypes } from '../../hooks/useEvents';
import { EventForm } from '../../components/events/EventForm';
import { eventsApi } from '../../apis/events.api';
import type { Event, EventFilters, CreateEventData, EventStatus } from '../../types/events.types';
import { EVENT_STATUSES } from '../../types/events.types';

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

  // @ts-ignore
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

  // Empty state when no events exist
  const renderNoEventsState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 6, 
        textAlign: 'center',
        bgcolor: 'grey.50',
        border: '2px dashed',
        borderColor: 'grey.300'
      }}
    >
      <EventIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        No Events Yet
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
        Start managing your events by creating your first event. Track progress, manage workflows, and keep everything organized.
      </Typography>
      
      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={() => setCreateDialogOpen(true)}
      >
        Create First Event
      </Button>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="body2" color="text.secondary">
        💡 <strong>Tip:</strong> Events can be linked to workflows to automate your process
      </Typography>
    </Paper>
  );

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);
  const filteredCount = totalEvents || 0;

  if (isLoadingEvents) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Events
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredCount} event{filteredCount !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Event
          </Button>
        </Stack>
      </Box>

      {events.length === 0 && !hasActiveFilters ? (
        renderNoEventsState()
      ) : (
        <>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
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
                
                <FormControl size="small" sx={{ minWidth: 130 }}>
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

                <FormControl size="small" sx={{ minWidth: 150 }}>
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
                    onClick={() => {
                      setFilters({});
                      setSearchValue('');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Events Table */}
          <Card>
            <TableContainer>
              <Table>
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
                      sx={{ cursor: 'pointer' }}
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
                              ${parseFloat(event.total_price).toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PersonIcon color="action" fontSize="small" />
                          <Typography variant="body2">
                            {event.client_name || 'Unknown Client'}
                          </Typography>
                        </Box>
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
                        {event.workflow_progress ? (
                          <Box sx={{ minWidth: 140 }}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <Typography variant="caption" color="text.secondary">
                                {event.workflow_progress.current_stage}/{event.workflow_progress.total_stages}
                              </Typography>
                              <Typography variant="caption" fontWeight="medium">
                                {event.workflow_progress.current_stage_name}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={event.workflow_progress.percentage}
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
                              {Math.round(event.workflow_progress.percentage)}% complete
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
                          {event.workflow_progress?.current_task_name || '-'}
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
          </Card>
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedEvent) navigate(`/events/${selectedEvent.id}`);
          handleMenuClose();
        }}>
          <EventIcon sx={{ mr: 1 }} />
          View Event
        </MenuItem>
      </Menu>

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
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
    </Box>
  );
};