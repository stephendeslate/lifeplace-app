// frontend/admin-crm/src/apis/bookingflows/sessions.ts

import api from '../../utils/api';
import type {
  BookingSession,
  CreateBookingSessionData,
  UpdateBookingSessionData,
  BookingSessionFilters,
} from '../../types/bookingflows';
import type { PaginatedResponse } from '../../types/common.types';

export const getBookingSessions = async (
  filters?: BookingSessionFilters,
): Promise<BookingSession[]> => {
  const params = new URLSearchParams();
  if (filters?.booking_flow) params.append('booking_flow', filters.booking_flow.toString());
  if (filters?.is_completed !== undefined)
    params.append('is_completed', filters.is_completed.toString());
  if (filters?.is_abandoned !== undefined)
    params.append('is_abandoned', filters.is_abandoned.toString());

  const response = await api.get<PaginatedResponse<BookingSession>>(
    `/bookingflow/sessions/?${params.toString()}`,
  );

  // Handle paginated response
  if (response.data && typeof response.data === 'object' && 'results' in response.data) {
    return response.data.results;
  }

  return Array.isArray(response.data) ? response.data : [];
};

export const getBookingSession = async (id: number): Promise<BookingSession> => {
  const response = await api.get<BookingSession>(`/bookingflow/sessions/${id}/`);
  return response.data;
};

export const createBookingSession = async (
  data: CreateBookingSessionData,
): Promise<BookingSession> => {
  const response = await api.post<BookingSession>('/bookingflow/sessions/', data);
  return response.data;
};

export const updateBookingSessionData = async (
  id: number,
  data: UpdateBookingSessionData,
): Promise<BookingSession> => {
  const response = await api.patch<BookingSession>(
    `/bookingflow/sessions/${id}/update_data/`,
    data,
  );
  return response.data;
};

export const completeBooking = async (
  id: number,
): Promise<{
  detail: string;
  event: {
    id: number;
    name: string;
    event_date: string;
    status: string;
    client_id: number;
    total_price: string;
  };
  session: BookingSession;
}> => {
  const response = await api.post<{
    detail: string;
    event: {
      id: number;
      name: string;
      event_date: string;
      status: string;
      client_id: number;
      total_price: string;
    };
    session: BookingSession;
  }>(`/bookingflow/sessions/${id}/complete_booking/`);
  return response.data;
};

export const abandonSession = async (id: number, reason?: string): Promise<BookingSession> => {
  const response = await api.post<BookingSession>(`/bookingflow/sessions/${id}/abandon/`, {
    reason,
  });
  return response.data;
};
