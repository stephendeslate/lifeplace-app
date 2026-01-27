// frontend/admin-crm/src/hooks/useTasks.ts

import { useMemo } from 'react';
import { useEventQuotes } from './useSales';
import { useEventContracts } from './useContracts';
import { usePayments } from './usePayments';
import { useCommunications } from './useCommunications';
import { useSupport } from './useSupport';
import type { Task, TaskCounts, TasksByDomain, TaskPriority } from '../types/tasks.types';
import type { EventQuote } from '../types/sales.types';
import type { EventContract } from '../types/contracts.types';
import type { Payment } from '../types/payments.types';
import type { CommunicationRecord } from '../types/communications.types';
import type { SupportInquiry } from '../types/support.types';

// Helper to calculate priority based on age
const calculatePriority = (createdAt: string): TaskPriority => {
  const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > 7) return 'high';
  if (ageInDays > 3) return 'medium';
  return 'low';
};

// Transform quote to task
const transformQuoteToTask = (quote: EventQuote): Task => ({
  id: `quote-${quote.id}`,
  domain: 'quotes',
  type: quote.status === 'DRAFT' ? 'Draft Quote' : 'Awaiting Response',
  title: quote.event_details?.name || `Quote #${quote.id}`,
  description: quote.status === 'DRAFT'
    ? 'Quote needs to be finalized and sent'
    : 'Quote has been sent, awaiting client response',
  priority: calculatePriority(quote.created_at),
  createdAt: quote.created_at,
  entityId: quote.id,
  eventId: quote.event,
  eventName: quote.event_details?.name,
  clientName: quote.event_details?.client_name,
  status: quote.status,
  amount: quote.total_amount,
});

// Transform contract to task
const transformContractToTask = (contract: EventContract): Task => {
  const eventDetails = typeof contract.event === 'object' ? contract.event : contract.event_details;
  return {
    id: `contract-${contract.id}`,
    domain: 'contracts',
    type: contract.status === 'SENT' ? 'Awaiting Signature' : 'Partially Signed',
    title: eventDetails?.name || `Contract #${contract.id}`,
    description: contract.status === 'SENT'
      ? 'Contract has been sent, awaiting client signature'
      : `Contract needs ${contract.missing_signatures?.join(', ') || 'more'} signature(s)`,
    priority: calculatePriority(contract.created_at),
    createdAt: contract.created_at,
    entityId: contract.id,
    eventId: typeof contract.event === 'number' ? contract.event : contract.event?.id,
    eventName: eventDetails?.name,
    clientName: eventDetails?.client_name,
    status: contract.status,
    amount: contract.contract_value || undefined,
  };
};

// Transform payment to task
const transformPaymentToTask = (payment: Payment): Task => ({
  id: `payment-${payment.id}`,
  domain: 'payments',
  type: payment.status === 'PENDING' ? 'Pending Payment' : 'Failed Payment',
  title: `${payment.payment_number} - ${payment.event_details?.name || 'Unknown Event'}`,
  description: payment.status === 'PENDING'
    ? `Payment of ${payment.amount} ${payment.currency} is pending`
    : `Payment failed - requires attention`,
  priority: payment.status === 'FAILED' ? 'high' : calculatePriority(payment.created_at),
  createdAt: payment.created_at,
  entityId: payment.id,
  eventId: payment.event,
  eventName: payment.event_details?.name,
  clientName: payment.event_details?.client_name,
  status: payment.status,
  amount: payment.amount,
});

// Transform communication to task
const transformCommunicationToTask = (record: CommunicationRecord): Task => ({
  id: `comm-${record.id}`,
  domain: 'communications',
  type: record.delivery_status === 'PENDING' ? 'Pending Message' : 'Failed Message',
  title: record.subject || record.template_name,
  description: record.delivery_status === 'PENDING'
    ? `Message to ${record.recipient} is pending delivery`
    : `Message to ${record.recipient} failed - may need retry`,
  priority: record.delivery_status === 'FAILED' ? 'high' : calculatePriority(record.created_at),
  createdAt: record.created_at,
  entityId: record.id,
  eventId: record.event || undefined,
  clientName: record.client_name,
  status: record.delivery_status,
});

// Transform support inquiry to task
const transformSupportToTask = (inquiry: SupportInquiry): Task => ({
  id: `support-${inquiry.id}`,
  domain: 'support',
  type: inquiry.priority === 'urgent' ? 'Urgent Inquiry' : 'Support Inquiry',
  title: inquiry.subject,
  description: `${inquiry.category_display} - ${inquiry.client_name}`,
  priority: inquiry.priority === 'urgent' || inquiry.priority === 'high' ? 'high' :
            inquiry.priority === 'normal' ? 'medium' : 'low',
  createdAt: inquiry.created_at,
  entityId: inquiry.id,
  eventId: inquiry.event || undefined,
  eventName: inquiry.event_name || undefined,
  clientName: inquiry.client_name,
  status: inquiry.status,
});

export const useTasks = () => {
  // Fetch quotes (DRAFT and SENT statuses)
  const { data: draftQuotes = [] } = useEventQuotes({ status: 'DRAFT' });
  const { data: sentQuotes = [] } = useEventQuotes({ status: 'SENT' });

  // Fetch contracts (SENT and PARTIALLY_SIGNED statuses)
  // Poll every 30s to detect signature changes made from client-portal
  const { data: sentContracts = [] } = useEventContracts({ status: 'SENT' }, { refetchInterval: 30000 });
  const { data: partiallySignedContracts = [] } = useEventContracts({ status: 'PARTIALLY_SIGNED' }, { refetchInterval: 30000 });

  // Fetch payments (PENDING and FAILED statuses)
  const { payments: allPayments = [], isLoadingPayments } = usePayments({});

  // Filter payments to actionable ones
  const actionablePayments = useMemo(() =>
    allPayments.filter(p => p.status === 'PENDING' || p.status === 'FAILED'),
    [allPayments]
  );

  // Fetch communications (PENDING and FAILED statuses)
  const { useRecords } = useCommunications();
  const { data: pendingRecords = [] } = useRecords({ status: 'PENDING' });
  const { data: failedRecords = [] } = useRecords({ status: 'FAILED' });

  // Fetch support inquiries (active and waiting statuses)
  const { useSupportInquiries } = useSupport();
  const { data: activeSupportInquiries = [] } = useSupportInquiries({ status: 'active' });
  const { data: waitingSupportInquiries = [] } = useSupportInquiries({ status: 'waiting' });

  // Transform and combine tasks
  const tasksByDomain = useMemo<TasksByDomain>(() => {
    // Filter out expired quotes before transformation
    const activeQuotes = [...draftQuotes, ...sentQuotes].filter(
      quote => !quote.is_expired
    );
    const quotes = activeQuotes
      .map(transformQuoteToTask)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter out expired contracts before transformation
    const activeContracts = [...sentContracts, ...partiallySignedContracts].filter(
      contract => !contract.is_expired
    );
    const contracts = activeContracts
      .map(transformContractToTask)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Payments are NOT filtered - overdue payments still need attention
    const payments = actionablePayments
      .map(transformPaymentToTask)
      .sort((a, b) => {
        // Failed payments first
        if (a.status === 'FAILED' && b.status !== 'FAILED') return -1;
        if (b.status === 'FAILED' && a.status !== 'FAILED') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    const communications = [
      ...failedRecords.map(transformCommunicationToTask),
      ...pendingRecords.map(transformCommunicationToTask),
    ].sort((a, b) => {
      // Failed messages first
      if (a.status === 'FAILED' && b.status !== 'FAILED') return -1;
      if (b.status === 'FAILED' && a.status !== 'FAILED') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const support = [...activeSupportInquiries, ...waitingSupportInquiries]
      .map(transformSupportToTask)
      .sort((a, b) => {
        // Urgent/high priority first
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return { quotes, contracts, payments, communications, support };
  }, [draftQuotes, sentQuotes, sentContracts, partiallySignedContracts, actionablePayments, pendingRecords, failedRecords, activeSupportInquiries, waitingSupportInquiries]);

  // Calculate counts
  const counts = useMemo<TaskCounts>(() => ({
    quotes: tasksByDomain.quotes.length,
    contracts: tasksByDomain.contracts.length,
    payments: tasksByDomain.payments.length,
    communications: tasksByDomain.communications.length,
    support: tasksByDomain.support.length,
    total:
      tasksByDomain.quotes.length +
      tasksByDomain.contracts.length +
      tasksByDomain.payments.length +
      tasksByDomain.communications.length +
      tasksByDomain.support.length,
  }), [tasksByDomain]);

  // All tasks flattened
  const allTasks = useMemo(() => [
    ...tasksByDomain.quotes,
    ...tasksByDomain.contracts,
    ...tasksByDomain.payments,
    ...tasksByDomain.communications,
    ...tasksByDomain.support,
  ].sort((a, b) => {
    // Sort by priority first (high > medium > low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    // Then by date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }), [tasksByDomain]);

  // Loading state
  const isLoading = isLoadingPayments;

  return {
    tasks: allTasks,
    tasksByDomain,
    counts,
    isLoading,
  };
};
