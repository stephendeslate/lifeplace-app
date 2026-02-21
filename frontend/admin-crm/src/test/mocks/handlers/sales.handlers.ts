// frontend/admin-crm/src/test/mocks/handlers/sales.handlers.ts

import { http, HttpResponse, delay } from "msw";
import {
  mockQuotes,
  mockQuoteLineItems,
  createMockQuote,
  createMockQuoteLineItem,
} from "../data/sales.mock";
import type {
  EventQuote,
  QuoteLineItem,
  QuoteOption,
  QuoteActivity,
  QuoteReminder,
} from "../../../types/sales.types";

const BASE_URL = "http://localhost:8000/api";

// Mutable stores for testing mutations
let quotesStore = [...mockQuotes];
let lineItemsStore = [...mockQuoteLineItems];
const quoteTemplatesStore = [
  {
    id: 1,
    name: "Standard Wedding Quote",
    description: "Default wedding quote template",
    event_type: 1,
    event_type_name: "Wedding",
    is_active: true,
    default_terms: "Standard terms apply.",
    default_validity_days: 30,
    default_tax_rate: "0.12",
    default_service_charge_rate: "0.10",
    products: [],
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  },
  {
    id: 2,
    name: "Corporate Event Quote",
    description: "Template for corporate events",
    event_type: 2,
    event_type_name: "Corporate",
    is_active: true,
    default_terms: "Corporate terms apply.",
    default_validity_days: 14,
    default_tax_rate: "0.12",
    default_service_charge_rate: "0.10",
    products: [],
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  },
];
const templateProductsStore = [
  {
    id: 1,
    template: 1,
    product: 1,
    product_name: "Wedding Photography Package",
    quantity: 1,
    unit_price: "25000.00",
    notes: "",
    order: 1,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  },
];
const quoteOptionsStore: QuoteOption[] = [];

export const resetSalesStore = () => {
  quotesStore = [...mockQuotes];
  lineItemsStore = [...mockQuoteLineItems];
};

export const salesHandlers = [
  // === Quote Templates ===

  // GET /api/sales/templates/
  http.get(`${BASE_URL}/sales/templates/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const eventType = url.searchParams.get("event_type");
    const isActive = url.searchParams.get("is_active");

    let filtered = [...quoteTemplatesStore];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower),
      );
    }
    if (eventType) {
      filtered = filtered.filter((t) => t.event_type === parseInt(eventType));
    }
    if (isActive !== null && isActive !== undefined) {
      const isActiveBool = isActive === "true";
      filtered = filtered.filter((t) => t.is_active === isActiveBool);
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/sales/templates/active/
  http.get(`${BASE_URL}/sales/templates/active/`, async () => {
    await delay(30);
    const active = quoteTemplatesStore.filter((t) => t.is_active);
    return HttpResponse.json(active);
  }),

  // GET /api/sales/templates/for_event_type/
  http.get(
    `${BASE_URL}/sales/templates/for_event_type/`,
    async ({ request }) => {
      await delay(30);

      const url = new URL(request.url);
      const eventType = url.searchParams.get("event_type");

      const filtered = eventType
        ? quoteTemplatesStore.filter(
            (t) => t.event_type === parseInt(eventType) && t.is_active,
          )
        : quoteTemplatesStore.filter((t) => t.is_active);

      return HttpResponse.json(filtered);
    },
  ),

  // GET /api/sales/templates/:id/
  http.get(`${BASE_URL}/sales/templates/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const template = quoteTemplatesStore.find((t) => t.id === id);

    if (!template) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(template);
  }),

  // POST /api/sales/templates/
  http.post(`${BASE_URL}/sales/templates/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newTemplate = {
      id: quoteTemplatesStore.length + 1,
      name: body.name as string,
      description: (body.description as string) || "",
      event_type: body.event_type as number,
      event_type_name: "Event Type",
      is_active: (body.is_active as boolean) ?? true,
      default_terms: (body.default_terms as string) || "",
      default_validity_days: (body.default_validity_days as number) || 30,
      default_tax_rate: (body.default_tax_rate as string) || "0.12",
      default_service_charge_rate:
        (body.default_service_charge_rate as string) || "0.10",
      products: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    quoteTemplatesStore.push(newTemplate);
    return HttpResponse.json(newTemplate, { status: 201 });
  }),

  // PATCH /api/sales/templates/:id/
  http.patch(
    `${BASE_URL}/sales/templates/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = quoteTemplatesStore.findIndex((t) => t.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as Record<string, unknown>;
      quoteTemplatesStore[idx] = {
        ...quoteTemplatesStore[idx],
        ...updates,
      } as (typeof quoteTemplatesStore)[0];
      return HttpResponse.json(quoteTemplatesStore[idx]);
    },
  ),

  // DELETE /api/sales/templates/:id/
  http.delete(`${BASE_URL}/sales/templates/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = quoteTemplatesStore.findIndex((t) => t.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    quoteTemplatesStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // === Quote Template Products ===

  // GET /api/sales/template-products/
  http.get(`${BASE_URL}/sales/template-products/`, async () => {
    await delay(30);
    return HttpResponse.json({
      results: templateProductsStore,
      count: templateProductsStore.length,
    });
  }),

  // GET /api/sales/template-products/:id/
  http.get(`${BASE_URL}/sales/template-products/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const product = templateProductsStore.find((p) => p.id === id);

    if (!product) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(product);
  }),

  // POST /api/sales/template-products/
  http.post(`${BASE_URL}/sales/template-products/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newProduct = {
      id: templateProductsStore.length + 1,
      template: body.template as number,
      product: body.product as number,
      product_name: "Product",
      quantity: (body.quantity as number) || 1,
      unit_price: (body.unit_price as string) || "0.00",
      notes: (body.notes as string) || "",
      order: templateProductsStore.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    templateProductsStore.push(newProduct);
    return HttpResponse.json(newProduct, { status: 201 });
  }),

  // PATCH /api/sales/template-products/:id/
  http.patch(
    `${BASE_URL}/sales/template-products/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = templateProductsStore.findIndex((p) => p.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as Record<string, unknown>;
      templateProductsStore[idx] = {
        ...templateProductsStore[idx],
        ...updates,
      } as (typeof templateProductsStore)[0];
      return HttpResponse.json(templateProductsStore[idx]);
    },
  ),

  // DELETE /api/sales/template-products/:id/
  http.delete(
    `${BASE_URL}/sales/template-products/:id/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = templateProductsStore.findIndex((p) => p.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      templateProductsStore.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // === Event Quotes ===

  // GET /api/sales/quotes/
  http.get(`${BASE_URL}/sales/quotes/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const eventId = url.searchParams.get("event_id");
    const status = url.searchParams.get("status");
    const template = url.searchParams.get("template");
    const clientId = url.searchParams.get("client_id");

    let filtered = [...quotesStore];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.event_details?.name.toLowerCase().includes(searchLower) ||
          q.event_details?.client_name.toLowerCase().includes(searchLower),
      );
    }
    if (eventId) {
      filtered = filtered.filter((q) => q.event === parseInt(eventId));
    }
    if (status) {
      filtered = filtered.filter((q) => q.status === status);
    }
    if (template) {
      filtered = filtered.filter((q) => q.template === parseInt(template));
    }
    if (clientId) {
      // Filter by client (approximated by event)
      filtered = filtered.filter((q) => q.event <= parseInt(clientId));
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/sales/quotes/for_event/
  http.get(`${BASE_URL}/sales/quotes/for_event/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const eventId = url.searchParams.get("event_id");

    const filtered = eventId
      ? quotesStore.filter((q) => q.event === parseInt(eventId))
      : quotesStore;

    return HttpResponse.json(filtered);
  }),

  // GET /api/sales/quotes/booking_session_line_items/
  http.get(`${BASE_URL}/sales/quotes/booking_session_line_items/`, async () => {
    await delay(30);
    return HttpResponse.json({
      has_booking_session: false,
    });
  }),

  // GET /api/sales/quotes/:id/
  http.get(`${BASE_URL}/sales/quotes/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const quote = quotesStore.find((q) => q.id === id);

    if (!quote) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(quote);
  }),

  // POST /api/sales/quotes/
  http.post(`${BASE_URL}/sales/quotes/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newQuote = createMockQuote({
      id: quotesStore.length + 1,
      event: body.event as number,
      template: body.template as number,
      status: "DRAFT",
    });

    quotesStore.push(newQuote);
    return HttpResponse.json(newQuote, { status: 201 });
  }),

  // PATCH /api/sales/quotes/:id/
  http.patch(`${BASE_URL}/sales/quotes/:id/`, async ({ params, request }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = quotesStore.findIndex((q) => q.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    const updates = (await request.json()) as Record<string, unknown>;
    quotesStore[idx] = { ...quotesStore[idx], ...updates } as EventQuote;
    return HttpResponse.json(quotesStore[idx]);
  }),

  // DELETE /api/sales/quotes/:id/
  http.delete(`${BASE_URL}/sales/quotes/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = quotesStore.findIndex((q) => q.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    quotesStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/sales/quotes/:id/send/
  http.post(`${BASE_URL}/sales/quotes/:id/send/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = quotesStore.findIndex((q) => q.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    quotesStore[idx] = {
      ...quotesStore[idx],
      status: "SENT",
      status_display: "Sent",
      sent_at: new Date().toISOString(),
    };

    return HttpResponse.json(quotesStore[idx]);
  }),

  // POST /api/sales/quotes/:id/accept/
  http.post(`${BASE_URL}/sales/quotes/:id/accept/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = quotesStore.findIndex((q) => q.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    quotesStore[idx] = {
      ...quotesStore[idx],
      status: "ACCEPTED",
      status_display: "Accepted",
      accepted_at: new Date().toISOString(),
    };

    return HttpResponse.json(quotesStore[idx]);
  }),

  // POST /api/sales/quotes/:id/reject/
  http.post(
    `${BASE_URL}/sales/quotes/:id/reject/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = quotesStore.findIndex((q) => q.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as { notes?: string };
      quotesStore[idx] = {
        ...quotesStore[idx],
        status: "REJECTED",
        status_display: "Rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: body.notes || "",
      };

      return HttpResponse.json(quotesStore[idx]);
    },
  ),

  // POST /api/sales/quotes/:id/duplicate/
  http.post(`${BASE_URL}/sales/quotes/:id/duplicate/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const original = quotesStore.find((q) => q.id === id);

    if (!original) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    const duplicated = createMockQuote({
      ...original,
      id: quotesStore.length + 1,
      status: "DRAFT",
      sent_at: null,
      accepted_at: null,
      rejected_at: null,
      version: original.version + 1,
    });

    quotesStore.push(duplicated);
    return HttpResponse.json(duplicated, { status: 201 });
  }),

  // POST /api/sales/quotes/:id/sign/
  http.post(
    `${BASE_URL}/sales/quotes/:id/sign/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = quotesStore.findIndex((q) => q.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as { signature_data: string };
      quotesStore[idx] = {
        ...quotesStore[idx],
        status: "ACCEPTED",
        status_display: "Accepted",
        accepted_at: new Date().toISOString(),
        signature_data: body.signature_data,
      };

      return HttpResponse.json(quotesStore[idx]);
    },
  ),

  // GET /api/sales/quotes/:id/options/
  http.get(`${BASE_URL}/sales/quotes/:quoteId/options/`, async () => {
    await delay(30);
    return HttpResponse.json(quoteOptionsStore);
  }),

  // GET /api/sales/quotes/:id/activities/
  http.get(
    `${BASE_URL}/sales/quotes/:quoteId/activities/`,
    async ({ params }) => {
      await delay(30);

      const quoteId = parseInt(params.quoteId as string);
      const activities: QuoteActivity[] = [
        {
          id: 1,
          quote: quoteId,
          action: "CREATED",
          action_by: 1,
          action_by_name: "Admin User",
          notes: "Quote created",
          created_at: "2024-06-15T10:00:00Z",
          updated_at: "2024-06-15T10:00:00Z",
        },
      ];

      return HttpResponse.json(activities);
    },
  ),

  // GET /api/sales/quotes/:id/reminders/
  http.get(`${BASE_URL}/sales/quotes/:quoteId/reminders/`, async () => {
    await delay(30);
    return HttpResponse.json([]);
  }),

  // POST /api/sales/quotes/:id/reminders/
  http.post(
    `${BASE_URL}/sales/quotes/:quoteId/reminders/`,
    async ({ params, request }) => {
      await delay(50);

      const quoteId = parseInt(params.quoteId as string);
      const body = (await request.json()) as {
        scheduled_date: string;
        message?: string;
      };

      const reminder: QuoteReminder = {
        id: 1,
        quote: quoteId,
        scheduled_date: body.scheduled_date,
        message: body.message || "",
        is_sent: false,
        sent_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return HttpResponse.json(reminder, { status: 201 });
    },
  ),

  // GET /api/sales/quotes/:id/preview/
  http.get(`${BASE_URL}/sales/quotes/:id/preview/`, async () => {
    await delay(30);
    return new HttpResponse(
      new Blob(["PDF content"], { type: "application/pdf" }),
      {
        headers: { "Content-Type": "application/pdf" },
      },
    );
  }),

  // GET /api/sales/quotes/:id/pdf/
  http.get(`${BASE_URL}/sales/quotes/:id/pdf/`, async () => {
    await delay(30);
    return new HttpResponse(
      new Blob(["PDF content"], { type: "application/pdf" }),
      {
        headers: { "Content-Type": "application/pdf" },
      },
    );
  }),

  // === Quote Line Items ===

  // GET /api/sales/line-items/
  http.get(`${BASE_URL}/sales/line-items/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const quoteId = url.searchParams.get("quote");

    let filtered = [...lineItemsStore];

    if (quoteId) {
      filtered = filtered.filter((li) => li.quote === parseInt(quoteId));
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/sales/line-items/:id/
  http.get(`${BASE_URL}/sales/line-items/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const item = lineItemsStore.find((li) => li.id === id);

    if (!item) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(item);
  }),

  // POST /api/sales/line-items/
  http.post(`${BASE_URL}/sales/line-items/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newItem = createMockQuoteLineItem({
      id: lineItemsStore.length + 1,
      quote: body.quote as number,
      description: body.description as string,
      quantity: body.quantity as number,
      unit_price: body.unit_price as string,
    });

    lineItemsStore.push(newItem);
    return HttpResponse.json(newItem, { status: 201 });
  }),

  // PATCH /api/sales/line-items/:id/
  http.patch(
    `${BASE_URL}/sales/line-items/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = lineItemsStore.findIndex((li) => li.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as Record<string, unknown>;
      lineItemsStore[idx] = {
        ...lineItemsStore[idx],
        ...updates,
      } as QuoteLineItem;
      return HttpResponse.json(lineItemsStore[idx]);
    },
  ),

  // DELETE /api/sales/line-items/:id/
  http.delete(`${BASE_URL}/sales/line-items/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = lineItemsStore.findIndex((li) => li.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    lineItemsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/sales/line-items/product_venues/
  http.get(`${BASE_URL}/sales/line-items/product_venues/`, async () => {
    await delay(30);
    return HttpResponse.json([
      {
        venue_id: 1,
        venue_name: "Grand Ballroom",
        included_hours: 8,
        excess_hour_price: 5000,
        is_all_day_access: false,
        has_event_type_config: true,
      },
    ]);
  }),

  // POST /api/sales/line-items/calculate_pricing/
  http.post(
    `${BASE_URL}/sales/line-items/calculate_pricing/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as {
        product_id: number;
        quantity: number;
      };
      return HttpResponse.json({
        product_id: body.product_id,
        product_name: "Product",
        description: "Product description",
        quantity: body.quantity,
        base_unit_price: "25000.00",
        excess_hours: null,
        excess_hour_price: null,
        excess_cost: "0.00",
        unit_price: "25000.00",
        total: `${body.quantity * 25000}.00`,
        tax_rate: "0.12",
        item_type: "PACKAGE",
        is_tax_inclusive: false,
        venue_hours_breakdown: null,
      });
    },
  ),

  // === Quote Options ===

  // POST /api/sales/options/
  http.post(`${BASE_URL}/sales/options/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newOption: QuoteOption = {
      id: quoteOptionsStore.length + 1,
      quote: body.quote as number,
      name: body.name as string,
      description: (body.description as string) || "",
      total_price: (body.total_price as string) || "0.00",
      is_selected: false,
      items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    quoteOptionsStore.push(newOption);
    return HttpResponse.json(newOption, { status: 201 });
  }),

  // PATCH /api/sales/options/:id/
  http.patch(`${BASE_URL}/sales/options/:id/`, async ({ params, request }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = quoteOptionsStore.findIndex((o) => o.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    const updates = (await request.json()) as Record<string, unknown>;
    quoteOptionsStore[idx] = {
      ...quoteOptionsStore[idx],
      ...updates,
    } as QuoteOption;
    return HttpResponse.json(quoteOptionsStore[idx]);
  }),

  // DELETE /api/sales/options/:id/
  http.delete(`${BASE_URL}/sales/options/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = quoteOptionsStore.findIndex((o) => o.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    quoteOptionsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
