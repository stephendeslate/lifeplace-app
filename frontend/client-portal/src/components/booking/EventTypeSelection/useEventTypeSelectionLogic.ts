import { useState, useEffect } from 'react';
import { BookingCoreApi } from '@/apis/booking/core';
import type { EventType } from '@/types/booking';

export function useEventTypeSelectionLogic(
  onSelectEventType: (eventType: EventType) => Promise<void>,
) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    const loadEventTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await BookingCoreApi.getEventTypes();
        setEventTypes(data);
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load event types:', err);
        setError(BookingCoreApi.handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    loadEventTypes();
  }, []);

  const handleCardClick = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setIsDetailDialogOpen(true);
  };

  const handleSelectEventType = async (eventType: EventType) => {
    setIsSelecting(true);
    try {
      await onSelectEventType(eventType);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to select event type:', error);
    } finally {
      setIsSelecting(false);
      setIsDetailDialogOpen(false);
    }
  };

  const handleCloseDialog = () => {
    setIsDetailDialogOpen(false);
    setSelectedEventType(null);
  };

  return {
    eventTypes,
    loading,
    error,
    selectedEventType,
    isDetailDialogOpen,
    isSelecting,
    handleCardClick,
    handleSelectEventType,
    handleCloseDialog,
  };
}
