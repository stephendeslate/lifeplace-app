import { useCallback, useEffect, useRef } from 'react';
import { debounce, type DebouncedFunc } from 'lodash';
import { BookingCoreApi } from '@/apis/booking/core';
import type { BookingDispatch } from './actionTypes';

export function useDebouncedUpdate(dispatch: BookingDispatch) {
  const debouncedUpdateRef = useRef<DebouncedFunc<
    (
      sessionId: string,
      stepId: number,
      bookingDataUpdate: Record<string, unknown>,
      totalPrice: string,
    ) => Promise<void>
  > | null>(null);

  const createDebouncedBackendUpdate = useCallback(() => {
    return debounce(
      async (
        sessionId: string,
        stepId: number,
        bookingDataUpdate: Record<string, unknown>,
        totalPrice: string,
      ) => {
        BookingCoreApi.saveSessionToLocal(sessionId, {
          booking_data: bookingDataUpdate,
          total_price: totalPrice,
          updated_at: new Date().toISOString(),
          pending_sync: true,
        });

        try {
          const response = await BookingCoreApi.updateSessionData(
            sessionId,
            stepId,
            bookingDataUpdate,
            false,
          );

          if (response.total_price && response.total_price !== totalPrice) {
            dispatch({
              type: 'SET_TOTAL_PRICE',
              payload: response.total_price,
            });
          }

          if (response.validation_errors && Object.keys(response.validation_errors).length > 0) {
            dispatch({
              type: 'SET_VALIDATION_ERRORS',
              payload: response.validation_errors as Record<string, string[]>,
            });
          }

          BookingCoreApi.saveSessionToLocal(sessionId, {
            booking_data: bookingDataUpdate,
            total_price: response.total_price,
            updated_at: response.updated_at,
            pending_sync: false,
          });
        } catch (error) {
          if (import.meta.env.DEV)
            console.warn('Background update failed, data preserved in localStorage:', error);
        }
      },
      1000,
    );
  }, []);

  useEffect(() => {
    debouncedUpdateRef.current = createDebouncedBackendUpdate();

    return () => {
      if (debouncedUpdateRef.current?.cancel) {
        debouncedUpdateRef.current.cancel();
      }
    };
  }, [createDebouncedBackendUpdate]);

  return debouncedUpdateRef;
}
