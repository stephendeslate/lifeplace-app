import type { MutableRefObject } from 'react';
import type { DebouncedFunc } from 'lodash';
import type { BookingAction } from './types';

export type BookingDispatch = React.Dispatch<BookingAction>;

export type DebouncedUpdateRef = MutableRefObject<DebouncedFunc<
  (
    sessionId: string,
    stepId: number,
    bookingDataUpdate: Record<string, unknown>,
    totalPrice: string,
  ) => Promise<void>
> | null>;
