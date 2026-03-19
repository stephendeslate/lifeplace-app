// frontend/client-portal/src/contexts/BookingContext/useBooking.ts

import { useContext } from 'react';
import { BookingContext } from './Provider';

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
