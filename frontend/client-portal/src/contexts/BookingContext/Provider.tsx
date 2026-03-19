import React, { createContext, useReducer } from 'react';
import type { BookingState, BookingActions } from '@/types/booking';
import { initialState } from './types';
import { bookingReducer } from './reducer';
import { useDebouncedUpdate } from './useDebouncedUpdate';
import {
  useProgressTracking,
  useSessionRecovery,
  useSessionPersistence,
} from './useSessionEffects';
import { useBookingActions } from './useBookingActions';

export const BookingContext = createContext<{
  state: BookingState;
  actions: BookingActions;
} | null>(null);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const debouncedUpdateRef = useDebouncedUpdate(dispatch);

  useProgressTracking(state, dispatch);
  useSessionRecovery(dispatch);
  useSessionPersistence(state, debouncedUpdateRef);

  const actions = useBookingActions(state, dispatch, debouncedUpdateRef);

  const value = { state, actions };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};
