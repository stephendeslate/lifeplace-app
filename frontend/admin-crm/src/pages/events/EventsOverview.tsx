// Modern Events Overview Page
// Completely modernized with ModernDesignSystem components and no animations

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
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  EventNote as EventIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday,
  Visibility as VisibilityIcon,
  Timeline as TimelineIcon,
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

// Modern Design System imports
import { 
  ModernOverviewLayout,
  ModernGlassCard,
  ModernOverviewHeader,
  createRefreshAction, 
  createExportAction, 
  createAddAction,
  ModernEmptyState,
  ModernLoadingSpinner
} from '../../components/common/ModernDesignSystem';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

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
      <ModernOverviewLayout>
        <ModernLoadingSpinner
          size={48}
          message="Loading events..."
          variant="circular"
          glass
        />
      </ModernOverviewLayout>
    );
  }

  return (
    <ModernOverviewLayout>
        {/* Modern Overview Header */}
        <ModernOverviewHeader
          title="Events"
          subtitle={`${filteredCount} event${filteredCount !== 1 ? 's' : ''} found`}
          icon={<CalendarToday />}
          primaryAction={createAddAction('Add Event', () => setCreateDialogOpen(true))}
          secondaryActions={[
            createRefreshAction(() => window.location.reload()),
            createExportAction(handleExport)
          ]}
          stats={[
            { label: 'Total Events', value: filteredCount },
            { 
              label: 'Confirmed', 
              value: events?.filter(e => e.status === 'CONFIRMED').length || 0
            },
            { 
              label: 'Leads', 
              value: events?.filter(e => e.status === 'LEAD').length || 0
            },
            {
              label: 'Completed',
              value: events?.filter(e => e.status === 'COMPLETED').length || 0
            }
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
            illustration="gradient"
          />
        ) : (
          <>
            {/* Modern Filters Card */}
            <ModernGlassCard 
              size="medium" 
              sx={{ 
                mb: 4,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}03 0%, ${tokens.color.success[500]}02 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="Search events..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    InputProps={{
                      startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                    }}
                    sx={{ 
                      flex: 1, 
                      minWidth: 200,
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        borderRadius: tokens.spacing.radius.full,
                        transition: 'all 0.2s ease-in-out',
                        
                        '&:hover': {
                          border: `1px solid ${tokens.color.primary[500]}40`,
                        },
                        
                        '&.Mui-focused': {
                          ...glassPresets.medium,
                          border: `1px solid ${tokens.color.primary[500]}60`,
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}10`,
                        }
                      }
                    }}
                  />
                  
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.status || 'all'}
                      label="Status"
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          ...glassPresets.light,
                          border: `1px solid ${tokens.color.borders.glass}`,
                          borderRadius: tokens.spacing.radius.lg,
                        }
                      }}
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
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          ...glassPresets.light,
                          border: `1px solid ${tokens.color.borders.glass}`,
                          borderRadius: tokens.spacing.radius.lg,
                        }
                      }}
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
                      sx={{
                        ...glassPresets.light,
                        border: `1px solid ${tokens.color.warning[500]}30`,
                        color: tokens.color.warning[600],
                        borderRadius: tokens.spacing.radius.full,
                        
                        '&:hover': {
                          ...glassPresets.medium,
                          border: `1px solid ${tokens.color.warning[500]}50`,
                        }
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Stack>
              </Box>
            </ModernGlassCard>

            {/* Modern Events Table Card */}
            <ModernGlassCard 
              size="medium"
              sx={{
                position: 'relative',
                overflow: 'hidden',
                
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}02 0%, ${tokens.color.success[500]}01 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <TableContainer 
                  sx={{
                    '& .MuiTable-root': {
                      '& .MuiTableHead-root': {
                        '& .MuiTableCell-head': {
                          backgroundColor: 'transparent',
                          borderBottom: `1px solid ${tokens.color.borders.glass}`,
                          fontWeight: 600,
                          color: tokens.color.neutral[700],
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          py: 2,
                        }
                      },
                      
                      '& .MuiTableBody-root': {
                        '& .MuiTableRow-root': {
                          transition: 'all 0.2s ease-in-out',
                          cursor: 'pointer',
                          
                          '&:hover': {
                            backgroundColor: `${tokens.color.primary[50]}40`,
                            transform: 'translateY(-1px)',
                            
                            '& .action-button': {
                              opacity: 1,
                              transform: 'scale(1)',
                            }
                          },
                          
                          '& .MuiTableCell-body': {
                            borderBottom: `1px solid ${tokens.color.borders.subtle}`,
                            py: 2,
                            fontSize: '0.875rem',
                          }
                        }
                      }
                    }
                  }}
                >
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
                          className="action-button"
                          sx={{
                            opacity: 0.7,
                            transform: 'scale(0.9)',
                            transition: 'all 0.2s ease-in-out',
                            
                            '&:hover': {
                              backgroundColor: `${tokens.color.primary[500]}10`,
                            }
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                  </Table>
                </TableContainer>
                
                <Box
                  sx={{
                    ...glassPresets.light,
                    borderTop: `1px solid ${tokens.color.borders.glass}`,
                  }}
                >
                  <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={totalEvents || 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                      '& .MuiTablePagination-toolbar': {
                        backgroundColor: 'transparent',
                      }
                    }}
                  />
                </Box>
              </Box>
            </ModernGlassCard>
        </>
      )}

          {/* Modern Action Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              ...glassPresets.strong,
              borderRadius: tokens.spacing.radius.xl,
              border: `1px solid ${tokens.color.borders.glass}`,
              boxShadow: tokens.shadow.glass.floating,
              minWidth: 200,
            }
          }}
        >
          <MenuItem 
            onClick={() => {
              if (selectedEvent) navigate(`/events/${selectedEvent.id}`);
              handleMenuClose();
            }}
            sx={{
              borderRadius: tokens.spacing.radius.lg,
              mx: 1,
              mb: 0.5,
              '&:hover': {
                backgroundColor: `${tokens.color.primary[500]}10`,
              }
            }}
          >
            <VisibilityIcon sx={{ mr: 1.5, fontSize: 18, color: tokens.color.primary[500] }} />
            <Typography variant="body2" fontWeight={500}>View Event Details</Typography>
          </MenuItem>
        </Menu>

          {/* Modern Create Event Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              ...glassPresets.strong,
              borderRadius: tokens.spacing.radius.xxl,
              border: `1px solid ${tokens.color.borders.glass}`,
              boxShadow: tokens.shadow.glass.floating,
            }
          }}
        >
          <DialogTitle 
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, transparent 100%)`,
              borderBottom: `1px solid ${tokens.color.borders.glass}`,
              fontWeight: 700,
              fontSize: '1.5rem',
            }}
          >
            Create New Event
          </DialogTitle>
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
    </ModernOverviewLayout>
  );
};