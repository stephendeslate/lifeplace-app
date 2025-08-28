// frontend/admin-crm/src/pages/clients/ClientProfile.tsx

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
  Send as SendIcon,
  Block as BlockIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Event as EventIcon,
  Note as NoteIcon,
  Assignment as ContractIcon,
  AttachMoney as QuoteIcon,
  Payment as InvoiceIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useClients } from '../../hooks/useClients';
import { useCommunications } from '../../hooks/useCommunications';
import { useQuotesForClient } from '../../hooks/useSales';
import { useContractsForClient } from '../../hooks/useContracts';
import { useInvoicesForClient } from '../../hooks/usePayments';
import { getClientStatusSummary } from '../../utils/clientStatus';
import { SendMessageDialog } from '../../components/communications/SendMessageDialog';
import { ClientForm } from '../../components/clients/ClientForm';
import { CommunicationRecords } from '../../components/clients/CommunicationRecords';
import { ClientQuotes } from '../../components/clients/ClientQuotes';
import { ClientContracts } from '../../components/clients/ClientContracts';
import { ClientInvoices } from '../../components/clients/ClientInvoices';
import { NotesList } from '../../components/notes';
import { 
  ActivityTimeline,
  QuickActions,
  FinancialSummary,
  EntityNavigation,
  createClientActions,
  createEventReference,
  calculateClientFinancials,
  type ActivityItem,
  type QuickAction,
} from '../../components/common';

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

export const ClientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Hooks
  const { 
    useClient, 
    useClientEvents, 
    sendInvitation, 
    isSendingInvitation,
    updateClient,
    isUpdatingClient,
    deleteClient,
    isDeletingClient
  } = useClients();
  
  const { useRecords } = useCommunications();
  
  const clientId = parseInt(id || '0');
  const { data: client, isLoading, error } = useClient(clientId);
  const { data: events = [], isLoading: isLoadingEvents } = useClientEvents(clientId);
  const { data: communications = [] } = useRecords({ client_id: clientId });
  const { data: quotes = [] } = useQuotesForClient(clientId);
  const { data: contracts = [] } = useContractsForClient(clientId);
  const { data: invoices = [] } = useInvoicesForClient(clientId);

  // Enhanced components data
  const financialMetrics = useMemo(() => {
    return calculateClientFinancials(events);
  }, [events]);

  const quickActions: QuickAction[] = useMemo(() => {
    if (!client) return [];
    return createClientActions(client.id, (actionType: string, clientId: number) => {
      console.log('Quick action:', actionType, 'for client:', clientId);
      switch (actionType) {
        case 'create-event':
          // Navigate to event creation with client pre-selected
          break;
        case 'send-message':
          setSendMessageOpen(true);
          break;
        case 'call-client':
          // Initiate call functionality
          break;
        case 'video-meeting':
          // Start video meeting
          break;
        case 'send-invoice':
          // Open invoice creation
          break;
        case 'add-note':
          setTabValue(6); // Switch to notes tab
          break;
      }
    });
  }, [client]);

  const relatedEvents = useMemo(() => {
    return events.map(event => createEventReference(event));
  }, [events]);

  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    
    // Add communications as activities
    communications.forEach(comm => {
      items.push({
        id: `comm-${comm.id}`,
        type: 'communication',
        title: comm.subject || comm.template_name,
        description: comm.body?.substring(0, 100) + '...',
        timestamp: comm.sent_at || comm.created_at,
        status: 'completed',
        user: { name: 'System' },
      });
    });

    // Add event activities
    events.forEach(event => {
      items.push({
        id: `event-${event.id}`,
        type: 'event',
        title: `Event: ${event.name}`,
        description: `Event status: ${event.status}`,
        timestamp: event.created_at,
        status: 'completed',
        relatedEntity: {
          type: 'event',
          id: event.id,
          name: event.name
        },
        user: { name: 'System' },
      });
    });

    // Add client registration activity
    if (client) {
      items.push({
        id: `client-registered-${client.id}`,
        type: 'status_change',
        title: 'Client Registered',
        description: `${client.first_name} ${client.last_name} joined the system`,
        timestamp: client.date_joined,
        status: 'completed',
        user: { name: 'System' },
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [communications, events, client]);

  useEffect(() => {
    if (client) {
      setBreadcrumbs([
        { label: 'Clients', path: '/clients' },
        { label: `${client.first_name} ${client.last_name}` },
      ]);
    }
  }, [client, setBreadcrumbs]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSendInvitation = () => {
    if (client) {
      sendInvitation(client.id);
    }
    handleMenuClose();
  };

  const handleSendMessage = () => {
    setSendMessageOpen(true);
    handleMenuClose();
  };

  const handleEditClient = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeactivateClient = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleEdit = (data: any) => {
    updateClient(
      { id: clientId, data },
      { onSuccess: () => setEditDialogOpen(false) }
    );
  };

  const handleDelete = () => {
    deleteClient(clientId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        navigate('/clients');
      }
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !client) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/clients')}
          sx={{ mb: 2 }}
        >
          Back to Clients
        </Button>
        <Alert severity="error">
          {error ? 'Failed to load client details' : 'Client not found'}
        </Alert>
      </Box>
    );
  }

  const statusSummary = getClientStatusSummary(client);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/clients')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">
            {client.first_name} {client.last_name}
          </Typography>
          <Chip
            label={statusSummary.registration.label}
            color={statusSummary.registration.color}
            size="small"
          />
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<SendIcon />}
            onClick={handleSendMessage}
          >
            Send Message
          </Button>
          <IconButton onClick={handleMenuClick}>
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClient}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Client</ListItemText>
        </MenuItem>
        {!client.has_account && (
          <MenuItem onClick={handleSendInvitation} disabled={isSendingInvitation}>
            <ListItemIcon>
              <PersonAddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Send Portal Invitation</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleDeactivateClient}>
          <ListItemIcon>
            <BlockIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Deactivate Client</ListItemText>
        </MenuItem>
      </Menu>

      {/* Info Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Contact Info */}
        <Box sx={{ flex: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <EmailIcon color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">{client.email}</Typography>
                  </Box>
                </Box>
                
                <Box display="flex" alignItems="center" gap={1}>
                  <PhoneIcon color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {client.profile?.phone || 'Not provided'}
                    </Typography>
                  </Box>
                </Box>
                
                <Box display="flex" alignItems="center" gap={1}>
                  <BusinessIcon color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Company
                    </Typography>
                    <Typography variant="body1">
                      {client.profile?.company || 'Not provided'}
                    </Typography>
                  </Box>
                </Box>
                
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarIcon color="action" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Member Since
                    </Typography>
                    <Typography variant="body1">
                      {new Date(client.date_joined).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ flex: 1 }}>
          <QuickActions 
            actions={quickActions}
            compactMode={true}
          />
        </Box>
      </Box>

      {/* Enhanced Sections */}
      <Stack spacing={3} mb={3}>
        {/* Financial Summary */}
        <FinancialSummary
          title="Client Financials"
          metrics={financialMetrics}
          compactMode={false}
        />

        {/* Related Events & Activity Timeline */}
        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 3,
          }}
        >
          {/* Related Events */}
          <Box sx={{ flex: 1 }}>
            <EntityNavigation
              title="Recent Events"
              entities={relatedEvents}
              layout="list"
              maxVisible={3}
              showViewAll={true}
              onViewAll={() => {
                // Navigate to events filtered by client
                console.log('Navigate to client events');
              }}
            />
          </Box>

          {/* Activity Timeline */}
          <Box sx={{ flex: 2 }}>
            <ActivityTimeline
              activities={activityItems}
              maxHeight="400px"
              showFilters={false}
            />
          </Box>
        </Box>
      </Stack>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={(_, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab 
              label={`Activity (${activityItems.length})`}
              icon={<ScheduleIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Events (${events.length})`} 
              icon={<EventIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Communications (${communications.length})`} 
              icon={<MessageIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Quotes (${quotes.length})`} 
              icon={<QuoteIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Contracts (${contracts.length})`} 
              icon={<ContractIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Invoices (${invoices.length})`} 
              icon={<InvoiceIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Notes" 
              icon={<NoteIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <CardContent>
          {/* Activity Tab */}
          <TabPanel value={tabValue} index={0}>
            <ActivityTimeline
              activities={activityItems}
              maxHeight="600px"
              showFilters={true}
            />
          </TabPanel>

          {/* Events Tab */}
          <TabPanel value={tabValue} index={1}>
            {isLoadingEvents ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : events.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                <EventIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Events Yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This client hasn't been associated with any events yet.
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {events.map((event) => (
                  <Card key={event.id} variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {event.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {new Date(event.start_date).toLocaleDateString()} - {event.end_date ? new Date(event.end_date).toLocaleDateString() : 'Ongoing'}
                          </Typography>
                        </Box>
                        <Chip 
                          label={event.status} 
                          size="small" 
                          color={event.status === 'COMPLETED' ? 'success' : 'primary'}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </TabPanel>

          {/* Communications Tab */}
          <TabPanel value={tabValue} index={2}>
            <CommunicationRecords clientId={clientId} />
          </TabPanel>

          {/* Quotes Tab */}
          <TabPanel value={tabValue} index={3}>
            <ClientQuotes client={client} />
          </TabPanel>

          {/* Contracts Tab */}
          <TabPanel value={tabValue} index={4}>
            <ClientContracts client={client} />
          </TabPanel>

          {/* Invoices Tab */}
          <TabPanel value={tabValue} index={5}>
            <ClientInvoices client={client} />
          </TabPanel>

          {/* Notes Tab */}
          <TabPanel value={tabValue} index={6}>
            <NotesList
              contentType="client"
              objectId={clientId}
              objectName={`${client.first_name} ${client.last_name}`}
              allowCreate={true}
              allowEdit={true}
              allowDelete={true}
            />
          </TabPanel>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Client</DialogTitle>
        <DialogContent>
          <ClientForm
            client={client}
            onSubmit={handleEdit}
            onCancel={() => setEditDialogOpen(false)}
            isLoading={isUpdatingClient}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Deactivate Client</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to deactivate {client.first_name} {client.last_name}? 
            This will make their account inactive but preserve all data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDelete}
            color="error" 
            variant="contained"
            disabled={isDeletingClient}
          >
            {isDeletingClient ? <CircularProgress size={20} /> : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Message Dialog */}
      <SendMessageDialog
        open={sendMessageOpen}
        onClose={() => setSendMessageOpen(false)}
        client={client}
      />
    </Box>
  );
};