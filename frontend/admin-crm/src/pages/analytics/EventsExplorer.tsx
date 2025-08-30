// frontend/admin-crm/src/pages/analytics/EventsExplorer.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { ModernTable, ModernEmptyState, type ModernTableColumn, type ModernTableAction } from '../../components/common';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Timeline as EventIcon,
  Info as InfoIcon,
  Person as UserIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useAnalyticsEvents } from '../../hooks/useAnalytics';
import type { AnalyticsEvent, EventFilters } from '../../types/analytics.types';

interface EventDetailsDialogProps {
  event: AnalyticsEvent | null;
  open: boolean;
  onClose: () => void;
}

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({ event, open, onClose }) => {
  if (!event) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <EventIcon />
          Event Details: {event.event_name}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          {/* Basic Info */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Event ID:</Typography>
                <Typography variant="body2" fontFamily="monospace">{event.id}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Event Name:</Typography>
                <Typography variant="body2">{event.event_name}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Category:</Typography>
                <Chip label={event.event_category} size="small" variant="outlined" />
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Timestamp:</Typography>
                <Typography variant="body2">{new Date(event.event_timestamp).toLocaleString()}</Typography>
              </Box>
            </Stack>
          </Box>

          {/* Source Info */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Source Information
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Domain:</Typography>
                <Typography variant="body2">{event.source_domain || 'N/A'}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Model:</Typography>
                <Typography variant="body2">{event.source_model || 'N/A'}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Source ID:</Typography>
                <Typography variant="body2">{event.source_id || 'N/A'}</Typography>
              </Box>
            </Stack>
          </Box>

          {/* User Info */}
          <Box>
            <Typography variant="h6" gutterBottom>
              User Information
            </Typography>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">User:</Typography>
                <Typography variant="body2">{event.user_name || 'Anonymous'}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Session ID:</Typography>
                <Typography variant="body2" fontFamily="monospace">{event.session_id || 'N/A'}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">IP Address:</Typography>
                <Typography variant="body2">{event.ip_address || 'N/A'}</Typography>
              </Box>
            </Stack>
          </Box>

          {/* Numeric Value */}
          {event.numeric_value !== null && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Numeric Value
              </Typography>
              <Typography variant="h4" color="primary">
                {event.numeric_value}
              </Typography>
            </Box>
          )}

          {/* Event Data */}
          {Object.keys(event.event_data).length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Event Data
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                  {JSON.stringify(event.event_data, null, 2)}
                </pre>
              </Paper>
            </Box>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};


export const EventsExplorer: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [filters, setFilters] = useState<EventFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AnalyticsEvent | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const {
    events,
    isLoadingEvents,
    refetchEvents,
  } = useAnalyticsEvents(filters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Analytics', path: '/analytics' },
      { label: 'Events Explorer' },
    ]);
  }, [setBreadcrumbs]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, search: query || undefined });
  };

  const handleCategoryFilter = (category: string) => {
    setFilters({ ...filters, event_category: category || undefined } as EventFilters);
  };

  const handleDomainFilter = (domain: string) => {
    setFilters({ ...filters, source_domain: domain || undefined });
  };

  const handleViewDetails = (event: AnalyticsEvent) => {
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedEvent(null);
    setDetailsDialogOpen(false);
  };

  // Helper function for category colors
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

  // Table columns for ModernTable
  const getTableColumns = (): ModernTableColumn<AnalyticsEvent>[] => [
    {
      key: 'event_name',
      label: 'Event',
      sortable: true,
      render: (_, event) => (
        <Box>
          <Typography variant="subtitle2" fontWeight="medium">
            {event.event_name}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
            {event.id}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'event_category',
      label: 'Category',
      render: (_, event) => (
        <Chip
          label={event.event_category}
          size="small"
          color={getCategoryColor(event.event_category) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
          variant="outlined"
        />
      ),
    },
    {
      key: 'source_domain',
      label: 'Domain',
      render: (_, event) => (
        <Typography variant="body2" color="text.secondary">
          {event.source_domain || 'N/A'}
        </Typography>
      ),
    },
    {
      key: 'user_name',
      label: 'User',
      render: (_, event) => (
        <Box display="flex" alignItems="center" gap={1}>
          <UserIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {event.user_name || 'Anonymous'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'numeric_value',
      label: 'Value',
      render: (_, event) => (
        event.numeric_value !== null ? (
          <Typography variant="body2" fontWeight="medium">
            {event.numeric_value}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            N/A
          </Typography>
        )
      ),
    },
    {
      key: 'event_timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (_, event) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(event.event_timestamp).toLocaleString()}
        </Typography>
      ),
    },
  ];

  // Table actions for ModernTable
  const getTableActions = (): ModernTableAction<AnalyticsEvent>[] => [
    {
      label: 'View Details',
      icon: <InfoIcon />,
      onClick: handleViewDetails,
      color: 'primary',
    },
  ];

  // Get unique values for filters
  const categories = Array.from(new Set(events.map(e => e.event_category))).filter(Boolean);
  const domains = Array.from(new Set(events.map(e => e.source_domain))).filter(Boolean);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Events Explorer
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse and analyze real-time analytics events across your application
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Tooltip title="Refresh events">
            <IconButton onClick={() => refetchEvents()} disabled={isLoadingEvents}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            placeholder="Search events..."
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
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.event_category || ''}
              label="Category"
              onChange={(e) => handleCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Domain</InputLabel>
            <Select
              value={filters.source_domain || ''}
              label="Domain"
              onChange={(e) => handleDomainFilter(e.target.value)}
            >
              <MenuItem value="">All Domains</MenuItem>
              {domains.map((domain) => (
                <MenuItem key={domain} value={domain}>
                  {domain}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Chip
            icon={<FilterIcon />}
            label={`${events.length} event${events.length !== 1 ? 's' : ''}`}
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Content */}
      <Paper variant="outlined">
        {isLoadingEvents ? (
          <LoadingTable />
        ) : events.length === 0 ? (
          <EmptyState
            icon={EventIcon}
            title="No events found"
            description={
              Object.keys(filters).length > 0
                ? "No events match your current filters. Try adjusting your search criteria."
                : "No analytics events have been recorded yet. Events will appear here as users interact with your application."
            }
          />
        ) : (
          <ModernTable
            columns={getTableColumns()}
            data={events}
            actions={getTableActions()}
            loading={isLoadingEvents}
            emptyState={
              <ModernEmptyState
                icon={EventIcon}
                title="No Events Found"
                description={
                  Object.keys(filters).length > 0
                    ? "No events match your current filters. Try adjusting your search criteria."
                    : "No analytics events have been recorded yet. Events will appear here as users interact with your application."
                }
                size="large"
                color="primary"
              />
            }
          />
        )}
      </Paper>

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={selectedEvent}
        open={detailsDialogOpen}
        onClose={handleCloseDetails}
      />
    </Box>
  );
};