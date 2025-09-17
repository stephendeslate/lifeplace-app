// Modern Glassmorphic Client Profile
// Enhanced with professional design patterns and comprehensive client management

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageInterface } from '@shared/components/messaging';
import { CreateThreadDialog } from '../../components/messaging/CreateThreadDialog';
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
  Tabs,
  Fade,
  Container,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
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
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useClients } from '../../hooks/useClients';
import { useCommunications } from '../../hooks/useCommunications';
import { useQuotesForClient } from '../../hooks/useSales';
import type { UpdateClientData } from '../../types/clients.types';
import { useContractsForClient } from '../../hooks/useContracts';
import { useInvoicesForClient } from '../../hooks/usePayments';
import { getClientStatusSummary } from '../../utils/clientStatus';
import { ClientForm } from '../../components/clients/ClientForm';
import { ClientQuotes } from '../../components/clients/ClientQuotes';
import { ClientContracts } from '../../components/clients/ClientContracts';
import { ClientInvoices } from '../../components/clients/ClientInvoices';
import { NotesList } from '../../components/notes';
import { 
  ActivityTimeline,
  FinancialSummary,
  EntityNavigation,
  createEventReference,
  calculateClientFinancials,
  type ActivityItem,
} from '../../components/common';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [createThreadDialogOpen, setCreateThreadDialogOpen] = useState(false);
  
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
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
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


  const handleEditClient = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeactivateClient = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleEdit = (data: UpdateClientData) => {
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
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box 
          display="flex" 
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{
            minHeight: '60vh',
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xxl,
            p: 6,
          }}
        >
          <CircularProgress size={48} sx={{ mb: 3, color: tokens.color.primary[500] }} />
          <Typography variant="h6" sx={{ color: tokens.color.neutral[600] }}>
            Loading client profile...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error || !client) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box 
          sx={{
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xxl,
            p: 6,
            textAlign: 'center'
          }}
        >
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              ...glassPresets.light,
              borderRadius: tokens.spacing.radius.xl,
              border: `1px solid ${tokens.color.error[500]}30`,
            }}
          >
            {error ? 'Error loading client profile' : 'Client not found'}
          </Alert>
          <Button 
            variant="outlined" 
            size="large"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/clients')}
            sx={{
              ...glassPresets.light,
              borderRadius: tokens.spacing.radius.full,
              border: `1px solid ${tokens.color.primary[500]}30`,
              color: tokens.color.primary[600],
              px: 4,
              
              '&:hover': {
                ...glassPresets.medium,
                transform: 'translateY(-2px)',
              }
            }}
          >
            Back to Clients
          </Button>
        </Box>
      </Container>
    );
  }

  const statusSummary = getClientStatusSummary(client);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 20%, ${tokens.color.primary[500]}04 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, ${tokens.color.success[500]}04 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: -1,
      }
    }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Enhanced Header */}
        <Fade in={isLoaded} timeout={500}>
          <Box sx={{ mb: 4 }}>
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="flex-start"
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.xxl,
                p: { xs: 3, md: 4 },
                border: `1px solid ${tokens.color.borders.glass}`,
                position: 'relative',
                overflow: 'visible',
                
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}06 0%, ${tokens.color.success[500]}06 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                }
              }}
            >
              <Box display="flex" alignItems="center" gap={3} sx={{ position: 'relative', zIndex: 1 }}>
                <Tooltip title="Back to clients">
                  <IconButton 
                    onClick={() => navigate('/clients')} 
                    sx={{
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.full,
                      width: 48,
                      height: 48,
                      color: tokens.color.primary[600],
                      
                      '&:hover': {
                        ...glassPresets.medium,
                        transform: 'translateX(-4px)',
                      }
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                </Tooltip>
                
                <Box display="flex" alignItems="center" gap={3}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.secondary[500]} 100%)`,
                      fontSize: '2rem',
                      fontWeight: 700,
                      boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                    }}
                  >
                    {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                  </Avatar>
                  
                  <Box>
                    <Typography 
                      variant="h3" 
                      component="h1" 
                      sx={{ 
                        fontWeight: 700,
                        background: tokens.color.backgrounds.primaryGradient,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                        mb: 1,
                        lineHeight: 1.2,
                      }}
                    >
                      {client.first_name} {client.last_name}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      {client.email && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <EmailIcon sx={{ fontSize: 16, color: tokens.color.neutral[500] }} />
                          <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                            {client.email}
                          </Typography>
                        </Box>
                      )}
                      {client.profile?.phone && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <PhoneIcon sx={{ fontSize: 16, color: tokens.color.neutral[500] }} />
                          <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                            {client.profile.phone}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={2}>
                      <Chip
                        icon={statusSummary.registration.icon}
                        label={statusSummary.registration.label}
                        color={statusSummary.registration.color}
                        variant="outlined"
                        sx={{
                          ...glassPresets.light,
                          fontWeight: 600,
                        }}
                      />
                      
                      <Chip
                        icon={statusSummary.active.icon}
                        label={statusSummary.active.label}
                        color={statusSummary.active.color}
                        variant="outlined"
                        sx={{
                          ...glassPresets.light,
                          fontWeight: 600,
                        }}
                      />
                      
                      <Chip 
                        icon={<StarIcon />}
                        label="VIP Client"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{
                          ...glassPresets.light,
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
        
        <Box display="flex" alignItems="center" gap={2} sx={{ position: 'relative', zIndex: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // Navigate to event creation with client pre-selected
            }}
            sx={{
              borderRadius: tokens.spacing.radius.lg,
              textTransform: 'none',
              fontWeight: 600,
              px: 2,
              py: 1,
              background: tokens.color.backgrounds.primaryGradient,
              transition: createTransition(['transform', 'box-shadow'], 'fast'),
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: `0 8px 24px ${tokens.color.primary[500]}30`,
              }
            }}
          >
            Create Event
          </Button>


          <Button
            variant="outlined"
            startIcon={<PhoneIcon />}
            onClick={() => {
              // Initiate phone call
            }}
            sx={{
              borderColor: tokens.color.neutral[300],
              color: tokens.color.neutral[700],
              borderRadius: tokens.spacing.radius.lg,
              textTransform: 'none',
              fontWeight: 500,
              px: 2,
              py: 1,
              transition: createTransition(['background', 'border-color', 'transform'], 'fast'),
              '&:hover': {
                borderColor: tokens.color.success[500],
                background: `${tokens.color.success[500]}05`,
                transform: 'translateY(-1px)',
              }
            }}
          >
            Call
          </Button>

          <IconButton 
            onClick={handleMenuClick}
            sx={{
              ...glassPresets.light,
              borderRadius: tokens.spacing.radius.full,
              width: 40,
              height: 40,
              color: tokens.color.neutral[600],
              transition: createTransition(['transform', 'background'], 'fast'),
              
              '&:hover': {
                ...glassPresets.medium,
                transform: 'rotate(90deg)',
              }
            }}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>
            </Box>
          </Box>
        </Fade>

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

      {/* Contact Info Card */}
      <Box sx={{ mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
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
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Enhanced Sections */}
      <Stack spacing={3} mb={3}>
        {/* Financial Summary */}
        <FinancialSummary
          title="Client Financials"
          metrics={financialMetrics}
          compactMode={false}
        />

        {/* Related Events */}
        <Box>
          <EntityNavigation
            title="Recent Events"
            entities={relatedEvents}
            layout="list"
            maxVisible={3}
            showViewAll={true}
            onViewAll={() => {
              // Navigate to events filtered by client
            }}
          />
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
              label="Messages" 
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

          {/* Messages Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Messages with {client.first_name} {client.last_name}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateThreadDialogOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(25, 118, 210, 0.35)',
                  }
                }}
              >
                New Thread
              </Button>
            </Box>
            <MessageInterface
              userRole="ADMIN"
              title={`Messages with ${client.first_name} ${client.last_name}`}
              subtitle={`Client communications for ${client.first_name} ${client.last_name}`}
              height="600px"
              enableThreadList={true}
              enableRealTime={true}
              enableSearch={true}
              enableFileUploads={true}
              contextFilters={{ client_id: client.id }}
              enableDirectAPI={true}
              onError={(_error) => {
                // Handle messaging errors
              }}
            />
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

      {/* Create Thread Dialog */}
      <CreateThreadDialog
        open={createThreadDialogOpen}
        onClose={() => setCreateThreadDialogOpen(false)}
        preSelectedClient={client}
      />

      </Container>
    </Box>
  );
};