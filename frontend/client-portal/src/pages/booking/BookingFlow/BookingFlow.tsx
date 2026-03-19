// frontend/client-portal/src/pages/booking/BookingFlow/BookingFlow.tsx

import React from 'react';
import { BookingProvider } from '@/contexts/BookingContext';
import { BookingFlowContent } from './BookingFlowContent';

/**
 * Main booking page designed to work within PublicLayout.
 * Wraps the flow content in the BookingProvider context.
 */
export const BookingPage: React.FC = () => {
  return (
    <>
      <BookingProvider>
        {/* No background styling here - handled by PublicLayout */}
        <BookingFlowContent />
      </BookingProvider>
    </>
  );
};
