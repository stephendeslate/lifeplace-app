// frontend/admin-crm/src/apis/bookingflows/public-flows.ts

import api from '../../utils/api';
import type { BookingFlow, BookingFlowStep } from '../../types/bookingflows';

export const getPublicBookingFlows = async (): Promise<BookingFlow[]> => {
  const response = await api.get<BookingFlow[]>('/bookingflow/public/flows/');
  return Array.isArray(response.data) ? response.data : [];
};

export const startPublicSession = async (
  flowId: number,
): Promise<{
  session_id: string;
  current_step: BookingFlowStep | null;
  expires_at: string;
  progress_percentage: number;
}> => {
  const response = await api.post<{
    session_id: string;
    current_step: BookingFlowStep | null;
    expires_at: string;
    progress_percentage: number;
  }>(`/bookingflow/public/flows/${flowId}/start_session/`);
  return response.data;
};

export const getPublicPaymentGateways = async (
  flowId: number,
): Promise<{
  available_gateways: Array<{
    id: number;
    name: string;
    code: string;
    description: string;
    public_config: Record<string, unknown>;
  }>;
  default_gateway: number | null;
  require_immediate_payment: boolean;
}> => {
  const response = await api.get<{
    available_gateways: Array<{
      id: number;
      name: string;
      code: string;
      description: string;
      public_config: Record<string, unknown>;
    }>;
    default_gateway: number | null;
    require_immediate_payment: boolean;
  }>(`/bookingflow/public/flows/${flowId}/payment_gateways/`);
  return response.data;
};
