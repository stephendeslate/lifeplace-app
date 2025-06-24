// frontend/admin-crm/src/pages/events/EventProfile.tsx

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Tab,
  Tabs
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  EventNote as EventNoteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Message as MessageIcon,
  Description as ContractIcon,
  Receipt as QuoteIcon,
  Payment as InvoiceIcon,
  Assignment as QuestionnaireIcon,
  Folder as FilesIcon,
  Note as NoteIcon,
  AccountTree as WorkflowIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useEvents } from '../../hooks/useEvents';
import { useClients } from '../../hooks/useClients';
import { EventForm } from '../../components/events/EventForm';
import { WorkflowProgress } from '../../components/events/WorkflowProgress';
import { EVENT_STATUSES } from '../../types/events.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

export const EventProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Hooks
  const { 
    useEvent,
    updateEvent,
    isUpdatingEvent,
    deleteEvent,
    isDeletingEvent
  } = useEvents();
  
  const { useClient } = useClients();
  
  const eventId = parseInt(id || '0');
  const { data: event, isLoading, error, refetch } = useEvent(eventId);
  
  // Extract client ID - handle both serialized forms
  const clientId = useMemo(() => {
    if (!event?.client) return 0;
    // Handle if client is already an ID number
    if (typeof event.client === 'number') return event.client;
    // Handle if client is an object with id
    if (typeof event.client === 'object' && event.client !== null && 'id' in event.client) {
      return (event.client as { id: number }).id || 0;
    }
    return 0;
  }, [event?.client]);
  
  const { data: client } = useClient(clientId);

  useEffect(() => {
    if (event) {
      setBreadcrumbs([
        { label: 'Events', path: '/events' },
        { label: event.name || `Event #${event.id}` },
      ]);
    }
  }, [event, setBreadcrumbs]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditEvent = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteEvent = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleEdit = (data: any) => {
    updateEvent(
      { id: eventId, data },
      { 
        onSuccess: () => {
          setEditDialogOpen(false);
          refetch(); // Refetch to get updated data
        }
      }
    );
  };

  const handleDelete = () => {
    deleteEvent(eventId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        navigate('/events');
      }
    });
  };

  const getStatusColor = (status: string) => {
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
    const startStr = start.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (!endDate) {
      return startStr;
    }
    
    const end = new Date(endDate);
    
    // Check if same day
    if (start.toDateString() === end.toDateString()) {
      return `${start.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      })} from ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `${startStr} to ${end.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/events')}
          sx={{ mb: 2 }}
        >
          Back to Events
        </Button>
        <Alert severity="error">
          {error ? 'Failed to load event information' : 'Event not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/events')}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {event.name || 'Untitled Event'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {event.event_type_name || 'No event type'}
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {/* Status Chip */}
          <Chip
            label={EVENT_STATUSES.find(s => s.value === event.status)?.label || event.status}
            color={getStatusColor(event.status)}
            variant="filled"
          />

          {/* More Actions Menu */}
          <IconButton onClick={handleMenuClick}>
            <MoreVertIcon />
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleEditEvent}>
              <ListItemIcon>
                <EditIcon />
              </ListItemIcon>
              <ListItemText>Edit Event</ListItemText>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleDeleteEvent} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <DeleteIcon color="error" />
              </ListItemIcon>
              <ListItemText>Delete Event</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Event Overview Cards */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          mb: 3
        }}
      >
        {/* Client Info */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6">Client Information</Typography>
                </Box>
                
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Client Name
                    </Typography>
                    <Typography variant="body1">
                      {event.client_name || 'Unknown Client'}
                    </Typography>
                  </Box>
                  
                  {client?.email && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Email
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <EmailIcon color="action" fontSize="small" />
                        <Typography variant="body2">{client.email}</Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {client?.profile?.phone && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Phone
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PhoneIcon color="action" fontSize="small" />
                        <Typography variant="body2">{client.profile.phone}</Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {client?.profile?.company && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Company
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <BusinessIcon color="action" fontSize="small" />
                        <Typography variant="body2">{client.profile.company}</Typography>
                      </Box>
                    </Box>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Event Info */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <EventNoteIcon color="primary" />
                  <Typography variant="h6">Event Details</Typography>
                </Box>
                
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Date & Time
                    </Typography>
                    <Typography variant="body2">
                      {formatDateRange(event.start_date, event.end_date)}
                    </Typography>
                  </Box>
                  
                  {event.total_price && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Price
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <MoneyIcon color="action" fontSize="small" />
                        <Typography variant="body2" fontWeight="medium">
                          ${parseFloat(event.total_price).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {event.lead_source && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Lead Source
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <TrendingUpIcon color="action" fontSize="small" />
                        <Typography variant="body2">{event.lead_source}</Typography>
                      </Box>
                    </Box>
                  )}

                  {event.payment_status && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Payment Status
                      </Typography>
                      <Chip 
                        label={event.payment_status.replace('_', ' ')} 
                        size="small" 
                        variant="outlined"
                        color={event.payment_status === 'PAID' ? 'success' : 'default'}
                      />
                    </Box>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Workflow Progress */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              {event.workflow_progress ? (
                <WorkflowProgress 
                  progress={event.workflow_progress} 
                  showStageNames={false}
                />
              ) : event.workflow_template_name ? (
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <WorkflowIcon color="primary" />
                    <Typography variant="h6">Workflow Template</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {event.workflow_template_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Workflow assigned but not yet started
                    </Typography>
                  </Box>
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      This event has a workflow template assigned but the workflow hasn't been initiated yet.
                    </Typography>
                  </Alert>
                </Stack>
              ) : (
                <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
                  <WorkflowIcon sx={{ fontSize: 48, color: 'grey.400' }} />
                  <Typography variant="h6" color="text.secondary">
                    No Workflow Assigned
                  </Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    This event doesn't have a workflow template assigned yet.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEditEvent}
                    size="small"
                  >
                    Assign Workflow
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab 
              label="Communications (0)" 
              icon={<MessageIcon />} 
              iconPosition="start"
              disabled
            />
            <Tab 
              label="Quotes (0)" 
              icon={<QuoteIcon />} 
              iconPosition="start"
              disabled
            />
            <Tab 
              label="Contracts (0)" 
              icon={<ContractIcon />} 
              iconPosition="start"
              disabled
            />
            <Tab 
              label="Invoices (0)" 
              icon={<InvoiceIcon />} 
              iconPosition="start"
              disabled
            />
            <Tab 
              label="Questionnaires (0)" 
              icon={<QuestionnaireIcon />} 
              iconPosition="start"
              disabled
            />
            <Tab 
              label="Files (0)" 
              icon={<FilesIcon />} 
              iconPosition="start"
              disabled
            />
            <Tab 
              label="Notes (0)" 
              icon={<NoteIcon />} 
              iconPosition="start"
              disabled
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* All tabs disabled with coming soon message */}
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <TabPanel key={index} value={tabValue} index={index}>
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                {index === 0 && <MessageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />}
                {index === 1 && <QuoteIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />}
                {index === 2 && <ContractIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />}
                {index === 3 && <InvoiceIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />}
                {index === 4 && <QuestionnaireIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />}
                {index === 5 && <FilesIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />}
                {index === 6 && <NoteIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />}
                
                <Typography variant="h6" gutterBottom>
                  {index === 0 && 'Communications Coming Soon'}
                  {index === 1 && 'Quotes Coming Soon'}
                  {index === 2 && 'Contracts Coming Soon'}
                  {index === 3 && 'Invoices Coming Soon'}
                  {index === 4 && 'Questionnaires Coming Soon'}
                  {index === 5 && 'Files Coming Soon'}
                  {index === 6 && 'Notes Coming Soon'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This functionality will be available in a future update.
                </Typography>
              </Paper>
            </TabPanel>
          ))}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent>
          <EventForm
            event={event}
            onSubmit={handleEdit}
            onCancel={() => setEditDialogOpen(false)}
            isLoading={isUpdatingEvent}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{event.name || 'this event'}"? 
            This action cannot be undone and will remove all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDelete}
            color="error" 
            variant="contained"
            disabled={isDeletingEvent}
          >
            {isDeletingEvent ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};