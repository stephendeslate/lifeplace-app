import type {
  PaymentGateway,
  TaxRate,
  Payment,
  Invoice,
  Refund,
  GatewayHealth,
} from "../../../types/payments.types";

export function createMockPaymentGateway(
  overrides: Partial<PaymentGateway> = {},
): PaymentGateway {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `Gateway ${id}`,
    code: "stripe",
    is_active: true,
    config: {},
    description: `Payment gateway ${id}`,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  } as PaymentGateway;
}

export const mockGateways = [
  createMockPaymentGateway({ id: 1, name: "Stripe", code: "stripe" }),
  createMockPaymentGateway({ id: 2, name: "PayMongo", code: "paymongo" }),
];

export function createMockGatewayHealth(gatewayId: number): GatewayHealth {
  return {
    gateway_id: gatewayId,
    gateway_code: "stripe",
    status: "healthy",
    last_checked: "2024-06-15T10:00:00Z",
    last_successful_transaction: "2024-06-15T09:30:00Z",
    error_message: null,
    is_configured: true,
    test_mode: false,
  } as GatewayHealth;
}

export function createMockTaxRate(overrides: Partial<TaxRate> = {}): TaxRate {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `Tax Rate ${id}`,
    rate: "0.12",
    region: "PH",
    is_default: false,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  } as TaxRate;
}

export const mockTaxRates = [
  createMockTaxRate({
    id: 1,
    name: "VAT 12%",
    rate: "0.12",
    region: "PH",
    is_default: true,
  }),
  createMockTaxRate({
    id: 2,
    name: "Service Tax 5%",
    rate: "0.05",
    region: "PH",
  }),
];

export function createMockPayment(overrides: Partial<Payment> = {}): Payment {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    payment_number: `PAY-${String(id).padStart(4, "0")}`,
    event: 1,
    event_details: {
      id: 1,
      name: "Test Event",
      client_name: "John Doe",
      start_date: "2024-07-01",
      status: "CONFIRMED",
    },
    amount: "10000.00",
    currency: "PHP",
    status: "PENDING",
    status_display: "Pending",
    due_date: "2024-07-01",
    paid_on: null,
    payment_method: null,
    description: "Event payment",
    notes: "",
    reference_number: "",
    is_manual: false,
    processed_by: null,
    receipt_number: null,
    receipt_generated_on: null,
    receipt_sent: false,
    receipt_sent_on: null,
    receipt_pdf: null,
    quote: null,
    invoice: null,
    installment: null,
    transactions: [],
    refunds: [],
    notifications: [],
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  } as Payment;
}

export const mockPayments = [
  createMockPayment({ id: 1, status: "PENDING" }),
  createMockPayment({ id: 2, status: "COMPLETED", paid_on: "2024-06-20" }),
  createMockPayment({ id: 3, status: "FAILED" }),
];

export function createMockInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    invoice_id: `INV-2024-${String(id).padStart(3, "0")}`,
    event: 1,
    client: 1,
    subtotal: "10000.00",
    tax_amount: "1200.00",
    total_amount: "11200.00",
    currency: "PHP",
    issue_date: "2024-06-15",
    due_date: "2024-07-15",
    status: "ISSUED",
    status_display: "Issued",
    notes: "",
    payment_terms: "Net 30",
    quote: null,
    invoice_pdf: null,
    line_items: [],
    taxes: [],
    related_payments: [],
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  } as Invoice;
}

export function createMockRefund(overrides: Partial<Refund> = {}): Refund {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    payment: 1,
    amount: "5000.00",
    currency: "PHP",
    reason: "Customer requested cancellation",
    status: "PENDING",
    status_display: "Pending",
    refunded_by: null,
    refund_transaction_id: "",
    gateway_response: {},
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  } as Refund;
}
