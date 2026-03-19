import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLayout } from '@/contexts/LayoutContext';
import { useClients } from '@/hooks/useClients';
import { useCommunications } from '@/hooks/useCommunications';
import { useQuotesForClient } from '@/hooks/useSales';
import type { UpdateClientData } from '@/types/clients.types';
import { useContractsForClient } from '@/hooks/useContracts';
import { useInvoicesForClient } from '@/hooks/usePayments';
import { getClientStatusSummary } from '@/utils/clientStatus';
import { useNotes } from '@/hooks/useNotes';
import { useEvents } from '@/hooks/useEvents';
import {
  createEventReference,
  createClientActions,
  calculateClientFinancials,
  type ActivityItem,
  type QuickAction,
} from '@/components/common';
import { createRefreshAction } from '@/components/common/ModernDesignSystem';
import { formatCurrency } from '@/utils/currency';
import { useCurrencySettings } from '@/hooks/useCurrency';

export function useClientProfileLogic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const { settings: currencySettings } = useCurrencySettings();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendMessageDialogOpen, setSendMessageDialogOpen] = useState(false);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [notifPrefsDialogOpen, setNotifPrefsDialogOpen] = useState(false);

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
  const { createNote, isCreatingNote } = useNotes();
  const { createEvent, isCreatingEvent } = useEvents();

  // Currency formatting
  const formatClientAmount = useCallback(
    (amount: string | number) => {
      const currency = currencySettings?.defaultCurrency || 'PHP';
      return formatCurrency(amount, currency, {
        showSymbol: currencySettings?.displayFormat !== 'code',
        showCode:
          currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
        minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
        maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      });
    },
    [currencySettings],
  );

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
    return createClientActions(
      client.id,
      (actionType: string, _clientId: number) => {
        switch (actionType) {
          case 'create-event':
            setCreateEventDialogOpen(true);
            break;
          case 'send-message':
            setSendMessageDialogOpen(true);
            break;
          case 'create-quote':
            setTabValue(3); // Switch to quotes tab where quotes can be created
            break;
          case 'send-invitation':
            handleSendInvitation();
            break;
          case 'add-note':
            setAddNoteDialogOpen(true);
            break;
          case 'call-client':
            if (clientPhone) {
              window.location.href = `tel:${clientPhone}`;
            }
            break;
          case 'create-invoice':
            navigate(`/payments/new?client=${clientId}`);
            break;
        }
      },
      clientPhone,
    );
  }, [client, navigate, handleSendInvitation, clientId]);

  const relatedEvents = useMemo(() => {
    return events.map((event) => createEventReference(event));
  }, [events]);

  const activityItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    // Add communications as activities
    communications.forEach((comm) => {
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
    events.forEach((event) => {
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
          name: event.name,
        },
        user: { name: 'System' },
      });
    });

    // Add quote activities
    quotes.forEach((quote) => {
      items.push({
        id: `quote-${quote.id}`,
        type: 'note',
        title: `Quote ${quote.status === 'ACCEPTED' ? 'Accepted' : quote.status === 'SENT' ? 'Sent' : 'Created'}`,
        description: `Quote for ${quote.event_details?.name || 'event'} - ${formatClientAmount(quote.total_amount)}`,
        timestamp: quote.updated_at || quote.created_at,
        status:
          quote.status === 'ACCEPTED'
            ? 'completed'
            : quote.status === 'SENT'
              ? 'in_progress'
              : 'pending',
        relatedEntity: {
          type: 'quote' as 'event',
          id: quote.id,
          name: `Quote #${quote.id}`,
        },
        user: { name: 'System' },
      });
    });

    // Add contract activities
    contracts.forEach((contract) => {
      items.push({
        id: `contract-${contract.id}`,
        type: 'contract',
        title: `Contract ${contract.status === 'SIGNED' ? 'Signed' : contract.status === 'SENT' ? 'Sent' : 'Created'}`,
        description: `Contract for ${contract.event_details?.name || 'event'} - ${contract.status_display || contract.status}`,
        timestamp: contract.updated_at || contract.created_at,
        status:
          contract.status === 'SIGNED'
            ? 'completed'
            : contract.status === 'SENT'
              ? 'in_progress'
              : 'pending',
        relatedEntity: {
          type: 'contract' as 'event',
          id: contract.id,
          name: `Contract #${contract.id}`,
        },
        user: { name: 'System' },
      });
    });

    // Add invoice activities
    invoices.forEach((invoice) => {
      items.push({
        id: `invoice-${invoice.id}`,
        type: 'payment',
        title: `Invoice ${invoice.status === 'PAID' ? 'Paid' : invoice.status === 'ISSUED' ? 'Issued' : 'Created'}`,
        description: `Invoice ${invoice.invoice_id} - ${formatClientAmount(invoice.total_amount)}`,
        timestamp: invoice.updated_at || invoice.created_at,
        status:
          invoice.status === 'PAID'
            ? 'completed'
            : invoice.status === 'ISSUED'
              ? 'in_progress'
              : 'pending',
        relatedEntity: {
          type: 'invoice' as 'event',
          id: invoice.id,
          name: invoice.invoice_id,
        },
        user: { name: 'System' },
      });
    });

    // Add client creation/registration activity
    if (client) {
      items.push({
        id: `client-registered-${client.id}`,
        type: 'status_change',
        title: client.has_account ? 'Client Registered' : 'Client Added',
        description: client.has_account
          ? `${client.first_name} ${client.last_name} registered an account`
          : `${client.first_name} ${client.last_name} was added to the system`,
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

  const handleEdit = useCallback(
    (data: UpdateClientData) => {
      updateClient(
        { id: clientId, data },
        {
          onSuccess: () => {
            setEditDialogOpen(false);
            refetchClient();
          },
        },
      );
    },
    [clientId, updateClient, refetchClient],
  );

  const handleDelete = useCallback(() => {
    deleteClient(clientId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        navigate('/clients');
      },
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

  const statusSummary = client ? getClientStatusSummary(client) : null;

  return {
    // Route params
    clientId,
    navigate,

    // Data
    client,
    events,
    communications,
    quotes,
    contracts,
    invoices,
    statusSummary,
    totalClientValue,
    financialMetrics,
    quickActions,
    relatedEvents,
    activityItems,

    // Loading/error states
    isLoading,
    isLoadingEvents,
    isUpdatingClient,
    isDeletingClient,
    isSendingInvitation,
    isCreatingNote,
    isCreatingEvent,
    error,

    // Dialog states
    tabValue,
    setTabValue,
    anchorEl,
    setAnchorEl,
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    sendMessageDialogOpen,
    setSendMessageDialogOpen,
    addNoteDialogOpen,
    setAddNoteDialogOpen,
    createEventDialogOpen,
    setCreateEventDialogOpen,
    notifPrefsDialogOpen,
    setNotifPrefsDialogOpen,

    // Handlers
    handleMenuClose,
    handleEditClient,
    handleDeactivateClient,
    handleSendInvitation,
    handleEdit,
    handleDelete,
    refetchClient,
    createNote,
    createEvent,
    createRefreshAction,
  };
}
