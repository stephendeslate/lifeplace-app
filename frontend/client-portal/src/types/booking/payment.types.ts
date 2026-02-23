// frontend/client-portal/src/types/booking/payment.types.ts

// Payment Gateway types from payments domain
export interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  public_config: Record<string, string | number | boolean>;
}

export interface PaymentGatewayResponse {
  available_gateways: PaymentGateway[];
  default_gateway: number | null;
  require_immediate_payment: boolean;
}

export interface PaymentStepConfiguration {
  accept_full_payment: boolean;
  accept_deposit: boolean;
  // REMOVED: deposit_type - now always PERCENTAGE from PaymentPlanSettings.default_deposit_percentage
  // REMOVED: deposit_amount - now from PaymentPlanSettings.default_deposit_percentage
  available_payment_methods: string[];
  require_immediate_payment: boolean;
  allowed_gateways: number[];
  default_gateway: number | null;
  allow_payment_plans: boolean;
  payment_terms: string;

  // Quote request options
  allow_quote_request: boolean;
  quote_request_button_text: string;
  quote_request_description: string;
}
