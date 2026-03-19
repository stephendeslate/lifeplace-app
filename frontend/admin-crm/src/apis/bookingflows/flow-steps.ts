// frontend/admin-crm/src/apis/bookingflows/flow-steps.ts

import api from '../../utils/api';
import type {
  BookingFlowStep,
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
  ReorderStepsData,
} from '../../types/bookingflows';
import type { PaginatedResponse, PaginationParams } from '../../types/common.types';

export interface BookingFlowStepQueryParams extends PaginationParams {
  search?: string;
  flow_id?: number;
  step_type?: string;
  ordering?: string;
}

export const getFlowSteps = async (flowId: number): Promise<BookingFlowStep[]> => {
  const response = await api.get<BookingFlowStep[]>(`/bookingflow/flows/${flowId}/steps/`);
  return response.data;
};

export const getBookingFlowSteps = async (
  params?: BookingFlowStepQueryParams,
): Promise<PaginatedResponse<BookingFlowStep>> => {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.flow_id) searchParams.append('flow_id', params.flow_id.toString());
  if (params?.step_type) searchParams.append('step_type', params.step_type);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
  if (params?.ordering) searchParams.append('ordering', params.ordering);

  const response = await api.get<PaginatedResponse<BookingFlowStep>>(
    `/bookingflow/steps/?${searchParams.toString()}`,
  );
  return response.data;
};

export const getBookingFlowStep = async (id: number): Promise<BookingFlowStep> => {
  const response = await api.get<BookingFlowStep>(`/bookingflow/steps/${id}/`);
  return response.data;
};

export const createBookingFlowStep = async (
  data: CreateBookingFlowStepData,
): Promise<BookingFlowStep> => {
  const response = await api.post<BookingFlowStep>('/bookingflow/steps/', data);
  return response.data;
};

export const updateBookingFlowStep = async (
  id: number,
  data: UpdateBookingFlowStepData,
): Promise<BookingFlowStep> => {
  const response = await api.patch<BookingFlowStep>(`/bookingflow/steps/${id}/`, data);
  return response.data;
};

export const deleteBookingFlowStep = async (id: number): Promise<void> => {
  await api.delete(`/bookingflow/steps/${id}/`);
};

export const reorderSteps = async (data: ReorderStepsData): Promise<BookingFlowStep[]> => {
  const response = await api.post<BookingFlowStep[]>('/bookingflow/steps/reorder/', data);
  return response.data;
};

export const getAvailableStepTypes = async (): Promise<{
  step_types: Array<{ value: string; label: string }>;
  total_count: number;
  removed_types: Array<{
    value: string;
    label: string;
    reason: string;
    migration_available: boolean;
  }>;
}> => {
  const response = await api.get<{
    step_types: Array<{ value: string; label: string }>;
    total_count: number;
    removed_types: Array<{
      value: string;
      label: string;
      reason: string;
      migration_available: boolean;
    }>;
  }>('/bookingflow/steps/available_step_types/');
  return response.data;
};
