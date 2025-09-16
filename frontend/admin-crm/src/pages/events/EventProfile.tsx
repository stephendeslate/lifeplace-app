// Modern Glassmorphic Event Profile
// Enhanced with world-class design patterns and sophisticated styling

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
  Tab,
  Tabs,
  Container,
  Fade,
  Grow,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Launch as LaunchIcon,
  EventNote as EventNoteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  LocalAtm as CashIcon,
  TrendingUp as TrendingUpIcon,
  Message as MessageIcon,
  Description as ContractIcon,
  Receipt as QuoteIcon,
  Payment as InvoiceIcon,
  Assignment as QuestionnaireIcon,
  Folder as FilesIcon,
  Note as NoteIcon,
  Schedule as ScheduleIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useEvents } from '../../hooks/useEvents';
import { useClients } from '../../hooks/useClients';
import { useCommunications } from '../../hooks/useCommunications';
import { useQuestionnaires } from '../../hooks/useQuestionnaires';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { createTransition } from '../../design-system/utils/animations';
import { EventForm } from '../../components/events/EventForm';
import { EventCommunications } from '../../components/events/EventCommunications';
import { EventQuestionnaires } from '../../components/events/EventQuestionnaires';
import { EventQuotes } from '../../components/events/EventQuotes';
import { EventContracts } from '../../components/events/EventContracts';
import { EventInvoices } from '../../components/events/EventInvoices';
import { EventFiles } from '../../components/events/EventFiles';
import { NotesList } from '../../components/notes';
import { 
  ActivityTimeline,
  FinancialSummary,
  WorkflowVisualization,
  calculateEventFinancials,
  type ActivityItem,
} from '../../components/common';
import { EVENT_STATUSES, type UpdateEventData } from '../../types/events.types';

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [createThreadDialogOpen, setCreateThreadDialogOpen] = useState(false);
  
  // Hooks
  const { 
    useEvent,
    updateEvent,
    isUpdatingEvent,
    deleteEvent,
    isDeletingEvent
  } = useEvents();
  
  const { useClient } = useClients();
  const { useRecords } = useCommunications();
  
  // Get user's currency settings for proper formatting
  const { settings: currencySettings } = useCurrencySettings();
  
  // Format event price based on user's currency settings
  const formatEventPrice = (price: string | number) => {
    const currency = currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(price, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };
  
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
  
  // Get counts for tabs
  const { data: communications = [] } = useRecords({ client_id: clientId });
  const communicationsCount = communications.length;
  // Get available questionnaires for this event type
  const { useActiveQuestionnaires } = useQuestionnaires();
  const { data: allQuestionnaires = [] } = useActiveQuestionnaires();

  // Count questionnaires for this event type
  const questionnairesCount = useMemo(() => {
    return allQuestionnaires.filter(q => 
      q.event_type === event?.event_type || q.event_type === null
    ).length;
  }, [allQuestionnaires, event?.event_type]);

  // Enhanced components data
  const financialMetrics = useMemo(() => {
    return event ? calculateEventFinancials(event) : [];
  }, [event]);



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
        relatedEntity: client ? {
          type: 'client',
          id: clientId,
          name: client.first_name + ' ' + client.last_name
        } : undefined,
        user: { name: 'System' }, // This would come from the API
      });
    });

    // Add event status changes as activities
    if (event) {
      items.push({
        id: `event-created-${event.id}`,
        type: 'event',
        title: 'Event Created',
        description: `Event "${event.name}" was created`,
        timestamp: event.created_at,
        status: 'completed',
        user: { name: 'System' },
      });

      if (event.updated_at !== event.created_at) {
        items.push({
          id: `event-updated-${event.id}`,
          type: 'status_change',
          title: 'Event Updated',
          description: `Event status changed to ${event.status}`,
          timestamp: event.updated_at,
          status: 'completed',
          user: { name: 'System' },
        });
      }
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [communications, event, client, clientId]);

  useEffect(() => {
    if (event) {
      setBreadcrumbs([
        { label: 'Events', path: '/events' },
        { label: event.name || `Event #${event.id}` },
      ]);
    }
    // Trigger loading animation
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
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

  const handleEdit = (data: UpdateEventData) => {
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

  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'LEAD':
        return 'info';
      case 'CONFIRMED':
        return 'success';
      case 'COMPLETED':
        return 'primary';
      case 'CANCELLED':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'PAID':
        return {
          colorScheme: 'success',
          background: tokens.color.success[500],
          textColor: tokens.color.success[700]
        };
      case 'PARTIAL':
        return {
          colorScheme: 'warning', 
          background: tokens.color.warning[500],
          textColor: tokens.color.warning[700]
        };
      case 'PENDING':
        return {
          colorScheme: 'info',
          background: tokens.color.info[500], 
          textColor: tokens.color.info[700]
        };
      case 'OVERDUE':
        return {
          colorScheme: 'error',
          background: tokens.color.error[500],
          textColor: tokens.color.error[700]
        };
      case 'REFUNDED':
        return {
          colorScheme: 'secondary',
          background: tokens.color.secondary[500],
          textColor: tokens.color.secondary[700]
        };
      default:
        return {
          colorScheme: 'primary',
          background: tokens.color.primary[500],
          textColor: tokens.color.primary[700]
        };
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
      <Box sx={{ 
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, ${tokens.color.primary[500]}06 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, ${tokens.color.success[500]}06 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: -1,
        }
      }}>
        <CircularProgress size={40} sx={{ color: tokens.color.primary[600] }} />
      </Box>
    );
  }

  if (error || !event) {
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
            radial-gradient(circle at 20% 20%, ${tokens.color.error[500]}06 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, ${tokens.color.neutral[500]}06 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: -1,
        }
      }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/events')}
            sx={{
              ...glassPresets.light,
              borderRadius: tokens.spacing.radius.xl,
              border: `1px solid ${tokens.color.neutral[500]}30`,
              color: tokens.color.neutral[700],
              fontWeight: 600,
              mb: 3,
              transition: createTransition(['transform', 'background'], 'fast'),
              
              '&:hover': {
                ...glassPresets.medium,
                transform: 'translateY(-1px)',
              }
            }}
          >
            Back to Events
          </Button>
          <Alert 
            severity="error"
            sx={{
              ...glassPresets.medium,
              borderRadius: tokens.spacing.radius.xxl,
              border: `1px solid ${tokens.color.error[500]}30`,
              background: `linear-gradient(135deg, ${tokens.color.error[500]}08 0%, transparent 100%)`,
            }}
          >
            {error ? 'Failed to load event information' : 'Event not found'}
          </Alert>
        </Container>
      </Box>
    );
  }

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
          radial-gradient(circle at 20% 20%, ${tokens.color.primary[500]}06 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, ${tokens.color.success[500]}06 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, ${tokens.color.secondary[500]}04 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: -1,
      }
    }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Modern Header */}
        <Fade in={isLoaded} timeout={500}>
          <Box sx={{ mb: { xs: 3, md: 4 } }}>
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
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
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}08 0%, ${tokens.color.success[500]}08 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                }
              }}
            >
              <Box display="flex" alignItems="center" gap={3} sx={{ position: 'relative', zIndex: 1 }}>
                <Tooltip title="Back to Events">
                  <IconButton 
                    onClick={() => navigate('/events')}
                    sx={{
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.full,
                      width: 48,
                      height: 48,
                      color: tokens.color.primary[600],
                      transition: createTransition(['transform', 'background'], 'fast'),
                      
                      '&:hover': {
                        ...glassPresets.medium,
                        transform: 'translateX(-2px)',
                      }
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                </Tooltip>
                
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
                      mb: 0.5,
                      lineHeight: 1.2,
                    }}
                  >
                    {event.name || 'Untitled Event'}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: tokens.color.neutral[600],
                      fontWeight: 400,
                    }}
                  >
                    {event.event_type_name || 'No event type'}
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" alignItems="center" gap={2} sx={{ position: 'relative', zIndex: 1 }}>
                {/* Enhanced Status Chip */}
                <Chip
                  label={EVENT_STATUSES.find(s => s.value === event.status)?.label || event.status}
                  sx={{
                    ...glassPresets.light,
                    background: `linear-gradient(135deg, ${tokens.color[getStatusColor(event.status) === 'success' ? 'success' : getStatusColor(event.status) === 'error' ? 'error' : getStatusColor(event.status) === 'warning' ? 'warning' : 'primary'][500]}20 0%, ${tokens.color[getStatusColor(event.status) === 'success' ? 'success' : getStatusColor(event.status) === 'error' ? 'error' : getStatusColor(event.status) === 'warning' ? 'warning' : 'primary'][600]}15 100%)`,
                    color: tokens.color[getStatusColor(event.status) === 'success' ? 'success' : getStatusColor(event.status) === 'error' ? 'error' : getStatusColor(event.status) === 'warning' ? 'warning' : 'primary'][700],
                    border: `1px solid ${tokens.color[getStatusColor(event.status) === 'success' ? 'success' : getStatusColor(event.status) === 'error' ? 'error' : getStatusColor(event.status) === 'warning' ? 'warning' : 'primary'][500]}30`,
                    fontWeight: 600,
                  }}
                />

                {/* Direct Action Buttons */}
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditEvent}
                  sx={{
                    borderColor: tokens.color.primary[500],
                    color: tokens.color.primary[600],
                    borderRadius: tokens.spacing.radius.lg,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
                    py: 1,
                    transition: createTransition(['background', 'border-color', 'transform'], 'fast'),
                    '&:hover': {
                      borderColor: tokens.color.primary[600],
                      background: `${tokens.color.primary[500]}10`,
                      transform: 'translateY(-1px)',
                    }
                  }}
                >
                  Edit
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<ContractIcon />}
                  onClick={() => {
                    console.log('Send contract:', event.id);
                    // Open contract sending dialog
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
                      borderColor: tokens.color.primary[500],
                      background: `${tokens.color.primary[500]}05`,
                      transform: 'translateY(-1px)',
                    }
                  }}
                >
                  Contract
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<InvoiceIcon />}
                  onClick={() => {
                    console.log('Generate invoice:', event.id);
                    // Open invoice generation dialog
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
                  Invoice
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={() => {
                    console.log('Send message:', event.id);
                    // Open message dialog
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
                      borderColor: tokens.color.info[500],
                      background: `${tokens.color.info[500]}05`,
                      transform: 'translateY(-1px)',
                    }
                  }}
                >
                  Message
                </Button>

                {/* More Actions Menu for additional options */}
                <Tooltip title="More actions">
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
                </Tooltip>
                
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    sx: {
                      ...glassPresets.medium,
                      borderRadius: tokens.spacing.radius.xl,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      mt: 1,
                    }
                  }}
                >
                  <MenuItem 
                    onClick={handleDeleteEvent} 
                    sx={{ 
                      color: tokens.color.error[600],
                      borderRadius: tokens.spacing.radius.lg,
                      mx: 1,
                      transition: createTransition('background', 'fast'),
                      '&:hover': {
                        background: `${tokens.color.error[500]}10`,
                      }
                    }}
                  >
                    <ListItemIcon>
                      <DeleteIcon sx={{ color: tokens.color.error[600] }} />
                    </ListItemIcon>
                    <ListItemText>Delete Event</ListItemText>
                  </MenuItem>
                  
                  <Divider sx={{ mx: 1, borderColor: `${tokens.color.borders.glass}` }} />
                  
                  <MenuItem 
                    onClick={() => navigate(`/events/${event.id}/duplicate`)}
                    sx={{
                      borderRadius: tokens.spacing.radius.lg,
                      mx: 1,
                      transition: createTransition('background', 'fast'),
                      '&:hover': {
                        background: `${tokens.color.primary[500]}10`,
                      }
                    }}
                  >
                    <ListItemIcon>
                      <ContentCopyIcon sx={{ color: tokens.color.primary[600] }} />
                    </ListItemIcon>
                    <ListItemText>Duplicate Event</ListItemText>
                  </MenuItem>

                  <MenuItem 
                    onClick={() => navigate(`/events/${event.id}/export`)}
                    sx={{
                      borderRadius: tokens.spacing.radius.lg,
                      mx: 1,
                      transition: createTransition('background', 'fast'),
                      '&:hover': {
                        background: `${tokens.color.primary[500]}10`,
                      }
                    }}
                  >
                    <ListItemIcon>
                      <DownloadIcon sx={{ color: tokens.color.primary[600] }} />
                    </ListItemIcon>
                    <ListItemText>Export Details</ListItemText>
                  </MenuItem>
                </Menu>
              </Box>
            </Box>
          </Box>
        </Fade>

        {/* Enhanced Event Overview Cards */}
        <Fade in={isLoaded} timeout={700}>
          <Box 
            sx={{ 
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
              gap: 3,
              mb: 4,
              
              // Staggered animation for cards
              '& > div': {
                '&:nth-of-type(1)': { animationDelay: '100ms' },
                '&:nth-of-type(2)': { animationDelay: '200ms' },
                '&:nth-of-type(3)': { animationDelay: '300ms' },
              }
            }}
          >
            {/* Enhanced Client Info */}
            <Card
              elevation={0}
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.xxl,
                border: `1px solid ${tokens.color.borders.glass}`,
                position: 'relative',
                overflow: 'visible',
                transition: createTransition(['transform', 'box-shadow'], 'fast'),
                
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.info[500]}04 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                },
                
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: tokens.shadow.glass.light,
                }
              }}
            >
              <CardContent sx={{ position: 'relative', zIndex: 1, p: 4 }}>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        ...glassPresets.medium,
                        borderRadius: tokens.spacing.radius.full,
                        p: 1.5,
                        background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
                        border: `1px solid ${tokens.color.primary[500]}30`,
                      }}
                    >
                      <PersonIcon sx={{ fontSize: 20, color: tokens.color.primary[600] }} />
                    </Box>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold"
                      sx={{ color: tokens.color.neutral[800] }}
                    >
                      Client Information
                    </Typography>
                  </Box>
                  
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.xl,
                        p: 2.5,
                        border: `1px solid ${tokens.color.neutral[500]}20`,
                      }}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          color: tokens.color.neutral[500],
                          fontWeight: 600,
                          mb: 0.5,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontSize: '0.75rem'
                        }}
                      >
                        Client Name
                      </Typography>
                      <Tooltip 
                        title={clientId ? "Click to view client profile" : ""} 
                        placement="top"
                        arrow
                      >
                        <Box
                          onClick={() => clientId && navigate(`/clients/${clientId}`)}
                          sx={{
                            cursor: clientId ? 'pointer' : 'default',
                            borderRadius: tokens.spacing.radius.lg,
                            p: 1,
                            mx: -1,
                            transition: createTransition(['background', 'transform'], 'fast'),
                            '&:hover': clientId ? {
                              background: `${tokens.color.primary[500]}08`,
                              transform: 'translateX(2px)',
                            } : {}
                          }}
                        >
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              color: clientId ? tokens.color.primary[600] : tokens.color.neutral[800],
                              fontWeight: 600,
                              textDecoration: clientId ? 'none' : 'none',
                              '&:hover': clientId ? {
                                textDecoration: 'underline',
                              } : {}
                            }}
                          >
                            {event.client_name || 'Unknown Client'}
                          </Typography>
                          {clientId && (
                            <LaunchIcon 
                              sx={{ 
                                fontSize: '0.9rem', 
                                color: tokens.color.primary[600],
                                opacity: 0.7,
                                transition: createTransition(['opacity', 'transform'], 'fast'),
                                '.MuiBox-root:hover &': {
                                  opacity: 1,
                                  transform: 'scale(1.1)',
                                }
                              }} 
                            />
                          )}
                        </Stack>
                        </Box>
                      </Tooltip>
                    </Box>
                  
                  {client?.email && (
                    <Box
                      sx={{
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.xl,
                        p: 2.5,
                        border: `1px solid ${tokens.color.info[500]}20`,
                        background: `linear-gradient(135deg, ${tokens.color.info[500]}05 0%, transparent 100%)`,
                      }}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          color: tokens.color.neutral[500],
                          fontWeight: 600,
                          mb: 1,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontSize: '0.75rem'
                        }}
                      >
                        Email Address
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.full,
                            p: 1,
                            background: `${tokens.color.info[500]}15`,
                          }}
                        >
                          <EmailIcon sx={{ fontSize: 16, color: tokens.color.info[600] }} />
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: tokens.color.neutral[800],
                            fontWeight: 500
                          }}
                        >
                          {client.email}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {client?.profile?.phone && (
                    <Box
                      sx={{
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.xl,
                        p: 2.5,
                        border: `1px solid ${tokens.color.success[500]}20`,
                        background: `linear-gradient(135deg, ${tokens.color.success[500]}05 0%, transparent 100%)`,
                      }}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          color: tokens.color.neutral[500],
                          fontWeight: 600,
                          mb: 1,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontSize: '0.75rem'
                        }}
                      >
                        Phone Number
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.full,
                            p: 1,
                            background: `${tokens.color.success[500]}15`,
                          }}
                        >
                          <PhoneIcon sx={{ fontSize: 16, color: tokens.color.success[600] }} />
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: tokens.color.neutral[800],
                            fontWeight: 500
                          }}
                        >
                          {client.profile.phone}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  {client?.profile?.company && (
                    <Box
                      sx={{
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.xl,
                        p: 2.5,
                        border: `1px solid ${tokens.color.warning[500]}20`,
                        background: `linear-gradient(135deg, ${tokens.color.warning[500]}05 0%, transparent 100%)`,
                      }}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          color: tokens.color.neutral[500],
                          fontWeight: 600,
                          mb: 1,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontSize: '0.75rem'
                        }}
                      >
                        Company
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.full,
                            p: 1,
                            background: `${tokens.color.warning[500]}15`,
                          }}
                        >
                          <BusinessIcon sx={{ fontSize: 16, color: tokens.color.warning[600] }} />
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: tokens.color.neutral[800],
                            fontWeight: 500
                          }}
                        >
                          {client.profile.company}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Enhanced Event Details */}
            <Card
              elevation={0}
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.xxl,
                border: `1px solid ${tokens.color.borders.glass}`,
                position: 'relative',
                overflow: 'visible',
                transition: createTransition(['transform', 'box-shadow'], 'fast'),
                
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(135deg, ${tokens.color.secondary[500]}04 0%, ${tokens.color.warning[500]}04 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                },
                
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: tokens.shadow.glass.light,
                }
              }}
            >
              <CardContent sx={{ position: 'relative', zIndex: 1, p: 4 }}>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        ...glassPresets.medium,
                        borderRadius: tokens.spacing.radius.full,
                        p: 1.5,
                        background: `linear-gradient(135deg, ${tokens.color.secondary[500]}15 0%, ${tokens.color.secondary[600]}10 100%)`,
                        border: `1px solid ${tokens.color.secondary[500]}30`,
                      }}
                    >
                      <EventNoteIcon sx={{ fontSize: 20, color: tokens.color.secondary[600] }} />
                    </Box>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold"
                      sx={{ color: tokens.color.neutral[800] }}
                    >
                      Event Details
                    </Typography>
                  </Box>
                  
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.xl,
                        p: 2.5,
                        border: `1px solid ${tokens.color.info[500]}20`,
                        background: `linear-gradient(135deg, ${tokens.color.info[500]}05 0%, transparent 100%)`,
                      }}
                    >
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          color: tokens.color.neutral[500],
                          fontWeight: 600,
                          mb: 1,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontSize: '0.75rem'
                        }}
                      >
                        Date & Time
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.full,
                            p: 1,
                            background: `${tokens.color.info[500]}15`,
                          }}
                        >
                          <ScheduleIcon sx={{ fontSize: 16, color: tokens.color.info[600] }} />
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: tokens.color.neutral[800],
                            fontWeight: 500,
                            flex: 1
                          }}
                        >
                          {formatDateRange(event.start_date, event.end_date)}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {event.total_price && (
                      <Box
                        sx={{
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.xl,
                          p: 2.5,
                          border: `1px solid ${tokens.color.success[500]}20`,
                          background: `linear-gradient(135deg, ${tokens.color.success[500]}08 0%, transparent 100%)`,
                        }}
                      >
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: tokens.color.neutral[500],
                            fontWeight: 600,
                            mb: 1,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: '0.75rem'
                          }}
                        >
                          Total Investment
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box
                            sx={{
                              ...glassPresets.light,
                              borderRadius: tokens.spacing.radius.full,
                              p: 1,
                              background: `${tokens.color.success[500]}20`,
                            }}
                          >
                            <CashIcon sx={{ fontSize: 16, color: tokens.color.success[700] }} />
                          </Box>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: tokens.color.success[700],
                              fontWeight: 700
                            }}
                          >
                            {formatEventPrice(event.current_total_amount || event.total_price)}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {event.lead_source && (
                      <Box
                        sx={{
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.xl,
                          p: 2.5,
                          border: `1px solid ${tokens.color.warning[500]}20`,
                          background: `linear-gradient(135deg, ${tokens.color.warning[500]}05 0%, transparent 100%)`,
                        }}
                      >
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: tokens.color.neutral[500],
                            fontWeight: 600,
                            mb: 1,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: '0.75rem'
                          }}
                        >
                          Lead Source
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box
                            sx={{
                              ...glassPresets.light,
                              borderRadius: tokens.spacing.radius.full,
                              p: 1,
                              background: `${tokens.color.warning[500]}15`,
                            }}
                          >
                            <TrendingUpIcon sx={{ fontSize: 16, color: tokens.color.warning[600] }} />
                          </Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: tokens.color.neutral[800],
                              fontWeight: 500
                            }}
                          >
                            {event.lead_source}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {event.payment_status && (() => {
                      const paymentColors = getPaymentStatusColor(event.payment_status);
                      return (
                        <Box
                          sx={{
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.xl,
                            p: 2.5,
                            border: `1px solid ${paymentColors.background}20`,
                            background: `linear-gradient(135deg, ${paymentColors.background}05 0%, transparent 100%)`,
                          }}
                        >
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              color: tokens.color.neutral[500],
                              fontWeight: 600,
                              mb: 1.5,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              fontSize: '0.75rem'
                            }}
                          >
                            Payment Status
                          </Typography>
                          <Chip 
                            label={event.payment_status.replace('_', ' ')} 
                            sx={{
                              ...glassPresets.light,
                              background: `linear-gradient(135deg, ${paymentColors.background}20 0%, ${paymentColors.background}15 100%)`,
                              color: paymentColors.textColor,
                              border: `1px solid ${paymentColors.background}30`,
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      );
                    })()}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Enhanced Workflow Visualization */}
            <Card
              elevation={0}
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.xxl,
                border: `1px solid ${tokens.color.borders.glass}`,
                position: 'relative',
                overflow: 'visible',
                transition: createTransition(['transform', 'box-shadow'], 'fast'),
                
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(135deg, ${tokens.color.warning[500]}04 0%, ${tokens.color.info[500]}04 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                },
                
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: tokens.shadow.glass.light,
                }
              }}
            >
              <CardContent sx={{ position: 'relative', zIndex: 1, p: 4 }}>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        ...glassPresets.medium,
                        borderRadius: tokens.spacing.radius.full,
                        p: 1.5,
                        background: `linear-gradient(135deg, ${tokens.color.warning[500]}15 0%, ${tokens.color.warning[600]}10 100%)`,
                        border: `1px solid ${tokens.color.warning[500]}30`,
                      }}
                    >
                      <ScheduleIcon sx={{ fontSize: 20, color: tokens.color.warning[600] }} />
                    </Box>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold"
                      sx={{ color: tokens.color.neutral[800] }}
                    >
                      Workflow Progress
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <WorkflowVisualization
                      workflowName={event.workflow_template_name}
                      stages={[]} // This would come from actual workflow data
                      currentStage={event.current_stage || undefined}
                      overallProgress={event.workflow_progress}
                      layout="vertical"
                      showTasks={false}
                      showProgress={true}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

          </Box>
        </Fade>

        {/* Enhanced Sections */}
        <Grow in={isLoaded} timeout={1000}>
          <Stack spacing={4} mb={4}>
            {/* Enhanced Financial Summary */}
            <Box
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.xxl,
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
                  background: `linear-gradient(135deg, ${tokens.color.success[500]}04 0%, ${tokens.color.info[500]}04 100%)`,
                  borderRadius: tokens.spacing.radius.xxl,
                  pointerEvents: 'none',
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1, p: 4 }}>
                <FinancialSummary
                  title="Event Financials"
                  metrics={financialMetrics}
                  compactMode={false}
                />
              </Box>
            </Box>


          </Stack>
        </Grow>

        {/* Enhanced Modern Tabs */}
        <Fade in={isLoaded} timeout={1200}>
          <Card
            elevation={0}
            sx={{
              ...glassPresets.light,
              borderRadius: tokens.spacing.radius.xxl,
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
                background: `linear-gradient(135deg, ${tokens.color.neutral[500]}02 0%, ${tokens.color.primary[500]}02 100%)`,
                borderRadius: tokens.spacing.radius.xxl,
                pointerEvents: 'none',
              }
            }}
          >
            <Box 
              sx={{ 
                borderBottom: `1px solid ${tokens.color.borders.glass}`,
                position: 'relative',
                zIndex: 1,
                background: glassPresets.light.background,
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
                  '& .MuiTabs-indicator': {
                    background: tokens.color.backgrounds.primaryGradient,
                    height: 3,
                    borderRadius: tokens.spacing.radius.full,
                  },
                  '& .MuiTab-root': {
                    color: tokens.color.neutral[600],
                    fontWeight: 600,
                    textTransform: 'none',
                    minHeight: 60,
                    transition: createTransition(['color', 'background'], 'fast'),
                    borderRadius: tokens.spacing.radius.lg,
                    margin: '8px 4px',
                    
                    '&:hover': {
                      color: tokens.color.primary[700],
                      background: `${tokens.color.primary[500]}08`,
                    },
                    
                    '&.Mui-selected': {
                      color: tokens.color.primary[700],
                      background: `${tokens.color.primary[500]}12`,
                    }
                  }
                }}
              >
            <Tab 
              label={`Activity (${activityItems.length})`}
              icon={<ScheduleIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Communications (${communicationsCount})`} 
              icon={<MessageIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Messages" 
              icon={<MessageIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Quotes" 
              icon={<QuoteIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Contracts" 
              icon={<ContractIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Invoices" 
              icon={<InvoiceIcon />} 
              iconPosition="start"
            />
            <Tab 
              label={`Questionnaires (${questionnairesCount})`} 
              icon={<QuestionnaireIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Files" 
              icon={<FilesIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Notes" 
              icon={<NoteIcon />} 
              iconPosition="start"
            />
          </Tabs>
            </Box>

            <CardContent sx={{ position: 'relative', zIndex: 1, p: 4 }}>
          {/* Activity Tab */}
          <TabPanel value={tabValue} index={0}>
            <ActivityTimeline
              activities={activityItems}
              maxHeight="600px"
              showFilters={true}
              onRefresh={() => {
                refetch();
              }}
            />
          </TabPanel>

          {/* Communications Tab */}
          <TabPanel value={tabValue} index={1}>
            <EventCommunications
              event={event}
              clientId={clientId}
              clientEmail={client?.email || ''}
              clientName={event.client_name || 'Unknown Client'}
            />
          </TabPanel>

          {/* Messages Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Messages for {event.name}
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
              title={`Messages for ${event.name}`}
              subtitle={`Event communications for ${event.name} with ${event.client_name || 'client'}`}
              height="600px"
              enableThreadList={true}
              enableRealTime={true}
              enableSearch={true}
              enableFileUploads={true}
              initialFilters={{ event_id: event.id }}
              onError={(error) => {
                console.error('Messaging error:', error);
              }}
            />
          </TabPanel>

          {/* Quotes Tab */}
          <TabPanel value={tabValue} index={3}>
            <EventQuotes event={event} />
          </TabPanel>

          {/* Contracts Tab */}
          <TabPanel value={tabValue} index={4}>
            <EventContracts event={event} />
          </TabPanel>

          {/* Invoices Tab */}
          <TabPanel value={tabValue} index={5}>
            <EventInvoices event={event} />
          </TabPanel>

          {/* Questionnaires Tab */}
          <TabPanel value={tabValue} index={6}>
            <EventQuestionnaires event={event} />
          </TabPanel>

          {/* Files Tab */}
          <TabPanel value={tabValue} index={7}>
            <EventFiles event={event} />
          </TabPanel>

          {/* Notes Tab */}
          <TabPanel value={tabValue} index={8}>
            <NotesList
              contentType="event"
              objectId={eventId}
              objectName={event.name || `Event #${event.id}`}
              allowCreate={true}
              allowEdit={true}
              allowDelete={true}
            />
          </TabPanel>
            </CardContent>
          </Card>
        </Fade>

        {/* Enhanced Edit Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              ...glassPresets.strong,
              borderRadius: tokens.spacing.radius.xxxl,
              border: `1px solid ${tokens.color.borders.glass}`,
              boxShadow: tokens.shadow.component.modal,
            }
          }}
          BackdropProps={{
            sx: {
              backdropFilter: 'blur(20px)',
              background: 'rgba(0, 0, 0, 0.3)',
            }
          }}
        >
          <DialogTitle 
            sx={{
              background: glassPresets.light.background,
              borderRadius: `${tokens.spacing.radius.xxxl} ${tokens.spacing.radius.xxxl} 0 0`,
              borderBottom: `1px solid ${tokens.color.borders.glass}`,
              color: tokens.color.neutral[800],
              fontWeight: 700,
            }}
          >
            Edit Event
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <EventForm
              event={event}
              onSubmit={handleEdit}
              onCancel={() => setEditDialogOpen(false)}
              isLoading={isUpdatingEvent}
            />
          </DialogContent>
        </Dialog>

        {/* Enhanced Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              ...glassPresets.strong,
              borderRadius: tokens.spacing.radius.xxxl,
              border: `1px solid ${tokens.color.error[500]}30`,
              boxShadow: tokens.shadow.component.modal,
            }
          }}
          BackdropProps={{
            sx: {
              backdropFilter: 'blur(20px)',
              background: 'rgba(239, 68, 68, 0.1)',
            }
          }}
        >
          <DialogTitle
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.error[500]}08 0%, transparent 100%)`,
              borderRadius: `${tokens.spacing.radius.xxxl} ${tokens.spacing.radius.xxxl} 0 0`,
              borderBottom: `1px solid ${tokens.color.error[500]}20`,
              color: tokens.color.error[700],
              fontWeight: 700,
            }}
          >
            Delete Event
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <DialogContentText sx={{ color: tokens.color.neutral[700] }}>
              Are you sure you want to delete "{event.name || 'this event'}"? 
              This action cannot be undone and will remove all associated data.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={() => setDeleteDialogOpen(false)}
              sx={{
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.xl,
                color: tokens.color.neutral[700],
                fontWeight: 600,
                px: 3,
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              variant="contained"
              disabled={isDeletingEvent}
              sx={{
                background: tokens.color.backgrounds.errorGradient,
                borderRadius: tokens.spacing.radius.xl,
                fontWeight: 600,
                px: 3,
                boxShadow: `0 4px 12px ${tokens.color.error[500]}25`,
                
                '&:hover': {
                  background: tokens.color.backgrounds.errorGradient,
                  transform: 'translateY(-1px)',
                  boxShadow: `0 6px 16px ${tokens.color.error[500]}35`,
                }
              }}
            >
              {isDeletingEvent ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Thread Dialog */}
        <CreateThreadDialog
          open={createThreadDialogOpen}
          onClose={() => setCreateThreadDialogOpen(false)}
          preSelectedClient={client}
          preSelectedEvent={event}
        />
      </Container>
    </Box>
  );
};