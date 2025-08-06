// frontend/admin-crm/src/pages/clients/ClientProfile.tsx

import React, { useEffect, useState } from 'react';
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
  Tooltip,
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
  Person as PersonIcon,
  Message as MessageIcon
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

        {/* Summary Stats */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overview
              </Typography>
              <Stack spacing={2}>
                <Stack spacing={1.5}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      <EventIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Total Events
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {events.length}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      <MessageIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Communications
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {communications.length}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      <QuoteIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Quotes
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {quotes.length}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      <ContractIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Contracts
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {contracts.length}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      <InvoiceIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Invoices
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {invoices.length}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
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
          {/* Events Tab */}
          <TabPanel value={tabValue} index={0}>
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
                            {event.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                          </Typography>
                          {event.venue && (
                            <Typography variant="body2" color="text.secondary">
                              📍 {event.venue}
                            </Typography>
                          )}
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
          <TabPanel value={tabValue} index={1}>
            <CommunicationRecords clientId={clientId} />
          </TabPanel>

          {/* Quotes Tab */}
          <TabPanel value={tabValue} index={2}>
            <ClientQuotes client={client} />
          </TabPanel>

          {/* Contracts Tab */}
          <TabPanel value={tabValue} index={3}>
            <ClientContracts client={client} />
          </TabPanel>

          {/* Invoices Tab */}
          <TabPanel value={tabValue} index={4}>
            <ClientInvoices client={client} />
          </TabPanel>

          {/* Notes Tab */}
          <TabPanel value={tabValue} index={5}>
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