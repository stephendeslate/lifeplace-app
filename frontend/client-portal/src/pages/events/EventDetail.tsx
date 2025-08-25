// frontend/client-portal/src/pages/events/EventDetail.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Breadcrumbs,
  Link,
  IconButton,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Skeleton,
  Alert,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Share as ShareIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Folder as DocumentsIcon,
  Task as TasksIcon,
  Note as NotesIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useEvents } from '../../hooks/useEvents';
import { 
  EventStatusBadge, 
  EventCountdown, 
  EventTimeline, 
  EventDocuments, 
  EventTasks 
} from '../../components/events';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`event-tabpanel-${index}`}
      aria-labelledby={`event-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);
  const [preferencesData, setPreferencesData] = useState<Record<string, unknown>>({});

  // Data fetching
  const eventId = parseInt(id || '0');
  const { useEvent, useEventNotes, useUpdatePreferences } = useEvents();
  
  const { 
    data: event, 
    isLoading: isLoadingEvent, 
    error: eventError 
  } = useEvent(eventId);
  
  const { 
    data: notes = [], 
    isLoading: isLoadingNotes 
  } = useEventNotes(eventId);

  // Mutations
  const updatePreferencesMutation = useUpdatePreferences();

  // Event handlers
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBack = () => {
    navigate('/events');
  };

  const handlePreferencesOpen = () => {
    if (event?.preferences) {
      setPreferencesData(event.preferences);
    }
    setPreferencesDialogOpen(true);
  };

  const handlePreferencesClose = () => {
    setPreferencesDialogOpen(false);
    setPreferencesData({});
  };

  const handlePreferencesSave = async () => {
    await updatePreferencesMutation.mutateAsync({
      id: eventId,
      data: { preferences: preferencesData },
    });
    handlePreferencesClose();
  };

  const handlePreferenceChange = (key: string, value: unknown) => {
    setPreferencesData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Loading state
  if (isLoadingEvent) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="rectangular" height={200} />
          <Skeleton variant="text" width="100%" height={48} />
          <Skeleton variant="rectangular" height={400} />
        </Stack>
      </Box>
    );
  }

  // Error state
  if (eventError || !event) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {eventError ? 'Unable to load event details.' : 'Event not found.'}
        </Alert>
        <Button startIcon={<BackIcon />} onClick={handleBack}>
          Back to Events
        </Button>
      </Box>
    );
  }

  const eventDate = event.start_date ? new Date(event.start_date) : null;
  const endDate = event.end_date ? new Date(event.end_date) : null;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={handleBack}
          sx={{ textDecoration: 'none' }}
        >
          Events
        </Link>
        <Typography variant="body2" color="text.primary">
          {event.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={3}
        >
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <IconButton
                onClick={handleBack}
                size="small"
                aria-label="Back to events"
              >
                <BackIcon />
              </IconButton>
              <Typography variant="h4" component="h1">
                {event.name}
              </Typography>
            </Stack>
            
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {event.event_type_name}
            </Typography>

            <Stack direction="row" spacing={2} flexWrap="wrap" gap={1} mb={2}>
              <EventStatusBadge status={event.status} />
              {event.payment_status && (
                <Chip
                  icon={<PaymentIcon fontSize="small" />}
                  label={event.payment_status.replace('_', ' ')}
                  color={
                    event.payment_status === 'PAID' ? 'success' :
                    event.payment_status === 'OVERDUE' ? 'error' :
                    event.payment_status === 'PARTIAL' ? 'warning' :
                    'default'
                  }
                  variant="outlined"
                />
              )}
            </Stack>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {eventDate && (
                <Box sx={(theme) => ({
                  flexGrow: 0,
                  flexBasis: { xs: '100%', sm: `calc(50% - ${theme.spacing(1)})` },
                })}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body1">
                      {format(eventDate, 'EEEE, MMMM dd, yyyy')}
                      {endDate && eventDate.getTime() !== endDate.getTime() && 
                        ` - ${format(endDate, 'MMMM dd, yyyy')}`
                      }
                    </Typography>
                  </Stack>
                </Box>
              )}
              
              {event.current_stage && (
                <Box sx={(theme) => ({
                  flexGrow: 0,
                  flexBasis: { xs: '100%', sm: `calc(50% - ${theme.spacing(1)})` },
                })}>
                  <Typography variant="body1">
                    <strong>Current Stage:</strong> {event.current_stage.name}
                  </Typography>
                </Box>
              )}
              
              {event.total_price && (
                <Box sx={(theme) => ({
                  flexGrow: 0,
                  flexBasis: { xs: '100%', sm: `calc(50% - ${theme.spacing(1)})` },
                })}>
                  <Typography variant="body1">
                    <strong>Total Price:</strong> ${event.total_price.toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Stack spacing={2} alignItems="center">
            {event.days_until_event !== null && event.days_until_event !== undefined && (
              <EventCountdown daysUntil={event.days_until_event} />
            )}
            
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={handlePreferencesOpen}
                size="small"
              >
                Preferences
              </Button>
              <IconButton
                aria-label="Share event"
                size="small"
              >
                <ShareIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* Quick Stats */}
      {(event.upcoming_tasks.length > 0 || event.accessible_documents_count > 0 || event.has_notes) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {event.upcoming_tasks.length > 0 && (
            <Box sx={(theme) => ({
              flexGrow: 0,
              flexBasis: { xs: '100%', sm: `calc(33.333% - ${theme.spacing(4/3)})` },
            })}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {event.upcoming_tasks.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upcoming Tasks
                </Typography>
              </Paper>
            </Box>
          )}
          
          {event.accessible_documents_count > 0 && (
            <Box sx={(theme) => ({
              flexGrow: 0,
              flexBasis: { xs: '100%', sm: `calc(33.333% - ${theme.spacing(4/3)})` },
            })}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {event.accessible_documents_count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documents
                </Typography>
              </Paper>
            </Box>
          )}
          
          {event.has_notes && (
            <Box sx={(theme) => ({
              flexGrow: 0,
              flexBasis: { xs: '100%', sm: `calc(33.333% - ${theme.spacing(4/3)})` },
            })}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {notes.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Notes
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label="Timeline" 
            icon={<TimelineIcon />} 
            iconPosition="start"
            id="event-tab-0"
            aria-controls="event-tabpanel-0"
          />
          <Tab 
            label={`Documents (${event.accessible_documents_count})`}
            icon={<DocumentsIcon />} 
            iconPosition="start"
            id="event-tab-1"
            aria-controls="event-tabpanel-1"
          />
          <Tab 
            label={`Tasks (${event.upcoming_tasks.length})`}
            icon={<TasksIcon />} 
            iconPosition="start"
            id="event-tab-2"
            aria-controls="event-tabpanel-2"
          />
          {event.has_notes && (
            <Tab 
              label={`Notes (${notes.length})`}
              icon={<NotesIcon />} 
              iconPosition="start"
              id="event-tab-3"
              aria-controls="event-tabpanel-3"
            />
          )}
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <EventTimeline eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <EventDocuments eventId={eventId} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <EventTasks tasks={event.upcoming_tasks} />
        </TabPanel>

        {event.has_notes && (
          <TabPanel value={activeTab} index={3}>
            {isLoadingNotes ? (
              <Box>
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} variant="rectangular" height={100} sx={{ mb: 2 }} />
                ))}
              </Box>
            ) : (
              <Stack spacing={2}>
                {notes.map((note) => (
                  <Paper key={note.id} sx={{ p: 2 }}>
                    <Typography variant="body1" paragraph>
                      {note.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(note.created_at), 'MMM dd, yyyy at h:mm a')}
                      {note.created_by && ` • ${note.created_by}`}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </TabPanel>
        )}
      </Paper>

      {/* Preferences Dialog */}
      <Dialog
        open={preferencesDialogOpen}
        onClose={handlePreferencesClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Event Preferences</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Update your preferences for this event. These settings help us tailor the experience to your needs.
          </Typography>
          
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Special Requests"
              multiline
              rows={3}
              value={(preferencesData.special_requests as string) || ''}
              onChange={(e) => handlePreferenceChange('special_requests', e.target.value)}
              placeholder="Any special requests or requirements..."
              fullWidth
            />
            
            <TextField
              label="Dietary Restrictions"
              value={(preferencesData.dietary_restrictions as string) || ''}
              onChange={(e) => handlePreferenceChange('dietary_restrictions', e.target.value)}
              placeholder="Allergies, dietary preferences, etc."
              fullWidth
            />
            
            <TextField
              label="Communication Preferences"
              value={(preferencesData.communication_preferences as string) || ''}
              onChange={(e) => handlePreferenceChange('communication_preferences', e.target.value)}
              placeholder="Preferred contact method, frequency, etc."
              fullWidth
            />
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handlePreferencesClose}>Cancel</Button>
          <Button
            onClick={handlePreferencesSave}
            variant="contained"
            disabled={updatePreferencesMutation.isPending}
          >
            Save Preferences
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventDetail;