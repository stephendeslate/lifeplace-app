import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { paymentsApi } from "./payments.api";

vi.mock("../utils/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("paymentsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Payment Gateways ---

  describe("getPaymentGateways", () => {
    it("fetches gateways and extracts results from paginated response", async () => {
      const mockGateways = [{ id: 1, name: "Stripe" }];
      mockApi.get.mockResolvedValue({ data: { results: mockGateways } });

      const result = await paymentsApi.getPaymentGateways();

      expect(mockApi.get).toHaveBeenCalledWith("/payments/gateways/");
      expect(result).toEqual(mockGateways);
    });
  });

  describe("getPaymentGateway", () => {
    it("fetches a single gateway by ID", async () => {
      const mockGateway = { id: 1, name: "Stripe" };
      mockApi.get.mockResolvedValue({ data: mockGateway });

      const result = await paymentsApi.getPaymentGateway(1);

      expect(mockApi.get).toHaveBeenCalledWith("/payments/gateways/1/");
      expect(result).toEqual(mockGateway);
    });
  });

  describe("createPaymentGateway", () => {
    it("posts gateway data to /payments/gateways/", async () => {
      const data = { name: "PayPal", code: "paypal" };
      mockApi.post.mockResolvedValue({ data: { id: 2, ...data } });

      const result = await paymentsApi.createPaymentGateway(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/payments/gateways/", data);
      expect(result).toEqual({ id: 2, ...data });
    });
  });

  describe("updatePaymentGateway", () => {
    it("puts gateway data at /payments/gateways/:id/", async () => {
      const data = { name: "Updated Stripe" };
      mockApi.put.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await paymentsApi.updatePaymentGateway(1, data as never);

      expect(mockApi.put).toHaveBeenCalledWith("/payments/gateways/1/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("deletePaymentGateway", () => {
    it("deletes gateway at /payments/gateways/:id/", async () => {
      mockApi.delete.mockResolvedValue({});

      await paymentsApi.deletePaymentGateway(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/payments/gateways/1/");
    });
  });

  describe("getGatewayHealth", () => {
    it("fetches gateway health status", async () => {
      const mockHealth = { 1: { status: "healthy", latency: 50 } };
      mockApi.get.mockResolvedValue({ data: mockHealth });

      const result = await paymentsApi.getGatewayHealth();

      expect(mockApi.get).toHaveBeenCalledWith("/payments/gateways/health/");
      expect(result).toEqual(mockHealth);
    });
  });

  // --- Tax Rates ---

  describe("getTaxRates", () => {
    it("fetches tax rates and extracts results from paginated response", async () => {
      const mockRates = [{ id: 1, name: "VAT", rate: "12.00" }];
      mockApi.get.mockResolvedValue({ data: { results: mockRates } });

      const result = await paymentsApi.getTaxRates();

      expect(mockApi.get).toHaveBeenCalledWith("/payments/tax-rates/");
      expect(result).toEqual(mockRates);
    });
  });

  describe("createTaxRate", () => {
    it("posts tax rate data", async () => {
      const data = { name: "Service Tax", rate: "5.00" };
      mockApi.post.mockResolvedValue({ data: { id: 2, ...data } });

      const result = await paymentsApi.createTaxRate(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/payments/tax-rates/", data);
      expect(result).toEqual({ id: 2, ...data });
    });
  });

  describe("updateTaxRate", () => {
    it("puts tax rate data at /payments/tax-rates/:id/", async () => {
      const data = { name: "Updated VAT", rate: "15.00" };
      mockApi.put.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await paymentsApi.updateTaxRate(1, data as never);

      expect(mockApi.put).toHaveBeenCalledWith("/payments/tax-rates/1/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("deleteTaxRate", () => {
    it("deletes tax rate at /payments/tax-rates/:id/", async () => {
      mockApi.delete.mockResolvedValue({});

      await paymentsApi.deleteTaxRate(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/payments/tax-rates/1/");
    });
  });

  // --- Payments ---

  describe("getPayments", () => {
    it("calls /payments/payments/ with no params", async () => {
      const mockData = { results: [], count: 0, next: null, previous: null };
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await paymentsApi.getPayments();

      expect(mockApi.get).toHaveBeenCalledWith("/payments/payments/?");
      expect(result).toEqual(mockData);
    });

    it("constructs all filter params", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [], count: 0 } });

      await paymentsApi.getPayments({
        event: 5,
        status: "completed",
        start_date: "2025-01-01",
        end_date: "2025-12-31",
        search: "invoice",
        payment_method: 3,
        is_manual: true,
        amount_min: "100",
        amount_max: "5000",
        page: 2,
        page_size: 25,
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("event=5");
      expect(calledUrl).toContain("status=completed");
      expect(calledUrl).toContain("start_date=2025-01-01");
      expect(calledUrl).toContain("end_date=2025-12-31");
      expect(calledUrl).toContain("search=invoice");
      expect(calledUrl).toContain("payment_method=3");
      expect(calledUrl).toContain("is_manual=true");
      expect(calledUrl).toContain("amount_min=100");
      expect(calledUrl).toContain("amount_max=5000");
      expect(calledUrl).toContain("page=2");
      expect(calledUrl).toContain("page_size=25");
    });
  });

  describe("getPayment", () => {
    it("fetches a single payment by ID", async () => {
      const mockPayment = { id: 10, amount: "500.00" };
      mockApi.get.mockResolvedValue({ data: mockPayment });

      const result = await paymentsApi.getPayment(10);

      expect(mockApi.get).toHaveBeenCalledWith("/payments/payments/10/");
      expect(result).toEqual(mockPayment);
    });
  });

  describe("createPayment", () => {
    it("posts payment data to /payments/payments/", async () => {
      const data = { event: 5, amount: "1000.00", status: "pending" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await paymentsApi.createPayment(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/payments/payments/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("updatePayment", () => {
    it("patches payment data at /payments/payments/:id/", async () => {
      const data = { status: "completed" };
      mockApi.patch.mockResolvedValue({ data: { id: 1, status: "completed" } });

      const result = await paymentsApi.updatePayment(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith("/payments/payments/1/", data);
      expect(result).toEqual({ id: 1, status: "completed" });
    });
  });

  describe("deletePayment", () => {
    it("deletes payment at /payments/payments/:id/", async () => {
      mockApi.delete.mockResolvedValue({});

      await paymentsApi.deletePayment(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/payments/payments/1/");
    });
  });

  describe("processPayment", () => {
    it("posts process data to /payments/payments/:id/process/", async () => {
      const data = { gateway_id: 1, payment_method_id: 2 };
      const mockTransaction = { id: 1, status: "success" };
      mockApi.post.mockResolvedValue({ data: mockTransaction });

      const result = await paymentsApi.processPayment(5, data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/payments/payments/5/process/",
        data,
      );
      expect(result).toEqual(mockTransaction);
    });
  });

  describe("sendReceipt", () => {
    it("posts to send_receipt endpoint", async () => {
      mockApi.post.mockResolvedValue({ data: { detail: "Receipt sent" } });

      const result = await paymentsApi.sendReceipt(5);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/payments/payments/5/send_receipt/",
      );
      expect(result).toEqual({ detail: "Receipt sent" });
    });
  });

  describe("sendReminder", () => {
    it("posts to send_reminder endpoint", async () => {
      mockApi.post.mockResolvedValue({ data: { detail: "Reminder sent" } });

      const result = await paymentsApi.sendReminder(5);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/payments/payments/5/send_reminder/",
      );
      expect(result).toEqual({ detail: "Reminder sent" });
    });
  });

  // --- Payment Plans ---

  describe("getPaymentPlans", () => {
    it("calls /payments/payment-plans/ with event filter", async () => {
      const mockPlans = [{ id: 1, name: "Monthly Plan" }];
      mockApi.get.mockResolvedValue({ data: { results: mockPlans } });

      const result = await paymentsApi.getPaymentPlans({ event: 5 });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("event=5");
      expect(result).toEqual(mockPlans);
    });

    it("handles direct array response", async () => {
      const mockPlans = [{ id: 1, name: "Monthly Plan" }];
      mockApi.get.mockResolvedValue({ data: mockPlans });

      const result = await paymentsApi.getPaymentPlans();

      expect(result).toEqual(mockPlans);
    });
  });

  describe("createPaymentPlan", () => {
    it("posts plan data to /payments/payment-plans/", async () => {
      const data = { event: 5, name: "Quarterly" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await paymentsApi.createPaymentPlan(data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/payments/payment-plans/",
        data,
      );
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("updatePaymentPlan", () => {
    it("patches plan data at /payments/payment-plans/:id/", async () => {
      const data = { name: "Updated Plan" };
      mockApi.patch.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await paymentsApi.updatePaymentPlan(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith(
        "/payments/payment-plans/1/",
        data,
      );
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("deletePaymentPlan", () => {
    it("deletes plan at /payments/payment-plans/:id/", async () => {
      mockApi.delete.mockResolvedValue({});

      await paymentsApi.deletePaymentPlan(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/payments/payment-plans/1/");
    });
  });

  // --- Installments ---

  describe("getPaymentInstallments", () => {
    it("constructs filter params for installments", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [], count: 0 } });

      await paymentsApi.getPaymentInstallments({
        payment_plan: 3,
        status: "pending",
        due_date_start: "2025-01-01",
        due_date_end: "2025-03-31",
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("payment_plan=3");
      expect(calledUrl).toContain("status=pending");
      expect(calledUrl).toContain("due_date_start=2025-01-01");
      expect(calledUrl).toContain("due_date_end=2025-03-31");
    });

    it("handles direct array response", async () => {
      const mockInstallments = [{ id: 1, amount: "500.00" }];
      mockApi.get.mockResolvedValue({ data: mockInstallments });

      const result = await paymentsApi.getPaymentInstallments();

      expect(result).toEqual(mockInstallments);
    });
  });

  describe("createPaymentFromInstallment", () => {
    it("posts to /payments/installments/:id/create_payment/", async () => {
      const data = { gateway_id: 1 };
      mockApi.post.mockResolvedValue({ data: { id: 1, status: "pending" } });

      const result = await paymentsApi.createPaymentFromInstallment(
        5,
        data as never,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/payments/installments/5/create_payment/",
        data,
      );
      expect(result).toEqual({ id: 1, status: "pending" });
    });
  });

  // --- Invoices ---

  describe("getInvoices", () => {
    it("constructs filter params for invoices", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [] } });

      await paymentsApi.getInvoices({
        event_id: 5,
        client_id: 10,
        status: "sent",
        search: "INV-001",
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("event_id=5");
      expect(calledUrl).toContain("client_id=10");
      expect(calledUrl).toContain("status=sent");
      expect(calledUrl).toContain("search=INV-001");
    });

    it("handles direct array response", async () => {
      const mockInvoices = [{ id: 1, invoice_id: "INV-001" }];
      mockApi.get.mockResolvedValue({ data: mockInvoices });

      const result = await paymentsApi.getInvoices();

      expect(result).toEqual(mockInvoices);
    });
  });

  describe("getInvoice", () => {
    it("fetches a single invoice by ID", async () => {
      const mockInvoice = { id: 1, invoice_id: "INV-001" };
      mockApi.get.mockResolvedValue({ data: mockInvoice });

      const result = await paymentsApi.getInvoice(1);

      expect(mockApi.get).toHaveBeenCalledWith("/payments/invoices/1/");
      expect(result).toEqual(mockInvoice);
    });
  });

  describe("createInvoice", () => {
    it("posts invoice data to /payments/invoices/", async () => {
      const data = { event: 5, client: 10 };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await paymentsApi.createInvoice(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/payments/invoices/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("updateInvoice", () => {
    it("patches invoice data at /payments/invoices/:id/", async () => {
      const data = { status: "paid" };
      mockApi.patch.mockResolvedValue({ data: { id: 1, status: "paid" } });

      const result = await paymentsApi.updateInvoice(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith("/payments/invoices/1/", data);
      expect(result).toEqual({ id: 1, status: "paid" });
    });
  });

  describe("deleteInvoice", () => {
    it("deletes invoice at /payments/invoices/:id/", async () => {
      mockApi.delete.mockResolvedValue({});

      await paymentsApi.deleteInvoice(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/payments/invoices/1/");
    });
  });

  describe("sendInvoice", () => {
    it("posts to send_invoice endpoint", async () => {
      const mockResponse = { detail: "Invoice sent", status: "sent" };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await paymentsApi.sendInvoice(5);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/payments/invoices/5/send_invoice/",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("downloadInvoicePdf", () => {
    it("fetches invoice PDF as blob", async () => {
      const mockBlob = new Blob(["pdf-content"]);
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await paymentsApi.downloadInvoicePdf(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/payments/invoices/5/download_pdf/",
        {
          responseType: "blob",
        },
      );
      expect(result).toBe(mockBlob);
    });
  });

  describe("getInvoicesForClient", () => {
    it("fetches invoices filtered by client ID and extracts results", async () => {
      const mockInvoices = [{ id: 1, invoice_id: "INV-001" }];
      mockApi.get.mockResolvedValue({ data: { results: mockInvoices } });

      const result = await paymentsApi.getInvoicesForClient(10);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/payments/invoices/?client_id=10",
      );
      expect(result).toEqual(mockInvoices);
    });
  });

  // --- Transactions ---

  describe("getPaymentTransactions", () => {
    it("constructs filter params for transactions", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [] } });

      await paymentsApi.getPaymentTransactions({
        payment: 5,
        gateway: 1,
        status: "success",
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("payment=5");
      expect(calledUrl).toContain("gateway=1");
      expect(calledUrl).toContain("status=success");
    });
  });

  // --- Notifications ---

  describe("getPaymentNotifications", () => {
    it("constructs filter params for notifications", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [] } });

      await paymentsApi.getPaymentNotifications({
        payment: 5,
        notification_type: "receipt",
        is_successful: true,
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("payment=5");
      expect(calledUrl).toContain("notification_type=receipt");
      expect(calledUrl).toContain("is_successful=true");
    });
  });

  // --- Refunds ---

  describe("getRefunds", () => {
    it("constructs filter params for refunds", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [] } });

      await paymentsApi.getRefunds({ payment: 5, status: "approved" });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("payment=5");
      expect(calledUrl).toContain("status=approved");
    });

    it("handles direct array response", async () => {
      const mockRefunds = [{ id: 1, amount: "100.00" }];
      mockApi.get.mockResolvedValue({ data: mockRefunds });

      const result = await paymentsApi.getRefunds();

      expect(result).toEqual(mockRefunds);
    });
  });

  describe("createRefund", () => {
    it("posts refund data to /payments/refunds/", async () => {
      const data = { payment: 5, amount: "200.00", reason: "Client request" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await paymentsApi.createRefund(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/payments/refunds/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  // --- Payment Settings ---

  describe("getPaymentSettings", () => {
    it("fetches settings array and returns first element", async () => {
      const mockSettings = { id: 1, currency: "PHP", auto_send_receipts: true };
      mockApi.get.mockResolvedValue({ data: [mockSettings] });

      const result = await paymentsApi.getPaymentSettings();

      expect(mockApi.get).toHaveBeenCalledWith("/payments/settings/");
      expect(result).toEqual(mockSettings);
    });
  });

  describe("updatePaymentSettings", () => {
    it("puts settings data at /payments/settings/:id/", async () => {
      const data = { currency: "USD" };
      mockApi.put.mockResolvedValue({ data: { id: 1, currency: "USD" } });

      const result = await paymentsApi.updatePaymentSettings(1, data as never);

      expect(mockApi.put).toHaveBeenCalledWith("/payments/settings/1/", data);
      expect(result).toEqual({ id: 1, currency: "USD" });
    });
  });

  describe("partialUpdatePaymentSettings", () => {
    it("patches settings data at /payments/settings/:id/", async () => {
      const data = { auto_send_receipts: false };
      mockApi.patch.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await paymentsApi.partialUpdatePaymentSettings(
        1,
        data as never,
      );

      expect(mockApi.patch).toHaveBeenCalledWith("/payments/settings/1/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  // --- Payment Methods ---

  describe("getPaymentMethods", () => {
    it("fetches payment methods and extracts results", async () => {
      const mockMethods = [{ id: 1, type: "card" }];
      mockApi.get.mockResolvedValue({ data: { results: mockMethods } });

      const result = await paymentsApi.getPaymentMethods();

      expect(mockApi.get).toHaveBeenCalledWith("/payments/payment-methods/");
      expect(result).toEqual(mockMethods);
    });
  });

  describe("getPaymentMethodsForUser", () => {
    it("fetches payment methods for a specific user", async () => {
      const mockMethods = [{ id: 1, type: "card" }];
      mockApi.get.mockResolvedValue({ data: mockMethods });

      const result = await paymentsApi.getPaymentMethodsForUser(42);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/payments/payment-methods/for_user/?user_id=42",
      );
      expect(result).toEqual(mockMethods);
    });
  });
});
