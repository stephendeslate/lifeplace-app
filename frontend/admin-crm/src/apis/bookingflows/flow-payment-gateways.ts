// frontend/admin-crm/src/apis/bookingflows/flow-payment-gateways.ts

import api from '../../utils/api';

export const getFlowPaymentGateways = async (
  flowId: number,
): Promise<{
  available_gateways: Array<{
    id: number;
    name: string;
    code: string;
    description: string;
    is_active: boolean;
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
      is_active: boolean;
      public_config: Record<string, unknown>;
    }>;
    default_gateway: number | null;
    require_immediate_payment: boolean;
  }>(`/bookingflow/flows/${flowId}/payment_gateways/`);
  return response.data;
};
