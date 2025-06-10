// frontend/admin-crm/src/pages/clients/ClientProfile.tsx (Complete with tabs)

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
  Person as PersonIcon
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useClients } from '../../hooks/useClients';
import { getClientStatusSummary } from '../../utils/clientStatus';
import { SendMessageDialog } from '../../components/communications/SendMessageDialog';
import { ClientForm } from '../../components/clients/ClientForm';
import { CommunicationRecords } from '../../components/clients/CommunicationRecords';

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
  
  const clientId = parseInt(id || '0');
  const { data: client, isLoading, error } = useClient(clientId);
  const { data: events = [], isLoading: isLoadingEvents } = useClientEvents(clientId);

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
          {error ? 'Failed to load client information' : 'Client not found'}
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
          <IconButton onClick={() => navigate('/clients')}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {client.first_name} {client.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {client.email}
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {/* Quick Actions */}
          <Tooltip title="Send Message">
            <IconButton 
              onClick={handleSendMessage}
              color="primary"
              sx={{ 
                bgcolor: 'primary.50',
                '&:hover': { bgcolor: 'primary.100' }
              }}
            >
              <SendIcon />
            </IconButton>
          </Tooltip>

          {statusSummary.needsInvitation && (
            <Tooltip title="Send Account Invitation">
              <span>
                <IconButton
                  onClick={handleSendInvitation}
                  disabled={isSendingInvitation}
                  color="secondary"
                  sx={{ 
                    bgcolor: 'secondary.50',
                    '&:hover': { bgcolor: 'secondary.100' }
                  }}
                >
                  {isSendingInvitation ? (
                    <CircularProgress size={20} />
                  ) : (
                    <PersonAddIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* More Actions Menu */}
          <IconButton onClick={handleMenuClick}>
            <MoreVertIcon />
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleEditClient}>
              <ListItemIcon>
                <EditIcon />
              </ListItemIcon>
              <ListItemText>Edit Client</ListItemText>
            </MenuItem>
            
            <MenuItem onClick={handleSendMessage}>
              <ListItemIcon>
                <SendIcon />
              </ListItemIcon>
              <ListItemText>Send Message</ListItemText>
            </MenuItem>
            
            {statusSummary.needsInvitation && (
              <MenuItem onClick={handleSendInvitation} disabled={isSendingInvitation}>
                <ListItemIcon>
                  <PersonAddIcon />
                </ListItemIcon>
                <ListItemText>
                  {isSendingInvitation ? 'Sending Invitation...' : 'Send Invitation'}
                </ListItemText>
              </MenuItem>
            )}
            
            <Divider />
            
            <MenuItem onClick={handleDeactivateClient} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <BlockIcon color="error" />
              </ListItemIcon>
              <ListItemText>Deactivate Client</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Status Alerts */}
      {statusSummary.needsInvitation && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleSendInvitation}
              disabled={isSendingInvitation}
            >
              {isSendingInvitation ? <CircularProgress size={16} /> : 'Send Invitation'}
            </Button>
          }
        >
          This client hasn't created an account yet. Send them an invitation to get started.
        </Alert>
      )}

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
                      icon={statusSummary.active.icon}
                      label={statusSummary.active.label}
                      color={statusSummary.active.color as any}
                      size="small"
                    />
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Registration
                    </Typography>
                    <Tooltip title={statusSummary.registration.tooltip}>
                      <Chip
                        icon={statusSummary.registration.icon}
                        label={statusSummary.registration.label}
                        color={statusSummary.registration.color as any}
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
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <ContractIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Contracts Coming Soon
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contract management functionality will be available in a future update.
              </Typography>
            </Paper>
          </TabPanel>
          
          <TabPanel value={tabValue} index={3}>
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <QuoteIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Quotes Coming Soon
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quote management functionality will be available in a future update.
              </Typography>
            </Paper>
          </TabPanel>
          
          <TabPanel value={tabValue} index={4}>
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <NoteIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Notes Coming Soon
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Client notes functionality will be available in a future update.
              </Typography>
            </Paper>
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