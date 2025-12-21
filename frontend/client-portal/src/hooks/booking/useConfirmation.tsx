// frontend/client-portal/src/hooks/booking/useConfirmation.ts

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ConfirmationApi } from '../../apis/booking/confirmation.api';
import { BookingCoreApi } from '../../apis/booking/core.api';
import { ErrorHandler } from '../../utils/errorHandler';
import type {
  BookingCompletionResult,
  ConfirmationStepConfiguration,
} from '../../types/booking';

// Hook for managing confirmation step and booking completion
export const useConfirmation = (
  sessionId?: string,
  config?: ConfirmationStepConfiguration | null
) => {
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionResult, setCompletionResult] = useState<BookingCompletionResult | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Record<string, unknown> | null>(null);
  const [confirmationData, setConfirmationData] = useState<Record<string, unknown> | null>(null);

  // Load session details for display
  const loadSessionDetails = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const details = await ConfirmationApi.getSessionDetails(sessionId);
      setSessionDetails(details);
      
      // Format confirmation data for display
      const formatted = ConfirmationApi.formatConfirmationData(details);
      setConfirmationData(formatted);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Extract completion type from session data
  // Default to 'quote' when no explicit selection - aligns with industry best practices
  // for high-consideration event bookings (captures leads that would otherwise be lost)
  const getCompletionType = useCallback((): 'payment' | 'quote' => {
    if (!sessionDetails?.booking_data) {
      return 'quote'; // Default to quote if no session data
    }

    // Search through all step data for completion_type
    const bookingData = sessionDetails.booking_data as Record<string, unknown>;

    // First check for completion_type at the root level
    if (bookingData.completion_type === 'quote' || bookingData.completion_type === 'payment') {
      return bookingData.completion_type as 'payment' | 'quote';
    }

    // Then search through step data
    for (const [, stepData] of Object.entries(bookingData)) {
      if (typeof stepData === 'object' && stepData !== null) {
        const data = stepData as Record<string, unknown>;
        if (data.completion_type === 'quote' || data.completion_type === 'payment') {
          return data.completion_type as 'payment' | 'quote';
        }
      }
    }

    return 'quote'; // Default to quote if completion_type not found
  }, [sessionDetails]);

  // Complete the booking
  const completeBooking = useCallback(async (providedCompletionType?: 'payment' | 'quote'): Promise<boolean> => {
    if (!sessionId) {
      setError('Session information missing');
      return false;
    }

    setCompleting(true);
    setError(null);

    try {
      // Use provided type if available, fallback to session detection
      const completionType = providedCompletionType || getCompletionType();

      const result = await BookingCoreApi.completeBooking(sessionId, completionType);
      setCompletionResult(result);

      // Clear the session from localStorage to prevent "Resume Booking" dialog
      // from showing for completed bookings
      BookingCoreApi.clearSessionFromLocal(sessionId);

      // Reload session details to get updated information
      await loadSessionDetails();

      return true;
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
      return false;
    } finally {
      setCompleting(false);
    }
  }, [sessionId, loadSessionDetails, getCompletionType]);


  // Get booking reference number
  const bookingReference = useMemo(() => {
    if (!sessionId) return '';
    return ConfirmationApi.generateBookingReference(sessionId);
  }, [sessionId]);

  // Get next steps content
  const nextSteps = useMemo(() => {
    return ConfirmationApi.getNextStepsContent((config || {}) as Record<string, unknown>);
  }, [config]);

  // Get support contact information
  const supportContact = useMemo(() => {
    return ConfirmationApi.getSupportContact();
  }, []);

  // Get formatted confirmation title and message
  const confirmationContent = useMemo(() => ({
    title: config?.title || 'Booking Confirmed!',
    message: config?.message || 'Thank you for your booking. We\'ll be in touch soon!',
  }), [config]);

  // Check if booking is completed
  const isCompleted = useMemo(() => {
    return !!completionResult || sessionDetails?.is_completed;
  }, [completionResult, sessionDetails]);

  // Format event details for display
  const eventSummary = useMemo(() => {
    if (!confirmationData) return null;

    const eventDetails = confirmationData.eventDetails as Record<string, unknown>;
    const contactInfo = confirmationData.contactInfo as Record<string, unknown>;
    const packages = confirmationData.packages as Array<Record<string, unknown>>;
    const addons = confirmationData.addons as Array<Record<string, unknown>>;
    const { totalPrice } = confirmationData;

    return {
      date: eventDetails.date ? ConfirmationApi.formatDate(eventDetails.date as string) : '',
      time: eventDetails.time ? ConfirmationApi.formatTime(eventDetails.time as string) : '',
      duration: eventDetails.duration ? `${eventDetails.duration} hours` : '',
      venue: (eventDetails.venue as string) || '',
      contact: {
        name: (contactInfo.name as string) || '',
        email: (contactInfo.email as string) || '',
        phone: (contactInfo.phone as string) || '',
      },
      items: [
        ...packages.map((pkg: Record<string, unknown>) => ({
          type: 'Package',
          name: pkg.name,
          price: pkg.price,
          quantity: pkg.quantity,
        })),
        ...addons.map((addon: Record<string, unknown>) => ({
          type: 'Add-on',
          name: addon.name,
          price: addon.price,
          quantity: addon.quantity,
        })),
      ],
      totalPrice,
    };
  }, [confirmationData]);

  // Auto-load session details on mount
  useEffect(() => {
    if (sessionId) {
      loadSessionDetails();
    }
  }, [sessionId, loadSessionDetails]);

  // Clear errors
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Navigation helpers
  const navigateToDashboard = useCallback(() => {
    window.location.href = '/dashboard';
  }, []);

  const navigateToHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  return {
    // Data
    sessionDetails,
    confirmationData,
    completionResult,
    eventSummary,
    bookingReference,
    nextSteps,
    supportContact,
    confirmationContent,
    
    // Actions
    completeBooking,
    loadSessionDetails,
    clearError,
    navigateToDashboard,
    navigateToHome,

    // State
    loading,
    completing,
    error,
    
    // Status
    isCompleted,
    
    // Configuration flags
    showBookingSummary: config?.show_booking_summary !== false,
    showNextSteps: config?.show_next_steps !== false,
    autoSendEmail: config?.send_confirmation_email === true,
    autoSendCalendarInvite: config?.send_calendar_invite === true,
    createEventImmediately: config?.create_event_immediately !== false,
  };
};

// Hook for displaying confirmation information without session management
export const useConfirmationDisplay = (
  bookingData: Record<string, unknown>,
  config?: ConfirmationStepConfiguration | null
) => {
  const confirmationContent = useMemo(() => ({
    title: config?.title || 'Booking Confirmed!',
    message: config?.message || 'Thank you for your booking. We\'ll be in touch soon!',
  }), [config]);

  const nextSteps = useMemo(() => {
    return ConfirmationApi.getNextStepsContent((config || {}) as Record<string, unknown>);
  }, [config]);

  const supportContact = useMemo(() => {
    return ConfirmationApi.getSupportContact();
  }, []);

  const formattedBookingData = useMemo(() => {
    if (!bookingData) return null;
    return ConfirmationApi.formatConfirmationData(bookingData);
  }, [bookingData]);

  const bookingReference = useMemo(() => {
    if (!bookingData?.session_id) return '';
    return ConfirmationApi.generateBookingReference(bookingData.session_id as string);
  }, [bookingData]);

  return {
    confirmationContent,
    nextSteps,
    supportContact,
    formattedBookingData,
    bookingReference,
    showBookingSummary: config?.show_booking_summary !== false,
    showNextSteps: config?.show_next_steps !== false,
  };
};