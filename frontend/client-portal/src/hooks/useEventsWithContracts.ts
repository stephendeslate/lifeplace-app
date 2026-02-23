// frontend/client-portal/src/hooks/useEventsWithContracts.ts

import { useMemo } from 'react';
import { useEvents } from './useEvents';
import { useContracts } from '../contexts/ContractsContext';
import type { Event, EventDetail, EventContractSummary, EventFilters } from '../types/events.types';
import { contractUtils } from '../apis/contracts.api';

export const useEventsWithContracts = () => {
  const eventsHook = useEvents();
  const { contracts, isLoading: contractsLoading } = useContracts();

  // Enhanced events list hook that includes contract information
  const useEventsListWithContracts = (filters?: EventFilters) => {
    const eventsQuery = eventsHook.useEventsList(filters);

    // Merge contract information with events
    const eventsWithContracts = useMemo(() => {
      if (!eventsQuery.data || !contracts) return eventsQuery.data;

      return eventsQuery.data.map((event): Event => {
        // Find contracts for this event
        const eventContracts = contracts.filter(
          (contract) => contract.event.id === event.id.toString(),
        );

        if (eventContracts.length === 0) {
          return event;
        }

        // Calculate aggregate contract information
        const hasActiveContracts = eventContracts.length > 0;
        const pendingSignatureRequired = eventContracts.some(
          (contract) =>
            contract.can_client_sign && ['SENT', 'PARTIALLY_SIGNED'].includes(contract.status),
        );

        // Get the most urgent contract status
        const primaryContract = eventContracts.reduce((prev, current) => {
          const statusPriority = {
            EXPIRED: 6,
            PARTIALLY_SIGNED: 5,
            SENT: 4,
            DRAFT: 3,
            AMENDED: 2,
            SIGNED: 1,
            VOID: 0,
          };

          const prevPriority = statusPriority[prev.status] || 0;
          const currentPriority = statusPriority[current.status] || 0;

          return currentPriority > prevPriority ? current : prev;
        });

        // Calculate days until expiry for urgent contracts
        const expiryDaysArray = eventContracts
          .map((contract) =>
            contract.valid_until ? contractUtils.getDaysUntilExpiry(contract.valid_until) : null,
          )
          .filter((days): days is number => days !== null);

        const contractExpiryDays = expiryDaysArray.length > 0 ? Math.min(...expiryDaysArray) : null;

        return {
          ...event,
          contract_status: primaryContract.status,
          has_contracts: hasActiveContracts,
          contracts_count: eventContracts.length,
          pending_signature_required: pendingSignatureRequired,
          contract_expiry_days: contractExpiryDays,
        };
      });
    }, [eventsQuery.data]);

    return {
      ...eventsQuery,
      data: eventsWithContracts,
      isLoading: eventsQuery.isLoading || contractsLoading,
    };
  };

  // Enhanced event detail hook that includes detailed contract information
  const useEventWithContracts = (eventId: number) => {
    const eventQuery = eventsHook.useEvent(eventId);

    // Merge detailed contract information with event
    const eventWithContracts = useMemo(() => {
      if (!eventQuery.data || !contracts) return eventQuery.data;

      const event = eventQuery.data;
      const eventContracts = contracts.filter(
        (contract) => contract.event.id === eventId.toString(),
      );

      if (eventContracts.length === 0) {
        return event;
      }

      // Create contract summaries
      const contractSummaries: EventContractSummary[] = eventContracts.map((contract) => ({
        id: contract.id,
        status: contract.status,
        template_name: contract.template.name,
        can_client_sign: contract.can_client_sign || false,
        expires_at: contract.valid_until,
        signature_progress: contract.signature_progress || {
          total_required: 0,
          signed_count: 0,
          percentage: 0,
        },
        is_urgent: contract.valid_until
          ? (contractUtils.getDaysUntilExpiry(contract.valid_until) ?? 0) <= 3
          : false,
      }));

      // Calculate overall signature progress
      const totalRequired = contractSummaries.reduce(
        (sum, contract) => sum + contract.signature_progress.total_required,
        0,
      );
      const totalCompleted = contractSummaries.reduce(
        (sum, contract) => sum + contract.signature_progress.signed_count,
        0,
      );

      const overallProgress =
        totalRequired > 0
          ? {
              total_required: totalRequired,
              signed_count: totalCompleted,
              percentage: Math.round((totalCompleted / totalRequired) * 100),
            }
          : undefined;

      // Calculate contract expiry days
      const contractExpiryDaysArray = contractSummaries
        .map((c) => (c.expires_at ? contractUtils.getDaysUntilExpiry(c.expires_at) : null))
        .filter((days): days is number => days !== null);

      const contractExpiryDays =
        contractExpiryDaysArray.length > 0 ? Math.min(...contractExpiryDaysArray) : null;

      // Add contract fields to base event data
      const primaryContract = contractSummaries[0]; // Most relevant contract
      const enhancedEvent: EventDetail = {
        ...event,
        contract_status: primaryContract.status,
        has_contracts: true,
        contracts_count: contractSummaries.length,
        pending_signature_required: contractSummaries.some(
          (c) => c.can_client_sign && ['SENT', 'PARTIALLY_SIGNED'].includes(c.status),
        ),
        contract_expiry_days: contractExpiryDays,
        contracts: contractSummaries,
        contract_signature_progress: overallProgress,
      };

      return enhancedEvent;
    }, [eventQuery.data, eventId]);

    return {
      ...eventQuery,
      data: eventWithContracts,
      isLoading: eventQuery.isLoading || contractsLoading,
    };
  };

  // Get contracts for a specific event
  const useEventContracts = (eventId: number) => {
    const eventContracts = useMemo(() => {
      if (!contracts) return [];
      return contracts.filter((contract) => contract.event.id === eventId.toString());
    }, [eventId]);

    return {
      contracts: eventContracts,
      isLoading: contractsLoading,
      hasContracts: eventContracts.length > 0,
      needsSignature: eventContracts.some(
        (contract) =>
          contract.can_client_sign && ['SENT', 'PARTIALLY_SIGNED'].includes(contract.status),
      ),
    };
  };

  // Get events that need contract attention
  const useEventsNeedingContractAttention = () => {
    const eventsQuery = eventsHook.useEventsList();

    const urgentEvents = useMemo(() => {
      if (!eventsQuery.data || !contracts) return [];

      return eventsQuery.data.filter((event) => {
        const eventContracts = contracts.filter(
          (contract) => contract.event.id === event.id.toString(),
        );

        return eventContracts.some((contract) => {
          // Check if signature is needed
          if (contract.can_client_sign && ['SENT', 'PARTIALLY_SIGNED'].includes(contract.status)) {
            return true;
          }

          // Check if contract is expiring soon (within 7 days)
          if (contract.valid_until) {
            const daysUntilExpiry = contractUtils.getDaysUntilExpiry(contract.valid_until);
            return daysUntilExpiry !== null && daysUntilExpiry <= 7;
          }

          return false;
        });
      });
    }, [eventsQuery.data]);

    return {
      events: urgentEvents,
      count: urgentEvents.length,
      isLoading: eventsQuery.isLoading || contractsLoading,
    };
  };

  return {
    // Enhanced hooks
    useEventsListWithContracts,
    useEventWithContracts,
    useEventContracts,
    useEventsNeedingContractAttention,

    // Original events hooks (for backward compatibility)
    ...eventsHook,
  };
};

// Default export
export default useEventsWithContracts;
