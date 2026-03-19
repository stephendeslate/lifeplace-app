// frontend/client-portal/src/pages/booking/BookingFlow/EventTypeSelectionContainer.tsx

import React from 'react';
import { useBooking } from '@/contexts/BookingContext';
import { CleanEventTypeSelection } from '@/components/booking/CleanEventTypeSelection';
import type { EventType } from '@/types/booking';

/**
 * Wraps CleanEventTypeSelection with booking context actions.
 * EventTypeSelection manages its own data loading internally.
 */
export const EventTypeSelectionContainer: React.FC = () => {
  const { actions } = useBooking();

  const handleSelectEventType = async (eventType: EventType) => {
    try {
      await actions.selectEventType(eventType);
    } catch (error) {
      // Error is handled by the booking context
      if (import.meta.env.DEV) console.error('Failed to select event type:', error);
    }
  };

  return <CleanEventTypeSelection onSelectEventType={handleSelectEventType} />;
};
