// frontend/client-portal/src/types/booking/payment.types.ts

// Payment Gateway types from payments domain
export interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  public_config: Record<string, any>;
}

export interface PaymentGatewayResponse {
  available_gateways: PaymentGateway[];
  default_gateway: number | null;
  require_immediate_payment: boolean;
}