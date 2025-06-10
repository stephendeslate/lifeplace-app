// frontend/admin-crm/src/pages/clients/ClientProfile.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
  Alert,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as InviteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Event as EventIcon,
  Note as NoteIcon,
  Assignment as   ContractIcon,
  AttachMoney as QuoteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useClients } from '../../hooks/useClients';
import { ClientForm, CommunicationRecords, SendCommunication } from '../../components/clients';
import { getClientRegistrationStatus, getClientActiveStatus } from '../../utils/clientStatus';

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
  
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendCommunicationOpen, setSendCommunicationOpen] = useState(false);

  const {
    useClient,
    useClientEvents,
    updateClient,
    isUpdatingClient,
    deleteClient,
    isDeletingClient,
    sendInvitation,
    isSendingInvitation
  } = useClients();

  const clientId = parseInt(id || '0');
  const { data: client, isLoading: isLoadingClient, error: clientError } = useClient(clientId);
  const { data: events = [], isLoading: isLoadingEvents } = useClientEvents(clientId);

  useEffect(() => {
    if (client) {
      setBreadcrumbs([
        { label: 'Clients', path: '/clients' },
        { label: `${client.first_name} ${client.last_name}` },
      ]);
    }
  }, [setBreadcrumbs, client]);

  const handleBack = () => {
    navigate('/clients');
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

  const handleSendInvitation = () => {
    sendInvitation(clientId);
  };

  if (isLoadingClient) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (clientError || !client) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          Client not found or you don't have permission to view this client.
        </Alert>
        <Button startIcon={<BackIcon />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to Clients
        </Button>
      </Box>
    );
  }

  const registrationStatus = getClientRegistrationStatus(client);
  const activeStatus = getClientActiveStatus(client);

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={handleBack}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {client.first_name} {client.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Client Profile
            </Typography>
          </Box>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={() => setSendCommunicationOpen(true)}
          >
            Send Message
          </Button>
          {!client.has_account && (
            <Button
              variant="outlined"
              startIcon={<InviteIcon />}
              onClick={handleSendInvitation}
              disabled={isSendingInvitation}
            >
              {isSendingInvitation ? 'Sending...' : 'Send Invitation'}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditDialogOpen(true)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Deactivate
          </Button>
        </Stack>
      </Box>

      {/* Client Overview Cards */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          mb: 3
        }}
      >
        {/* Basic Info */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6">Contact Information</Typography>
                </Box>
                
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <EmailIcon color="action" fontSize="small" />
                    <Typography variant="body2">{client.email}</Typography>
                  </Box>
                  
                  {client.profile?.phone && (
                    <Box display="flex" alignItems="center" gap={2}>
                      <PhoneIcon color="action" fontSize="small" />
                      <Typography variant="body2">{client.profile.phone}</Typography>
                    </Box>
                  )}
                  
                  {client.profile?.company && (
                    <Box display="flex" alignItems="center" gap={2}>
                      <BusinessIcon color="action" fontSize="small" />
                      <Typography variant="body2">{client.profile.company}</Typography>
                    </Box>
                  )}
                  
                  <Box display="flex" alignItems="center" gap={2}>
                    <CalendarIcon color="action" fontSize="small" />
                    <Typography variant="body2">
                      Joined {new Date(client.date_joined).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Status Info */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Account Status</Typography>
                
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      icon={activeStatus.icon}
                      label={activeStatus.label}
                      color={activeStatus.color}
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Registration
                    </Typography>
                    <Tooltip title={registrationStatus.tooltip}>
                      <Chip
                        icon={registrationStatus.icon}
                        label={registrationStatus.label}
                        color={registrationStatus.color}
                        size="small"
                      />
                    </Tooltip>
                  </Box>
                </Stack>

                {!client.has_account && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      This client hasn't created an account yet. Send them an invitation to access the client portal.
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Quick Stats */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Quick Stats</Typography>
                
                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center" gap={1}>
                      <EventIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Events
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {events.length}
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
                      0
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
                      0
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
              label="Communications" 
              icon={<EmailIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Contracts (0)" 
              icon={<ContractIcon />} 
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
              label="Notes (0)" 
              icon={<NoteIcon />} 
              iconPosition="start"
              disabled
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

          {/* Other tabs - placeholder content */}
          <TabPanel value={tabValue} index={2}>
            <Typography>Contracts management coming soon...</Typography>
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <Typography>Quotes management coming soon...</Typography>
          </TabPanel>
          
          <TabPanel value={tabValue} index={4}>
            <Typography>Notes management coming soon...</Typography>
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

      {/* Send Communication Dialog */}
      <SendCommunication
        client={client}
        open={sendCommunicationOpen}
        onClose={() => setSendCommunicationOpen(false)}
      />
    </Box>
  );
};