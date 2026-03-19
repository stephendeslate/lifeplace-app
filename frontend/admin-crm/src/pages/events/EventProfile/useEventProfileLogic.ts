// Business logic hook for EventProfile page
// Extracts all state, data fetching, computed values, and handlers

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '@/contexts/LayoutContext';
import { useEvents } from '@/hooks/useEvents';
import { eventsApi } from '@/apis/events.api';
import { useClients } from '@/hooks/useClients';
import { useCommunications } from '@/hooks/useCommunications';
import { useQuestionnaires } from '@/hooks/useQuestionnaires';
import { useCurrencySettings } from '@/hooks/useCurrency';
import { useWorkflowStages } from '@/hooks/useWorkflows';
import { formatCurrency } from '@/utils/currency';
import { calculateEventFinancials, type ActivityItem } from '@/components/common';
import type { UpdateEventData } from '@/types/events.types';
import type { WorkflowStage as WorkflowStageType } from '@/types/workflows';

export function useEventProfileLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [headcountDialogOpen, setHeadcountDialogOpen] = useState(false);

  // Check-in/out state
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);

  // Hooks
  const { useEvent, updateEvent, isUpdatingEvent, deleteEvent, isDeletingEvent } = useEvents();
  const { useClient } = useClients();
  const { useRecords } = useCommunications();
  const { useStagesForTemplate } = useWorkflowStages();

  // Get user's currency settings for proper formatting
  const { settings: currencySettings } = useCurrencySettings();

  // Format event price based on user's currency settings
  const formatEventPrice = useCallback(
    (price: string | number) => {
      const currency = currencySettings?.defaultCurrency || 'PHP';
      return formatCurrency(price, currency, {
        showSymbol: currencySettings?.displayFormat !== 'code',
        showCode:
          currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
        minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
        maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      });
    },
    [currencySettings],
  );

  const eventId = parseInt(id || '0');
  const { data: event, isLoading, error, refetch } = useEvent(eventId);

  // Extract client ID - handle both serialized forms
  const clientId = useMemo(() => {
    if (!event?.client) return 0;
    if (typeof event.client === 'number') return event.client;
    if (typeof event.client === 'object' && event.client !== null && 'id' in event.client) {
      return (event.client as { id: number }).id || 0;
    }
    return 0;
  }, [event?.client]);

  const { data: client } = useClient(clientId);

  // Get workflow stages for the event's template
  const templateId =
    typeof event?.workflow_template === 'object' && event.workflow_template !== null
      ? event.workflow_template.id
      : typeof event?.workflow_template === 'number'
        ? event.workflow_template
        : 0;
  const { data: workflowStages = [], isLoading: isLoadingStages } =
    useStagesForTemplate(templateId);

  // Get counts for tabs
  const { data: communications = [] } = useRecords({ event_id: eventId });
  const communicationsCount = communications.length;

  // Get available questionnaires for this event type
  const { useActiveQuestionnaires } = useQuestionnaires();
  const { data: allQuestionnaires = [] } = useActiveQuestionnaires();

  const questionnairesCount = useMemo(() => {
    return allQuestionnaires.filter(
      (q) => q.event_type === event?.event_type || q.event_type === null,
    ).length;
  }, [allQuestionnaires, event?.event_type]);

  // Transform workflow stages data for visualization component
  const transformedWorkflowStages = useMemo(() => {
    if (!workflowStages.length || !event) return [];

    const currentStageObj =
      typeof event.current_stage === 'object' && event.current_stage !== null
        ? event.current_stage
        : null;

    const stageTypeOrder: Record<string, number> = {
      LEAD: 1,
      PRODUCTION: 2,
      POST_PRODUCTION: 3,
    };

    return workflowStages
      .map((stage: WorkflowStageType) => {
        let status: 'completed' | 'active' | 'pending' | 'blocked' | 'skipped' = 'pending';

        if (currentStageObj && stage.id === currentStageObj.id) {
          status = 'active';
        } else if (currentStageObj) {
          const currentTypeOrder = stageTypeOrder[currentStageObj.stage] || 0;
          const stageTypeOrderVal = stageTypeOrder[stage.stage] || 0;

          if (stageTypeOrderVal < currentTypeOrder) {
            status = 'completed';
          } else if (stageTypeOrderVal > currentTypeOrder) {
            status = 'pending';
          } else {
            if (stage.order < currentStageObj.order) {
              status = 'completed';
            }
          }
        }

        const stageTasks = event.tasks?.filter((task) => task.workflow_stage === stage.id) || [];

        return {
          id: stage.id,
          name: stage.name,
          description: stage.task_description,
          status,
          order: stage.order,
          tasks: stageTasks.map((task) => ({
            id: task.id,
            name: task.title,
            status:
              task.status === 'COMPLETED'
                ? ('completed' as const)
                : task.status === 'PENDING'
                  ? ('pending' as const)
                  : ('active' as const),
            completedAt: task.completed_at || undefined,
            assignedTo: task.assigned_to_name
              ? {
                  id: task.assigned_to || 0,
                  name: task.assigned_to_name,
                }
              : undefined,
            priority: task.priority?.toLowerCase() as
              | 'low'
              | 'medium'
              | 'high'
              | 'urgent'
              | undefined,
            dueDate: task.due_date || undefined,
          })),
          completedAt: status === 'completed' ? stage.updated_at : undefined,
          dueDate: stageTasks.find((t) => t.due_date)?.due_date || undefined,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [workflowStages, event]);

  // Financial metrics
  const financialMetrics = useMemo(() => {
    return event ? calculateEventFinancials(event) : [];
  }, [event]);

  // Activity items
  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    communications.forEach((comm) => {
      items.push({
        id: `comm-${comm.id}`,
        type: 'communication',
        title: comm.subject || comm.template_name,
        description: comm.body?.substring(0, 100) + '...',
        timestamp: comm.sent_at || comm.created_at,
        status: 'completed',
        relatedEntity: client
          ? {
              type: 'client',
              id: clientId,
              name: client.first_name + ' ' + client.last_name,
            }
          : undefined,
        user: { name: 'System' },
      });
    });

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

  // Breadcrumbs
  useEffect(() => {
    if (event) {
      setBreadcrumbs([
        { label: 'Events', path: '/events' },
        { label: event.name || `Event #${event.id}` },
      ]);
    }
  }, [event, setBreadcrumbs]);

  // Menu handlers
  const handleMenuClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleEditEvent = useCallback(() => {
    setEditDialogOpen(true);
    setAnchorEl(null);
  }, []);

  const handleDeleteEvent = useCallback(() => {
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  }, []);

  const handleEdit = useCallback(
    (data: UpdateEventData) => {
      updateEvent(
        { id: eventId, data },
        {
          onSuccess: () => {
            setEditDialogOpen(false);
            refetch();
          },
        },
      );
    },
    [eventId, updateEvent, refetch],
  );

  const handleDelete = useCallback(() => {
    deleteEvent(eventId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        navigate('/events');
      },
    });
  }, [eventId, deleteEvent, navigate]);

  // Check-in/out handlers
  const handleCheckIn = useCallback(async () => {
    setIsProcessingCheckIn(true);
    try {
      await eventsApi.checkIn(eventId, checkInNotes);
      setCheckInDialogOpen(false);
      setCheckInNotes('');
      refetch();
    } catch (err) {
      console.error('Check-in failed:', err);
    } finally {
      setIsProcessingCheckIn(false);
    }
  }, [eventId, checkInNotes, refetch]);

  const handleCheckout = useCallback(async () => {
    setIsProcessingCheckIn(true);
    try {
      await eventsApi.checkout(eventId, checkOutNotes, true);
      setCheckOutDialogOpen(false);
      setCheckOutNotes('');
      refetch();
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setIsProcessingCheckIn(false);
    }
  }, [eventId, checkOutNotes, refetch]);

  const handleNoShow = useCallback(async () => {
    setIsProcessingCheckIn(true);
    try {
      await eventsApi.markNoShow(eventId, 'Marked as no-show by admin');
      setNoShowDialogOpen(false);
      refetch();
    } catch (err) {
      console.error('No-show marking failed:', err);
    } finally {
      setIsProcessingCheckIn(false);
    }
  }, [eventId, refetch]);

  const formatCheckInTime = useCallback((dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const canPerformCheckIn = useCallback(() => {
    if (!event) return false;
    if (event.check_in_status !== 'PENDING') return false;
    if (event.status === 'CANCELLED') return false;
    const eventDate = new Date(event.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate <= today;
  }, [event]);

  const canPerformCheckout = useCallback(() => {
    return event?.check_in_status === 'CHECKED_IN';
  }, [event]);

  const getStatusColor = useCallback(
    (
      status: string,
    ): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
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
    },
    [],
  );

  return {
    // Route params
    eventId,
    navigate,

    // Data
    event,
    client,
    clientId,
    isLoading,
    error,
    refetch,

    // Workflow
    transformedWorkflowStages,
    isLoadingStages,

    // Computed
    financialMetrics,
    activityItems,
    communicationsCount,
    questionnairesCount,

    // Tab state
    tabValue,
    setTabValue,

    // Menu state
    anchorEl,
    handleMenuClick,
    handleMenuClose,
    handleEditEvent,
    handleDeleteEvent,

    // Dialog state
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    headcountDialogOpen,
    setHeadcountDialogOpen,

    // Check-in state & handlers
    checkInDialogOpen,
    setCheckInDialogOpen,
    checkOutDialogOpen,
    setCheckOutDialogOpen,
    noShowDialogOpen,
    setNoShowDialogOpen,
    checkInNotes,
    setCheckInNotes,
    checkOutNotes,
    setCheckOutNotes,
    isProcessingCheckIn,

    // Event handlers
    handleEdit,
    handleDelete,
    handleCheckIn,
    handleCheckout,
    handleNoShow,
    isUpdatingEvent,
    isDeletingEvent,

    // Utilities
    formatEventPrice,
    formatCheckInTime,
    canPerformCheckIn,
    canPerformCheckout,
    getStatusColor,
  };
}

export type EventProfileLogic = ReturnType<typeof useEventProfileLogic>;
