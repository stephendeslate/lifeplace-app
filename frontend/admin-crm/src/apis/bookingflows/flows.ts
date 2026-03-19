// frontend/admin-crm/src/apis/bookingflows/flows.ts

import api from '../../utils/api';
import type {
  BookingFlow,
  BookingFlowDetail,
  CreateBookingFlowData,
  UpdateBookingFlowData,
  DuplicateFlowData,
} from '../../types/bookingflows';
import type { PaginatedResponse, PaginationParams } from '../../types/common.types';

export interface BookingFlowQueryParams extends PaginationParams {
  search?: string;
  event_type?: number;
  is_active?: boolean;
  ordering?: string;
}

export const getBookingFlows = async (
  params?: BookingFlowQueryParams,
): Promise<PaginatedResponse<BookingFlow>> => {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.event_type !== undefined)
    searchParams.append('event_type', params.event_type.toString());
  if (params?.is_active !== undefined)
    searchParams.append('is_active', params.is_active.toString());
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
  if (params?.ordering) searchParams.append('ordering', params.ordering);

  const response = await api.get<PaginatedResponse<BookingFlow>>(
    `/bookingflow/flows/?${searchParams.toString()}`,
  );
  return response.data;
};

export const getBookingFlow = async (id: number): Promise<BookingFlowDetail> => {
  const response = await api.get<BookingFlowDetail>(`/bookingflow/flows/${id}/`);
  return response.data;
};

export const createBookingFlow = async (data: CreateBookingFlowData): Promise<BookingFlow> => {
  const response = await api.post<BookingFlow>('/bookingflow/flows/', data);
  return response.data;
};

export const updateBookingFlow = async (
  id: number,
  data: UpdateBookingFlowData,
): Promise<BookingFlow> => {
  const response = await api.patch<BookingFlow>(`/bookingflow/flows/${id}/`, data);
  return response.data;
};

export const deleteBookingFlow = async (id: number): Promise<void> => {
  await api.delete(`/bookingflow/flows/${id}/`);
};

export const duplicateBookingFlow = async (
  id: number,
  data: DuplicateFlowData,
): Promise<BookingFlow> => {
  const response = await api.post<BookingFlow>(`/bookingflow/flows/${id}/duplicate/`, data);
  return response.data;
};

export const getActiveBookingFlows = async (): Promise<BookingFlow[]> => {
  const response = await api.get<PaginatedResponse<BookingFlow>>('/bookingflow/flows/active/');

  // Handle paginated response
  if (response.data && typeof response.data === 'object' && 'results' in response.data) {
    return response.data.results;
  }

  return Array.isArray(response.data) ? response.data : [];
};
