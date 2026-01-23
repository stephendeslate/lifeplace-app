// Event Profile Page
// Flat, simple styling consistent with Analytics page pattern

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  Tooltip,
  TextField,
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
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  Warning as WarningIcon,
  Timer as TimerIcon,
  EventBusy as NoShowIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useLayout } from '../../contexts/LayoutContext';
import { useEvents } from '../../hooks/useEvents';
import { eventsApi } from '../../apis/events.api';
import { useClients } from '../../hooks/useClients';
import { useCommunications } from '../../hooks/useCommunications';
import { useQuestionnaires } from '../../hooks/useQuestionnaires';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { useWorkflowStages } from '../../hooks/useWorkflows';
import { formatCurrency } from '../../utils/currency';
import { ModernPageLayout } from '../../components/common/ModernPageLayout';
import { ModernPageHeader, type HeaderAction } from '../../components/common/ModernPageHeader';
import { EventForm } from '../../components/events/EventForm';
import { EventCommunications } from '../../components/events/EventCommunications';
import { EventQuestionnaires } from '../../components/events/EventQuestionnaires';
import { EventQuotes } from '../../components/events/EventQuotes';
import { EventContracts } from '../../components/events/EventContracts';
import { EventInvoices } from '../../components/events/EventInvoices';
import { EventFiles } from '../../components/events/EventFiles';
import { InquiryDetails } from '../../components/events/InquiryDetails';
import { NotesList } from '../../components/notes';
import {
  ActivityTimeline,
  FinancialSummary,
  WorkflowVisualization,
  calculateEventFinancials,
  DateTimeFull,
  type ActivityItem,
} from '../../components/common';
import { EVENT_STATUSES, type UpdateEventData } from '../../types/events.types';
import type { WorkflowStage as WorkflowStageType } from '../../types/workflows.types';

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

  // Check-in/out state
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);

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
  const { useStagesForTemplate } = useWorkflowStages();

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

  // Get workflow stages for the event's template
  const templateId = typeof event?.workflow_template === 'object' && event.workflow_template !== null
    ? event.workflow_template.id
    : typeof event?.workflow_template === 'number'
    ? event.workflow_template
    : 0;
  const { data: workflowStages = [], isLoading: isLoadingStages } = useStagesForTemplate(templateId);

  // Get counts for tabs - filter by event_id to only show communications for this specific event
  const { data: communications = [] } = useRecords({ event_id: eventId });
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

  // Transform workflow stages data for visualization component
  const transformedWorkflowStages = useMemo(() => {
    if (!workflowStages.length || !event) return [];

    // Get current stage info
    const currentStageObj = typeof event.current_stage === 'object' && event.current_stage !== null
      ? event.current_stage
      : null;

    // Stage type ordering (must match backend)
    const stageTypeOrder: Record<string, number> = {
      'LEAD': 1,
      'PRODUCTION': 2,
      'POST_PRODUCTION': 3
    };

    return workflowStages.map((stage: WorkflowStageType) => {
      // Determine stage status based on current stage and event progress
      let status: 'completed' | 'active' | 'pending' | 'blocked' | 'skipped' = 'pending';

      if (currentStageObj && stage.id === currentStageObj.id) {
        status = 'active';
      } else if (currentStageObj) {
        // Compare by stage type first, then by order within same type
        const currentTypeOrder = stageTypeOrder[currentStageObj.stage] || 0;
        const stageTypeOrderVal = stageTypeOrder[stage.stage] || 0;

        if (stageTypeOrderVal < currentTypeOrder) {
          // Earlier stage type = completed
          status = 'completed';
        } else if (stageTypeOrderVal > currentTypeOrder) {
          // Later stage type = pending
          status = 'pending';
        } else {
          // Same stage type, compare by order
          if (stage.order < currentStageObj.order) {
            status = 'completed';
          }
        }
      }

      // Find associated tasks for this stage
      const stageTasks = event.tasks?.filter(task => task.workflow_stage === stage.id) || [];

      return {
        id: stage.id,
        name: stage.name,
        description: stage.task_description,
        status,
        order: stage.order,
        tasks: stageTasks.map(task => ({
          id: task.id,
          name: task.title,
          status: task.status === 'COMPLETED' ? 'completed' as const :
                  task.status === 'PENDING' ? 'pending' as const : 'active' as const,
          completedAt: task.completed_at || undefined,
          assignedTo: task.assigned_to_name ? {
            id: task.assigned_to || 0,
            name: task.assigned_to_name,
          } : undefined,
          priority: task.priority?.toLowerCase() as 'low' | 'medium' | 'high' | 'urgent' | undefined,
          dueDate: task.due_date || undefined,
        })),
        completedAt: status === 'completed' ? stage.updated_at : undefined,
        dueDate: stageTasks.find(t => t.due_date)?.due_date || undefined,
      };
    }).sort((a, b) => a.order - b.order);
  }, [workflowStages, event]);

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
        user: { name: 'System' },
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
          refetch();
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

  // Check-in/out handlers
  const handleCheckIn = async () => {
    setIsProcessingCheckIn(true);
    try {
      await eventsApi.checkIn(eventId, checkInNotes);
      setCheckInDialogOpen(false);
      setCheckInNotes('');
      refetch();
    } catch (error) {
      console.error('Check-in failed:', error);
    } finally {
      setIsProcessingCheckIn(false);
    }
  };

  const handleCheckout = async () => {
    setIsProcessingCheckIn(true);
    try {
      await eventsApi.checkout(eventId, checkOutNotes, true);
      setCheckOutDialogOpen(false);
      setCheckOutNotes('');
      refetch();
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsProcessingCheckIn(false);
    }
  };

  const handleNoShow = async () => {
    setIsProcessingCheckIn(true);
    try {
      await eventsApi.markNoShow(eventId, 'Marked as no-show by admin');
      setNoShowDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('No-show marking failed:', error);
    } finally {
      setIsProcessingCheckIn(false);
    }
  };

  const formatCheckInTime = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canPerformCheckIn = () => {
    if (!event) return false;
    if (event.check_in_status !== 'PENDING') return false;
    if (event.status === 'CANCELLED') return false;
    // Allow check-in if event date is today or in the past
    const eventDate = new Date(event.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate <= today;
  };

  const canPerformCheckout = () => {
    return event?.check_in_status === 'CHECKED_IN';
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

  if (isLoading) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </ModernPageLayout>
    );
  }

  if (error || !event) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/events')}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Back to Events
        </Button>
        <Alert severity="error">
          {error ? 'Failed to load event information' : 'Event not found'}
        </Alert>
      </ModernPageLayout>
    );
  }

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Page Header */}
      <ModernPageHeader
        title={event.name || 'Untitled Event'}
        subtitle={event.event_type_name || 'No event type'}
        icon={<EventNoteIcon />}
        status={{
          label: EVENT_STATUSES.find(s => s.value === event.status)?.label || event.status,
          color: getStatusColor(event.status) as 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info',
          variant: 'outlined',
        }}
        primaryAction={{
          label: 'Edit',
          onClick: handleEditEvent,
          icon: <EditIcon />,
          variant: 'contained',
          color: 'primary',
        }}
        secondaryActions={[
          {
            label: 'Back to Events',
            onClick: () => navigate('/events'),
            icon: <ArrowBackIcon />,
            variant: 'outlined',
            tooltip: 'Back to Events',
          } as HeaderAction,
          {
            label: 'More',
            onClick: handleMenuClick,
            icon: <MoreVertIcon />,
            variant: 'icon',
            tooltip: 'More actions',
          } as HeaderAction,
        ]}
      />

      {/* More Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteEvent} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon color="error" />
          </ListItemIcon>
          <ListItemText>Delete Event</ListItemText>
        </MenuItem>
      </Menu>

      {/* Event Overview Cards */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
          mb: 4,
        }}
      >
        {/* Client Info */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3, height: '100%' }}>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <PersonIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Client Information
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Client Name
                  </Typography>
                  <Tooltip title={clientId ? "Click to view client profile" : ""} placement="top" arrow>
                    <Box
                      onClick={() => clientId && navigate(`/clients/${clientId}`)}
                      sx={{ cursor: clientId ? 'pointer' : 'default', mt: 0.5 }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body1" color={clientId ? 'primary' : 'text.primary'} fontWeight={600}>
                          {event.client_name || 'Unknown Client'}
                        </Typography>
                        {clientId && <LaunchIcon sx={{ fontSize: '0.9rem' }} color="primary" />}
                      </Stack>
                    </Box>
                  </Tooltip>
                </Box>

                {client?.email && (
                  <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                      Email Address
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                      <EmailIcon color="action" sx={{ fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={500}>{client.email}</Typography>
                    </Box>
                  </Box>
                )}

                {client?.profile?.phone && (
                  <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                      Phone Number
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                      <PhoneIcon color="action" sx={{ fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={500}>{client.profile.phone}</Typography>
                    </Box>
                  </Box>
                )}

                {client?.profile?.company && (
                  <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                      Company
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                      <BusinessIcon color="action" sx={{ fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={500}>{client.profile.company}</Typography>
                    </Box>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Box>
        </Box>

        {/* Event Details */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3, height: '100%' }}>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <EventNoteIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">Event Details</Typography>
              </Box>

              <Stack spacing={2}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Date & Time
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mt={1}>
                    <ScheduleIcon color="action" sx={{ fontSize: 20 }} />
                    <DateTimeFull
                      date={event.start_date}
                      showDualTimezone
                      variant="body2"
                      fontWeight={500}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                </Box>

                {event.total_price && (
                  <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                      Total Investment
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                      <CashIcon color="action" sx={{ fontSize: 20 }} />
                      <Typography variant="h6" color="success.main" fontWeight={700}>
                        {formatEventPrice(event.current_total_amount || event.total_price)}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {event.lead_source && (
                  <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                      Lead Source
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                      <TrendingUpIcon color="action" sx={{ fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={500}>{event.lead_source}</Typography>
                    </Box>
                  </Box>
                )}

                {event.num_participants && (
                  <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                      Number of Guests
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mt={1}>
                      <PeopleIcon color="action" sx={{ fontSize: 20 }} />
                      <Typography variant="h6" color="info.main" fontWeight={700}>{event.num_participants}</Typography>
                    </Box>
                  </Box>
                )}

                {event.payment_status && (
                  <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                      Payment Status
                    </Typography>
                    <Box mt={1}>
                      <Chip
                        label={event.payment_status.replace('_', ' ')}
                        color={
                          event.payment_status === 'PAID' ? 'success' :
                          event.payment_status === 'PARTIALLY_PAID' ? 'warning' : 'default'
                        }
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Box>
        </Box>

        {/* Workflow Visualization */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3, height: '100%' }}>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <ScheduleIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">Workflow Progress</Typography>
              </Box>

              <Box sx={{ mt: 2 }}>
                {isLoadingStages ? (
                  <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                      Loading workflow stages...
                    </Typography>
                  </Box>
                ) : (
                  <WorkflowVisualization
                    workflowName={event.workflow_template_name}
                    stages={transformedWorkflowStages}
                    currentStage={
                      typeof event.current_stage === 'object' && event.current_stage !== null
                        ? event.current_stage.id
                        : typeof event.current_stage === 'number'
                        ? event.current_stage
                        : undefined
                    }
                    overallProgress={event.workflow_progress}
                    layout="vertical"
                    showTasks={true}
                    showProgress={true}
                  />
                )}
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Inquiry Details (shown for leads from contact form) */}
      {event.preferences?.inquiry && (
        <Box sx={{ mb: 4 }}>
          <InquiryDetails inquiry={event.preferences.inquiry} />
        </Box>
      )}

      {/* Check-in/Out Tracking Card */}
      {event.status !== 'CANCELLED' && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <TimerIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">Check-in / Checkout</Typography>
                </Box>
                <Chip
                  label={event.check_in_status === 'CHECKED_IN' ? 'Checked In' :
                         event.check_in_status === 'CHECKED_OUT' ? 'Checked Out' :
                         event.check_in_status === 'NO_SHOW' ? 'No Show' : 'Pending'}
                  color={event.check_in_status === 'CHECKED_IN' ? 'success' :
                         event.check_in_status === 'CHECKED_OUT' ? 'info' :
                         event.check_in_status === 'NO_SHOW' ? 'error' : 'default'}
                  variant="outlined"
                />
              </Box>

              {/* Times Display */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                {/* Scheduled Check-in */}
                <Box sx={{ flex: 1, p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Scheduled Check-in
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mt={1}>
                    <CheckInIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500}>{formatCheckInTime(event.scheduled_check_in_time)}</Typography>
                  </Box>
                  {event.actual_check_in_time && (
                    <Box mt={1.5} pt={1.5} sx={{ borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        Actual: {formatCheckInTime(event.actual_check_in_time)}
                      </Typography>
                      {event.checked_in_by_name && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          By: {event.checked_in_by_name}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Scheduled Checkout */}
                <Box sx={{ flex: 1, p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Scheduled Checkout
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2} mt={1}>
                    <CheckOutIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500}>{formatCheckInTime(event.scheduled_checkout_time)}</Typography>
                  </Box>
                  {event.actual_checkout_time && (
                    <Box mt={1.5} pt={1.5} sx={{ borderTop: 1, borderColor: 'divider' }}>
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        Actual: {formatCheckInTime(event.actual_checkout_time)}
                      </Typography>
                      {event.checked_out_by_name && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          By: {event.checked_out_by_name}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Late Checkout Warning */}
              {event.late_checkout_fee_applied && event.late_checkout_fee_amount && (
                <Alert severity="warning" icon={<WarningIcon />}>
                  <Typography variant="body2" fontWeight={600}>
                    Late Checkout Fee Applied: {formatEventPrice(event.late_checkout_fee_amount)}
                  </Typography>
                </Alert>
              )}

              {/* Notes Display */}
              {(event.check_in_notes || event.checkout_notes) && (
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                    Notes
                  </Typography>
                  {event.check_in_notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      <strong>Check-in:</strong> {event.check_in_notes}
                    </Typography>
                  )}
                  {event.checkout_notes && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Checkout:</strong> {event.checkout_notes}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Action Buttons */}
              <Box display="flex" gap={2} flexWrap="wrap">
                {canPerformCheckIn() && (
                  <Button variant="contained" color="success" startIcon={<CheckInIcon />} onClick={() => setCheckInDialogOpen(true)}>
                    Check In Guest
                  </Button>
                )}
                {canPerformCheckout() && (
                  <Button variant="contained" color="primary" startIcon={<CheckOutIcon />} onClick={() => setCheckOutDialogOpen(true)}>
                    Checkout Guest
                  </Button>
                )}
                {event.check_in_status === 'PENDING' && (
                  <Button variant="outlined" color="error" startIcon={<NoShowIcon />} onClick={() => setNoShowDialogOpen(true)}>
                    Mark No Show
                  </Button>
                )}
              </Box>
            </Stack>
          </Box>
        </Box>
      )}

      {/* Financial Summary */}
      <Stack spacing={4} mb={4}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <FinancialSummary
            title="Event Financials"
            metrics={financialMetrics}
            compactMode={false}
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
              label={`Communications (${communicationsCount})`}
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

        <CardContent>
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

          {/* Quotes Tab */}
          <TabPanel value={tabValue} index={2}>
            <EventQuotes event={event} />
          </TabPanel>

          {/* Contracts Tab */}
          <TabPanel value={tabValue} index={3}>
            <EventContracts event={event} />
          </TabPanel>

          {/* Invoices Tab */}
          <TabPanel value={tabValue} index={4}>
            <EventInvoices event={event} />
          </TabPanel>

          {/* Questionnaires Tab */}
          <TabPanel value={tabValue} index={5}>
            <EventQuestionnaires event={event} />
          </TabPanel>

          {/* Files Tab */}
          <TabPanel value={tabValue} index={6}>
            <EventFiles event={event} />
          </TabPanel>

          {/* Notes Tab */}
          <TabPanel value={tabValue} index={7}>
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
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
        <DialogTitle color="error">Delete Event</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{event.name || 'this event'}"?
            This action cannot be undone and will remove all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error" disabled={isDeletingEvent}>
            {isDeletingEvent ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Check-in Dialog */}
      <Dialog open={checkInDialogOpen} onClose={() => setCheckInDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
          <CheckInIcon /> Check In Guest
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Confirm check-in for "{event.name || 'this event'}".
            This will record the current time as the actual check-in time.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Check-in Notes (Optional)"
            placeholder="Add any notes about the check-in..."
            value={checkInNotes}
            onChange={(e) => setCheckInNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setCheckInDialogOpen(false); setCheckInNotes(''); }}>Cancel</Button>
          <Button onClick={handleCheckIn} variant="contained" color="success" disabled={isProcessingCheckIn}>
            {isProcessingCheckIn ? <CircularProgress size={20} color="inherit" /> : 'Confirm Check-in'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkOutDialogOpen} onClose={() => setCheckOutDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
          <CheckOutIcon /> Checkout Guest
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Confirm checkout for "{event.name || 'this event'}".
            This will record the current time as the actual checkout time.
            Any applicable late checkout fees will be calculated automatically.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Checkout Notes (Optional)"
            placeholder="Add any notes about the checkout..."
            value={checkOutNotes}
            onChange={(e) => setCheckOutNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setCheckOutDialogOpen(false); setCheckOutNotes(''); }}>Cancel</Button>
          <Button onClick={handleCheckout} variant="contained" color="primary" disabled={isProcessingCheckIn}>
            {isProcessingCheckIn ? <CircularProgress size={20} color="inherit" /> : 'Confirm Checkout'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* No Show Dialog */}
      <Dialog open={noShowDialogOpen} onClose={() => setNoShowDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <NoShowIcon /> Mark as No Show
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to mark "{event.name || 'this event'}" as a no-show?
            This indicates the guest did not arrive for their scheduled event.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setNoShowDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleNoShow} variant="contained" color="error" disabled={isProcessingCheckIn}>
            {isProcessingCheckIn ? <CircularProgress size={20} color="inherit" /> : 'Confirm No Show'}
          </Button>
        </DialogActions>
      </Dialog>

    </ModernPageLayout>
  );
};
