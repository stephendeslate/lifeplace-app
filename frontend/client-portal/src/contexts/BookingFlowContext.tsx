// frontend/client-portal/src/contexts/BookingFlowContext.tsx

import React, { createContext, useContext } from 'react';
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
  autoStart?: boolean;
}

export const BookingFlowProvider: React.FC<BookingFlowProviderProps> = ({ 
  children, 
  eventTypeId,
  autoStart = false 
}) => {
  const bookingFlow = useBookingFlow({ eventTypeId, autoStart });

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue: BookingFlowContextValue = React.useMemo(() => ({
    // Flow data
    availableFlows: bookingFlow.availableFlows,
    selectedFlow: bookingFlow.selectedFlow,
    eventTypes: bookingFlow.eventTypes,
    
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
  }), [bookingFlow]);

  return (
    <BookingFlowContext.Provider value={contextValue}>
      {children}
    </BookingFlowContext.Provider>
  );
};

export const useBookingFlowContext = (): BookingFlowContextValue => {
  const context = useContext(BookingFlowContext);
  
  if (context === undefined) {
    throw new Error('useBookingFlowContext must be used within a BookingFlowProvider');
  }
  
  return context;
};