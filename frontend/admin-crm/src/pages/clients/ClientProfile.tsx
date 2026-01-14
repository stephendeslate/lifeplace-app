// Modern Client Profile Page
// Completely modernized with ModernDesignSystem components and consistent patterns

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Tab,
  Tabs,
  Avatar,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
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
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
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
import { ClientCommunications } from '../../components/clients/ClientCommunications';
import {
  ActivityTimeline,
  FinancialSummary,
  EntityNavigation,
  QuickActions,
  createEventReference,
  createClientActions,
  calculateClientFinancials,
  type ActivityItem,
  type QuickAction,
} from '../../components/common';
import {
  ModernPageLayout,
  ModernCard,
  ModernEmptyState,
  ModernLoadingSpinner,
  ModernPageHeader,
  createRefreshAction,
} from '../../components/common/ModernDesignSystem';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';

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
  const { settings: currencySettings } = useCurrencySettings();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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
    isDeletingClient,
  } = useClients();

  const { useRecords } = useCommunications();

  const clientId = parseInt(id || '0');
  const { data: client, isLoading, error, refetch: refetchClient } = useClient(clientId);
  const { data: events = [], isLoading: isLoadingEvents } = useClientEvents(clientId);
  const { data: communications = [] } = useRecords({ client_id: clientId });
  const { data: quotes = [] } = useQuotesForClient(clientId);
  const { data: contracts = [] } = useContractsForClient(clientId);
  const { data: invoices = [] } = useInvoicesForClient(clientId);

  // Currency formatting
  const formatClientAmount = useCallback((amount: string | number) => {
    const currency = currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  }, [currencySettings]);

  // Menu handlers
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSendInvitation = useCallback(() => {
    if (client) {
      sendInvitation(client.id);
    }
    handleMenuClose();
  }, [client, sendInvitation, handleMenuClose]);

  const handleEditClient = useCallback(() => {
    setEditDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleDeactivateClient = useCallback(() => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  // Enhanced components data
  const financialMetrics = useMemo(() => {
    return calculateClientFinancials(events);
  }, [events]);

  const quickActions: QuickAction[] = useMemo(() => {
    if (!client) return [];
    const clientPhone = client.profile?.phone;
    return createClientActions(client.id, (actionType: string, _clientId: number) => {
      switch (actionType) {
        case 'create-event':
          navigate(`/events/new?client=${clientId}`);
          break;
        case 'send-message':
          setTabValue(2); // Switch to communications tab
          break;
        case 'create-quote':
          navigate(`/sales/quotes/new?client=${clientId}`);
          break;
        case 'send-invitation':
          handleSendInvitation();
          break;
        case 'add-note':
          setTabValue(6); // Switch to notes tab
          break;
        case 'call-client':
          if (clientPhone) {
            window.location.href = `tel:${clientPhone}`;
          }
          break;
        case 'create-invoice':
          navigate(`/invoices/new?client=${clientId}`);
          break;
      }
    }, clientPhone);
  }, [client, navigate, handleSendInvitation, clientId]);

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

    // Add quote activities
    quotes.forEach(quote => {
      items.push({
        id: `quote-${quote.id}`,
        type: 'note',
        title: `Quote ${quote.status === 'ACCEPTED' ? 'Accepted' : quote.status === 'SENT' ? 'Sent' : 'Created'}`,
        description: `Quote for ${quote.event_details?.name || 'event'} - ${formatClientAmount(quote.total_amount)}`,
        timestamp: quote.updated_at || quote.created_at,
        status: quote.status === 'ACCEPTED' ? 'completed' : quote.status === 'SENT' ? 'in_progress' : 'pending',
        relatedEntity: {
          type: 'quote' as 'event',
          id: quote.id,
          name: `Quote #${quote.id}`
        },
        user: { name: 'System' },
      });
    });

    // Add contract activities
    contracts.forEach(contract => {
      items.push({
        id: `contract-${contract.id}`,
        type: 'contract',
        title: `Contract ${contract.status === 'SIGNED' ? 'Signed' : contract.status === 'SENT' ? 'Sent' : 'Created'}`,
        description: `Contract for ${contract.event_details?.name || 'event'} - ${contract.status_display || contract.status}`,
        timestamp: contract.updated_at || contract.created_at,
        status: contract.status === 'SIGNED' ? 'completed' : contract.status === 'SENT' ? 'in_progress' : 'pending',
        relatedEntity: {
          type: 'contract' as 'event',
          id: contract.id,
          name: `Contract #${contract.id}`
        },
        user: { name: 'System' },
      });
    });

    // Add invoice activities
    invoices.forEach(invoice => {
      items.push({
        id: `invoice-${invoice.id}`,
        type: 'payment',
        title: `Invoice ${invoice.status === 'PAID' ? 'Paid' : invoice.status === 'ISSUED' ? 'Issued' : 'Created'}`,
        description: `Invoice ${invoice.invoice_id} - ${formatClientAmount(invoice.total_amount)}`,
        timestamp: invoice.updated_at || invoice.created_at,
        status: invoice.status === 'PAID' ? 'completed' : invoice.status === 'ISSUED' ? 'in_progress' : 'pending',
        relatedEntity: {
          type: 'invoice' as 'event',
          id: invoice.id,
          name: invoice.invoice_id
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
  }, [communications, events, client, quotes, contracts, invoices, formatClientAmount]);

  useEffect(() => {
    if (client) {
      setBreadcrumbs([
        { label: 'Clients', path: '/clients' },
        { label: `${client.first_name} ${client.last_name}` },
      ]);
    }
  }, [client, setBreadcrumbs]);

  const handleEdit = useCallback((data: UpdateClientData) => {
    updateClient(
      { id: clientId, data },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          refetchClient();
        }
      }
    );
  }, [clientId, updateClient, refetchClient]);

  const handleDelete = useCallback(() => {
    deleteClient(clientId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        navigate('/clients');
      }
    });
  }, [clientId, deleteClient, navigate]);

  // Calculate total client value
  const totalClientValue = useMemo(() => {
    const total = events.reduce((sum, event) => {
      const amount = parseFloat(event.current_total_amount || event.total_price || '0');
      return sum + amount;
    }, 0);
    return formatClientAmount(total);
  }, [events, formatClientAmount]);

  if (isLoading) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernLoadingSpinner
          size={48}
          message="Loading client profile..."
          variant="circular"
          glass
        />
      </ModernPageLayout>
    );
  }

  if (error || !client) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernPageHeader
          title="Client Not Found"
          subtitle="The requested client could not be located"
          icon={<PersonIcon />}
          secondaryActions={[
            {
              label: 'Back to Clients',
              onClick: () => navigate('/clients'),
              icon: <ArrowBackIcon />
            }
          ]}
        />
        <ModernEmptyState
          icon={PersonIcon}
          title="Client Not Found"
          description="The client you're looking for doesn't exist or may have been removed."
          primaryAction={{
            label: 'Back to Clients',
            onClick: () => navigate('/clients'),
            icon: <ArrowBackIcon />,
            color: 'primary'
          }}
          size="medium"
          illustration="minimal"
        />
      </ModernPageLayout>
    );
  }

  const statusSummary = getClientStatusSummary(client);

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Page Header */}
      <ModernPageHeader
        title={`${client.first_name} ${client.last_name}`}
        subtitle={client.email}
        icon={
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.secondary[500]} 100%)`,
              fontSize: '1.5rem',
              fontWeight: 700,
              boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
            }}
          >
            {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
          </Avatar>
        }
        primaryAction={{
          label: 'Create Event',
          onClick: () => navigate(`/events/new?client=${clientId}`),
          icon: <AddIcon />,
          variant: 'contained',
          color: 'primary',
        }}
        secondaryActions={[
          {
            label: 'Back to Clients',
            onClick: () => navigate('/clients'),
            icon: <ArrowBackIcon />,
            variant: 'outlined'
          },
          createRefreshAction(() => refetchClient()),
          {
            label: 'Message',
            onClick: () => setTabValue(2),
            icon: <MessageIcon />,
            variant: 'outlined',
          },
          {
            label: 'More Options',
            onClick: (e) => setAnchorEl(e?.currentTarget ?? null),
            icon: <MoreVertIcon />,
            variant: 'icon',
          }
        ]}
        status={{
          label: statusSummary.active.label,
          color: statusSummary.active.color === 'success' ? 'success' : 'error',
          variant: 'outlined'
        }}
        stats={[
          {
            label: 'Total Events',
            value: events.length.toString()
          },
          {
            label: 'Total Value',
            value: totalClientValue
          },
          {
            label: 'Member Since',
            value: new Date(client.date_joined).toLocaleDateString()
          }
        ]}
        size="medium"
      />

      {/* More Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.lg,
          }
        }}
      >
        <MenuItem onClick={handleEditClient}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Edit Client</ListItemText>
        </MenuItem>
        {!client.has_account && (
          <MenuItem onClick={handleSendInvitation} disabled={isSendingInvitation}>
            <ListItemIcon>
              <PersonAddIcon />
            </ListItemIcon>
            <ListItemText>Send Portal Invitation</ListItemText>
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

      {/* Client Overview Cards */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          mb: 4
        }}
      >
        {/* Contact Information */}
        <Box sx={{ flex: 1 }}>
          <ModernCard
            variant="glass"
            size="large"
            interactive={false}
            animation="none"
            title="Contact Information"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.info[500]}06 100%)`,
              }
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: `${tokens.color.primary[500]}15`,
                    color: tokens.color.primary[600],
                  }}
                >
                  <PersonIcon />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    background: `linear-gradient(135deg, ${tokens.color.primary[600]}, ${tokens.color.primary[700]})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    fontWeight: 600,
                  }}
                >
                  Contact Details
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Email Address
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: tokens.spacing.radius.full,
                        backgroundColor: `${tokens.color.info[500]}15`,
                      }}
                    >
                      <EmailIcon sx={{ fontSize: 16, color: tokens.color.info[600] }} />
                    </Box>
                    <Typography variant="body1" fontWeight="medium">
                      {client.email}
                    </Typography>
                  </Box>
                </Box>

                {client.profile?.phone && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Phone Number
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: tokens.spacing.radius.full,
                          backgroundColor: `${tokens.color.success[500]}15`,
                        }}
                      >
                        <PhoneIcon sx={{ fontSize: 16, color: tokens.color.success[600] }} />
                      </Box>
                      <Typography variant="body1" fontWeight="medium">
                        {client.profile.phone}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {client.profile?.company && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Company
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: tokens.spacing.radius.full,
                          backgroundColor: `${tokens.color.warning[500]}15`,
                        }}
                      >
                        <BusinessIcon sx={{ fontSize: 16, color: tokens.color.warning[600] }} />
                      </Box>
                      <Typography variant="body1" fontWeight="medium">
                        {client.profile.company}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Stack>
          </ModernCard>
        </Box>

        {/* Client Statistics */}
        <Box sx={{ flex: 1 }}>
          <ModernCard
            variant="glass"
            size="large"
            interactive={false}
            animation="none"
            title="Client Statistics"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.success[500]}08 0%, ${tokens.color.secondary[500]}06 100%)`,
              }
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: `${tokens.color.success[500]}15`,
                    color: tokens.color.success[600],
                  }}
                >
                  <TrendingUpIcon />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    background: `linear-gradient(135deg, ${tokens.color.success[600]}, ${tokens.color.success[700]})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    fontWeight: 600,
                  }}
                >
                  Performance
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Total Events
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      background: `linear-gradient(135deg, ${tokens.color.primary[600]}, ${tokens.color.success[600]})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      fontWeight: 700,
                    }}
                  >
                    {events.length}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Lifetime Value
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      background: `linear-gradient(135deg, ${tokens.color.success[600]}, ${tokens.color.primary[600]})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      fontWeight: 700,
                    }}
                  >
                    {totalClientValue}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Member Since
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(client.date_joined).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </ModernCard>
        </Box>

        {/* Account Status */}
        <Box sx={{ flex: 1 }}>
          <ModernCard
            variant="glass"
            size="large"
            interactive={false}
            animation="none"
            title="Account Status"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.secondary[500]}08 0%, ${tokens.color.warning[500]}06 100%)`,
              }
            }}
          >
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: tokens.spacing.radius.lg,
                    backgroundColor: `${tokens.color.secondary[500]}15`,
                    color: tokens.color.secondary[600],
                  }}
                >
                  <CalendarIcon />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    background: `linear-gradient(135deg, ${tokens.color.secondary[600]}, ${tokens.color.secondary[700]})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    fontWeight: 600,
                  }}
                >
                  Status & Activity
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Account Status
                  </Typography>
                  <Chip
                    label={client.is_active ? 'Active' : 'Inactive'}
                    color={client.is_active ? 'success' : 'error'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Portal Access
                  </Typography>
                  <Chip
                    label={client.has_account ? 'Registered' : 'Not Registered'}
                    color={client.has_account ? 'primary' : 'warning'}
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

              </Stack>
            </Stack>
          </ModernCard>
        </Box>
      </Box>

      {/* Enhanced Sections */}
      <Stack spacing={4} sx={{ mb: 4 }}>
        {/* Quick Actions & Related Entities */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: 3,
          }}
        >
          {/* Quick Actions */}
          <Box sx={{ flex: 1 }}>
            <ModernCard
              variant="glass"
              size="medium"
              animation="none"
              sx={{
                '&::before': {
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.secondary[500]}04 100%)`,
                }
              }}
            >
              <QuickActions
                actions={quickActions}
                title="Client Actions"
                compactMode={false}
              />
            </ModernCard>
          </Box>

          {/* Related Events */}
          <Box sx={{ flex: 1 }}>
            <ModernCard
              variant="glass"
              size="medium"
              animation="none"
              sx={{
                '&::before': {
                  background: `linear-gradient(135deg, ${tokens.color.success[500]}04 0%, ${tokens.color.warning[500]}04 100%)`,
                }
              }}
            >
              <EntityNavigation
                title="Recent Events"
                entities={relatedEvents}
                layout="compact"
                maxVisible={3}
                showViewAll={relatedEvents.length > 3}
                onViewAll={relatedEvents.length > 3 ? () => navigate(`/events?client=${clientId}`) : undefined}
              />
            </ModernCard>
          </Box>
        </Box>

        {/* Financial Summary */}
        <ModernCard
          variant="glass"
          size="large"
          animation="none"
          title="Client Financials"
          sx={{
            '&::before': {
              background: `linear-gradient(135deg, ${tokens.color.success[500]}04 0%, ${tokens.color.info[500]}04 100%)`,
            }
          }}
        >
          <FinancialSummary
            title="Financial Overview"
            metrics={financialMetrics}
            compactMode={false}
          />
        </ModernCard>
      </Stack>

      {/* Tabs */}
      <ModernCard
        variant="glass"
        size="large"
        animation="none"
        sx={{
          '&::before': {
            background: `linear-gradient(135deg, ${tokens.color.neutral[500]}03 0%, ${tokens.color.primary[500]}03 100%)`,
          }
        }}
      >
        <Box
          sx={{
            borderBottom: `1px solid ${tokens.color.borders.glass}`,
            backgroundColor: `${tokens.color.neutral[50]}50`,
            borderRadius: `${tokens.spacing.radius.xxl} ${tokens.spacing.radius.xxl} 0 0`,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                fontWeight: 600,
                fontSize: '0.9rem',
                color: tokens.color.neutral[600],
                transition: createTransition(['color', 'background'], 'fast'),

                '&.Mui-selected': {
                  color: tokens.color.primary[600],
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.primary[600]}06 100%)`,
                },

                '&:hover': {
                  backgroundColor: `${tokens.color.neutral[500]}10`,
                }
              },
              '& .MuiTabs-indicator': {
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}, ${tokens.color.primary[600]})`,
                height: 3,
                borderRadius: tokens.spacing.radius.full,
              }
            }}
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

        <Box sx={{ p: 3 }}>
          {/* Activity Tab */}
          <TabPanel value={tabValue} index={0}>
            <ActivityTimeline
              activities={activityItems}
              maxHeight="600px"
              showFilters={true}
              onRefresh={() => refetchClient()}
            />
          </TabPanel>

          {/* Events Tab */}
          <TabPanel value={tabValue} index={1}>
            {isLoadingEvents ? (
              <ModernLoadingSpinner
                size={32}
                message="Loading events..."
                variant="circular"
              />
            ) : events.length === 0 ? (
              <ModernEmptyState
                icon={EventIcon}
                title="No Events Yet"
                description="This client hasn't been associated with any events yet. Create an event to get started."
                primaryAction={{
                  label: 'Create Event',
                  onClick: () => navigate(`/events/new?client=${clientId}`),
                  icon: <AddIcon />,
                  color: 'primary'
                }}
                size="small"
                illustration="minimal"
                tip={{
                  text: 'Events help you track client bookings, milestones, and deliverables',
                  type: 'info'
                }}
                sx={{ py: 4 }}
              />
            ) : (
              <TableContainer
                component={Paper}
                sx={{
                  ...glassPresets.light,
                  border: `1px solid ${tokens.color.borders.glass}`,
                  borderRadius: tokens.spacing.radius.lg,
                  overflow: 'hidden',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: `${tokens.color.primary[500]}10`,
                        '& .MuiTableCell-root': {
                          fontWeight: 600,
                          color: tokens.color.primary[700],
                          borderBottom: `1px solid ${tokens.color.borders.glass}`,
                        }
                      }}
                    >
                      <TableCell>Event Name</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map((event, index) => (
                      <TableRow
                        key={event.id}
                        sx={{
                          backgroundColor: index % 2 === 0 ? 'transparent' : `${tokens.color.neutral[500]}05`,
                          '& .MuiTableCell-root': {
                            borderBottom: `1px solid ${tokens.color.borders.glass}`,
                            py: 2,
                          },
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: `${tokens.color.primary[500]}08`,
                          }
                        }}
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body1" fontWeight="600">
                            {event.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.event_type_name || 'No type'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {new Date(event.start_date).toLocaleDateString()}
                          </Typography>
                          {event.end_date && (
                            <Typography variant="caption" color="text.secondary">
                              to {new Date(event.end_date).toLocaleDateString()}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={event.status}
                            size="small"
                            color={
                              event.status === 'COMPLETED' ? 'success' :
                              event.status === 'CONFIRMED' ? 'primary' :
                              event.status === 'CANCELLED' ? 'error' : 'default'
                            }
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/events/${event.id}`);
                            }}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Communications Tab */}
          <TabPanel value={tabValue} index={2}>
            <ClientCommunications client={client} />
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
        </Box>
      </ModernCard>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.xl,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${tokens.color.primary[500]}10, ${tokens.color.secondary[500]}10)`,
            borderBottom: `1px solid ${tokens.color.borders.glass}`,
            fontSize: '1.25rem',
            fontWeight: 600,
          }}
        >
          Edit Client
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <ClientForm
            client={client}
            onSubmit={handleEdit}
            onCancel={() => setEditDialogOpen(false)}
            isLoading={isUpdatingClient}
          />
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            ...glassPresets.medium,
            border: `1px solid ${tokens.color.borders.glass}`,
            borderRadius: tokens.spacing.radius.xl,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${tokens.color.error[500]}10, ${tokens.color.warning[500]}10)`,
            borderBottom: `1px solid ${tokens.color.borders.glass}`,
            fontSize: '1.25rem',
            fontWeight: 600,
            color: tokens.color.error[700],
          }}
        >
          Deactivate Client
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <DialogContentText
            sx={{
              fontSize: '1rem',
              color: tokens.color.neutral[600],
              lineHeight: 1.6,
            }}
          >
            Are you sure you want to deactivate <strong>{client.first_name} {client.last_name}</strong>?
            This will make their account inactive but preserve all data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              borderRadius: tokens.spacing.radius.full,
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isDeletingClient}
            sx={{
              borderRadius: tokens.spacing.radius.full,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${tokens.color.error[500]}, ${tokens.color.error[600]})`,
              boxShadow: `0 4px 12px ${tokens.color.error[500]}40`,

              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.color.error[600]}, ${tokens.color.error[700]})`,
                transform: 'translateY(-1px)',
                boxShadow: `0 6px 16px ${tokens.color.error[500]}50`,
              }
            }}
          >
            {isDeletingClient ? <ModernLoadingSpinner size={20} variant="circular" /> : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </ModernPageLayout>
  );
};