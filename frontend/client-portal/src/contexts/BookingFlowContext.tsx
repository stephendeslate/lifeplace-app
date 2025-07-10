// frontend/client-portal/src/contexts/BookingFlowContext.tsx

import React, { createContext, useContext, useMemo } from 'react';
import { useBookingFlow } from '../hooks/useBookingFlow';
import type { 
  PublicBookingFlow, 
  EventType,
  BookingFlowPaymentGateways 
} from '../types/booking.types';
import type { StartSessionResponse } from '../types/booking-session.types';

interface BookingFlowContextValue {
  // Flow data
  availableFlows: PublicBookingFlow[] | undefined;
  selectedFlow: PublicBookingFlow | null;
  eventTypes: EventType[] | undefined;
  
  // ADDED: Current selections (for tracking)
  currentEventTypeId: number | undefined;
  currentFlowId: number | undefined;
  
  // Flow selection
  selectFlow: (flowId: number) => Promise<void>;
  selectEventType: (eventTypeId: number) => void;
  
  // Session management
  startSession: () => Promise<StartSessionResponse | null>;
  currentSession: StartSessionResponse | null;
  
  // Payment gateways
  paymentGateways: BookingFlowPaymentGateways | undefined;
  
  // Loading states
  isLoadingFlows: boolean;
  isLoadingFlow: boolean;
  isLoadingEventTypes: boolean;
  isLoadingPaymentGateways: boolean;
  isStartingSession: boolean;
  
  // Error states
  flowError: Error | null;
  sessionError: Error | null;
  
  // Actions
  clearError: () => void;
  reset: () => void;
}

const BookingFlowContext = createContext<BookingFlowContextValue | undefined>(undefined);

interface BookingFlowProviderProps {
  children: React.ReactNode;
  eventTypeId?: number;
  flowId?: number;
  autoStart?: boolean;
}

export const BookingFlowProvider: React.FC<BookingFlowProviderProps> = React.memo(({ 
  children, 
  eventTypeId,
  flowId,
  autoStart = false 
}) => {
  const bookingFlow = useBookingFlow({ eventTypeId, flowId, autoStart });

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<BookingFlowContextValue>(() => ({
    // Flow data
    availableFlows: bookingFlow.availableFlows,
    selectedFlow: bookingFlow.selectedFlow,
    eventTypes: bookingFlow.eventTypes,
    
    // Current selections
    currentEventTypeId: bookingFlow.currentEventTypeId,
    currentFlowId: bookingFlow.currentFlowId,
    
    // Flow selection
    selectFlow: bookingFlow.selectFlow,
    selectEventType: bookingFlow.selectEventType,
    
    // Session management
    startSession: bookingFlow.startSession,
    currentSession: bookingFlow.currentSession,
    
    // Payment gateways
    paymentGateways: bookingFlow.paymentGateways,
    
    // Loading states
    isLoadingFlows: bookingFlow.isLoadingFlows,
    isLoadingFlow: bookingFlow.isLoadingFlow,
    isLoadingEventTypes: bookingFlow.isLoadingEventTypes,
    isLoadingPaymentGateways: bookingFlow.isLoadingPaymentGateways,
    isStartingSession: bookingFlow.isStartingSession,
    
    // Error states
    flowError: bookingFlow.flowError,
    sessionError: bookingFlow.sessionError,
    
    // Actions
    clearError: bookingFlow.clearError,
    reset: bookingFlow.reset,
  }), [
    bookingFlow.availableFlows,
    bookingFlow.selectedFlow,
    bookingFlow.eventTypes,
    bookingFlow.currentEventTypeId,
    bookingFlow.currentFlowId,
    bookingFlow.selectFlow,
    bookingFlow.selectEventType,
    bookingFlow.startSession,
    bookingFlow.currentSession,
    bookingFlow.paymentGateways,
    bookingFlow.isLoadingFlows,
    bookingFlow.isLoadingFlow,
    bookingFlow.isLoadingEventTypes,
    bookingFlow.isLoadingPaymentGateways,
    bookingFlow.isStartingSession,
    bookingFlow.flowError,
    bookingFlow.sessionError,
    bookingFlow.clearError,
    bookingFlow.reset,
  ]);

  return (
    <BookingFlowContext.Provider value={contextValue}>
      {children}
    </BookingFlowContext.Provider>
  );
});

BookingFlowProvider.displayName = 'BookingFlowProvider';

export const useBookingFlowContext = (): BookingFlowContextValue => {
  const context = useContext(BookingFlowContext);
  
  if (context === undefined) {
    throw new Error('useBookingFlowContext must be used within a BookingFlowProvider');
  }
  
  return context;
};