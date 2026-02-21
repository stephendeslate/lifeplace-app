// frontend/admin-crm/src/test/mocks/handlers/bookingflows.handlers.ts

import { http, HttpResponse, delay } from "msw";
import {
  mockBookingFlows,
  mockBookingFlowSteps,
  mockBookingSessions,
  createMockBookingFlow,
  createMockBookingFlowStep,
  createMockBookingSession,
} from "../data/bookingflows.mock";
import type {
  CreateBookingFlowData,
  UpdateBookingFlowData,
  CreateBookingFlowStepData,
  UpdateBookingFlowStepData,
  BookingFlowAnalytics,
  StepType,
} from "../../../types/bookingflows.types";

const BASE_URL = "http://localhost:8000/api";

// Mutable stores for testing mutations
let bookingFlowsStore = [...mockBookingFlows];
let bookingFlowStepsStore = [...mockBookingFlowSteps];
let bookingSessionsStore = [...mockBookingSessions];

export const resetBookingFlowsStore = () => {
  bookingFlowsStore = [...mockBookingFlows];
  bookingFlowStepsStore = [...mockBookingFlowSteps];
  bookingSessionsStore = [...mockBookingSessions];
};

const mockStepTypes = [
  { value: "introduction", label: "Introduction" },
  { value: "venue_selection", label: "Venue Selection" },
  { value: "date_time", label: "Date & Time Selection" },
  { value: "package_selection", label: "Package Selection" },
  { value: "addon_selection", label: "Add-on Selection" },
  { value: "questionnaire", label: "Questionnaire" },
  { value: "pricing_summary", label: "Pricing Summary" },
  { value: "contact_info", label: "Contact Information" },
  { value: "payment_info", label: "Payment Information" },
  { value: "confirmation", label: "Confirmation" },
];

const mockAnalytics: BookingFlowAnalytics[] = [
  {
    id: 1,
    booking_flow: 1,
    date: "2024-06-15",
    sessions_started: 25,
    sessions_completed: 18,
    sessions_abandoned: 5,
    conversion_rate: 72.0,
    average_completion_time: 480,
    step_drop_offs: { venue_selection: 2, payment_info: 3 },
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  },
];

export const bookingFlowsHandlers = [
  // GET /api/bookingflow/flows/
  http.get(`${BASE_URL}/bookingflow/flows/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const eventType = url.searchParams.get("event_type");
    const isActive = url.searchParams.get("is_active");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("page_size") || "25");

    let filtered = [...bookingFlowsStore];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(searchLower) ||
          f.description.toLowerCase().includes(searchLower),
      );
    }
    if (eventType) {
      filtered = filtered.filter((f) => f.event_type === parseInt(eventType));
    }
    if (isActive !== null && isActive !== undefined) {
      const isActiveBool = isActive === "true";
      filtered = filtered.filter((f) => f.is_active === isActiveBool);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedResults = filtered.slice(start, end);

    return HttpResponse.json({
      count: filtered.length,
      next:
        end < filtered.length
          ? `${BASE_URL}/bookingflow/flows/?page=${page + 1}`
          : null,
      previous:
        page > 1 ? `${BASE_URL}/bookingflow/flows/?page=${page - 1}` : null,
      results: paginatedResults,
    });
  }),

  // GET /api/bookingflow/flows/active/
  http.get(`${BASE_URL}/bookingflow/flows/active/`, async () => {
    await delay(30);
    const activeFlows = bookingFlowsStore.filter((f) => f.is_active);
    return HttpResponse.json({
      results: activeFlows,
      count: activeFlows.length,
    });
  }),

  // GET /api/bookingflow/flows/:id/
  http.get(`${BASE_URL}/bookingflow/flows/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const flow = bookingFlowsStore.find((f) => f.id === id);

    if (!flow) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    // Return as detail with steps included
    const steps = bookingFlowStepsStore.filter((s) => s.booking_flow === id);
    return HttpResponse.json({ ...flow, steps });
  }),

  // POST /api/bookingflow/flows/
  http.post(`${BASE_URL}/bookingflow/flows/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as CreateBookingFlowData;
    const newFlow = createMockBookingFlow({
      id: bookingFlowsStore.length + 1,
      name: body.name,
      description: body.description || "",
      event_type: body.event_type,
      is_active: body.is_active ?? true,
    });

    bookingFlowsStore.push(newFlow);
    return HttpResponse.json(newFlow, { status: 201 });
  }),

  // PATCH /api/bookingflow/flows/:id/
  http.patch(
    `${BASE_URL}/bookingflow/flows/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = bookingFlowsStore.findIndex((f) => f.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as UpdateBookingFlowData;
      bookingFlowsStore[idx] = { ...bookingFlowsStore[idx], ...updates };
      return HttpResponse.json(bookingFlowsStore[idx]);
    },
  ),

  // DELETE /api/bookingflow/flows/:id/
  http.delete(`${BASE_URL}/bookingflow/flows/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = bookingFlowsStore.findIndex((f) => f.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    bookingFlowsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/bookingflow/flows/:id/duplicate/
  http.post(
    `${BASE_URL}/bookingflow/flows/:id/duplicate/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const original = bookingFlowsStore.find((f) => f.id === id);

      if (!original) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as { name?: string };
      const duplicated = createMockBookingFlow({
        ...original,
        id: bookingFlowsStore.length + 1,
        name: body.name || `${original.name} (Copy)`,
      });

      bookingFlowsStore.push(duplicated);
      return HttpResponse.json(duplicated, { status: 201 });
    },
  ),

  // GET /api/bookingflow/flows/:id/payment_gateways/
  http.get(
    `${BASE_URL}/bookingflow/flows/:id/payment_gateways/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const flow = bookingFlowsStore.find((f) => f.id === id);

      if (!flow) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        available_gateways: [
          {
            id: 1,
            name: "Stripe",
            code: "stripe",
            description: "Credit card payments",
            is_active: true,
            public_config: {},
          },
          {
            id: 2,
            name: "PayPal",
            code: "paypal",
            description: "PayPal payments",
            is_active: true,
            public_config: {},
          },
        ],
        default_gateway: flow.default_payment_gateway,
        require_immediate_payment: flow.require_immediate_payment,
      });
    },
  ),

  // GET /api/bookingflow/flows/:flowId/steps/
  http.get(
    `${BASE_URL}/bookingflow/flows/:flowId/steps/`,
    async ({ params }) => {
      await delay(30);

      const flowId = parseInt(params.flowId as string);
      const steps = bookingFlowStepsStore.filter(
        (s) => s.booking_flow === flowId,
      );
      return HttpResponse.json(steps);
    },
  ),

  // GET /api/bookingflow/flows/:flowId/analytics/
  http.get(`${BASE_URL}/bookingflow/flows/:flowId/analytics/`, async () => {
    await delay(30);
    return HttpResponse.json(mockAnalytics);
  }),

  // GET /api/bookingflow/steps/
  http.get(`${BASE_URL}/bookingflow/steps/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const flowId = url.searchParams.get("flow_id");
    const stepType = url.searchParams.get("step_type");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("page_size") || "25");

    let filtered = [...bookingFlowStepsStore];

    if (flowId) {
      filtered = filtered.filter((s) => s.booking_flow === parseInt(flowId));
    }
    if (stepType) {
      filtered = filtered.filter((s) => s.step_type === stepType);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedResults = filtered.slice(start, end);

    return HttpResponse.json({
      count: filtered.length,
      next:
        end < filtered.length
          ? `${BASE_URL}/bookingflow/steps/?page=${page + 1}`
          : null,
      previous:
        page > 1 ? `${BASE_URL}/bookingflow/steps/?page=${page - 1}` : null,
      results: paginatedResults,
    });
  }),

  // GET /api/bookingflow/steps/available_step_types/
  http.get(`${BASE_URL}/bookingflow/steps/available_step_types/`, async () => {
    await delay(30);

    return HttpResponse.json({
      step_types: mockStepTypes,
      total_count: mockStepTypes.length,
      removed_types: [
        {
          value: "review",
          label: "Review",
          reason: "Deprecated in favor of pricing_summary",
          migration_available: true,
        },
      ],
    });
  }),

  // GET /api/bookingflow/steps/:id/
  http.get(`${BASE_URL}/bookingflow/steps/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const step = bookingFlowStepsStore.find((s) => s.id === id);

    if (!step) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(step);
  }),

  // POST /api/bookingflow/steps/
  http.post(`${BASE_URL}/bookingflow/steps/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as CreateBookingFlowStepData;
    const newStep = createMockBookingFlowStep({
      id: bookingFlowStepsStore.length + 1,
      booking_flow: body.booking_flow,
      step_type: body.step_type as StepType,
      order: body.order || bookingFlowStepsStore.length + 1,
      is_enabled: body.is_enabled ?? true,
      is_required: body.is_required ?? true,
    });

    bookingFlowStepsStore.push(newStep);
    return HttpResponse.json(newStep, { status: 201 });
  }),

  // PATCH /api/bookingflow/steps/:id/
  http.patch(
    `${BASE_URL}/bookingflow/steps/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = bookingFlowStepsStore.findIndex((s) => s.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as UpdateBookingFlowStepData;
      bookingFlowStepsStore[idx] = {
        ...bookingFlowStepsStore[idx],
        ...updates,
      };
      return HttpResponse.json(bookingFlowStepsStore[idx]);
    },
  ),

  // DELETE /api/bookingflow/steps/:id/
  http.delete(`${BASE_URL}/bookingflow/steps/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = bookingFlowStepsStore.findIndex((s) => s.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    bookingFlowStepsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/bookingflow/steps/reorder/
  http.post(`${BASE_URL}/bookingflow/steps/reorder/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as { step_ids: number[] };
    body.step_ids.forEach((stepId, index) => {
      const step = bookingFlowStepsStore.find((s) => s.id === stepId);
      if (step) {
        step.order = index + 1;
      }
    });

    return HttpResponse.json(
      bookingFlowStepsStore.sort((a, b) => a.order - b.order),
    );
  }),

  // GET /api/bookingflow/steps/:id/configuration/
  http.get(
    `${BASE_URL}/bookingflow/steps/:id/configuration/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const step = bookingFlowStepsStore.find((s) => s.id === id);

      if (!step) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        id: step.id,
        step: step.id,
        step_type: step.step_type,
        config_data: step.configuration || {},
        is_valid: true,
      });
    },
  ),

  // PATCH /api/bookingflow/steps/:id/update_configuration/
  http.patch(
    `${BASE_URL}/bookingflow/steps/:id/update_configuration/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const step = bookingFlowStepsStore.find((s) => s.id === id);

      if (!step) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as Record<string, unknown>;
      step.configuration = { ...step.configuration, ...body };

      return HttpResponse.json({
        id: step.id,
        step: step.id,
        step_type: step.step_type,
        config_data: step.configuration,
        is_valid: true,
      });
    },
  ),

  // GET /api/bookingflow/steps/:id/step_validation_rules/
  http.get(
    `${BASE_URL}/bookingflow/steps/:id/step_validation_rules/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const step = bookingFlowStepsStore.find((s) => s.id === id);

      if (!step) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        step_type: step.step_type,
        validation_rules: step.validation_rules || {},
        custom_rules: {},
      });
    },
  ),

  // GET /api/bookingflow/steps/:id/payment_terms_configuration/
  http.get(
    `${BASE_URL}/bookingflow/steps/:id/payment_terms_configuration/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const step = bookingFlowStepsStore.find((s) => s.id === id);

      if (!step) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        require_immediate_payment: false,
        accept_deposit: true,
        deposit_amount: "5000.00",
        deposit_type: "fixed",
        allow_payment_plans: true,
        payment_terms: "Net 30",
      });
    },
  ),

  // PATCH /api/bookingflow/steps/:id/update_payment_terms_configuration/
  http.patch(
    `${BASE_URL}/bookingflow/steps/:id/update_payment_terms_configuration/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const step = bookingFlowStepsStore.find((s) => s.id === id);

      if (!step) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        require_immediate_payment: false,
        accept_deposit: true,
        deposit_amount: "5000.00",
        deposit_type: "fixed",
        allow_payment_plans: true,
        payment_terms: "Net 30",
        ...body,
      });
    },
  ),

  // GET /api/bookingflow/steps/:id/availability_settings/
  http.get(
    `${BASE_URL}/bookingflow/steps/:id/availability_settings/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const step = bookingFlowStepsStore.find((s) => s.id === id);

      if (!step) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        enable_real_time_availability: true,
        show_availability_status: true,
        auto_check_conflicts: true,
        check_venue_availability: true,
        check_resource_availability: false,
        check_staff_availability: false,
        availability_display_mode: "calendar",
        allow_overbooking: false,
        overbooking_threshold: 0,
        sync_with_calendar: false,
        calendar_source: "",
        blocked_dates: [],
        available_days_of_week: [0, 1, 2, 3, 4, 5, 6],
        available_time_slots: [],
        buffer_before_hours: 0,
        buffer_after_hours: 0,
      });
    },
  ),

  // GET /api/bookingflow/steps/:id/payment_options/
  http.get(
    `${BASE_URL}/bookingflow/steps/:id/payment_options/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const step = bookingFlowStepsStore.find((s) => s.id === id);

      if (!step) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        available_gateways: [
          {
            id: 1,
            name: "Stripe",
            code: "stripe",
            description: "Credit card payments",
            supported_methods: ["card"],
            public_config: {},
          },
        ],
        saved_payment_methods: [],
        require_immediate_payment: false,
        accept_deposit: true,
        deposit_amount: "5000.00",
        deposit_type: "fixed",
        allow_payment_plans: true,
        payment_terms: "Net 30",
      });
    },
  ),

  // GET /api/bookingflow/steps/:id/available_questionnaires/
  http.get(
    `${BASE_URL}/bookingflow/steps/:id/available_questionnaires/`,
    async () => {
      await delay(30);
      return HttpResponse.json([
        {
          id: 1,
          name: "Wedding Details Form",
          event_type: 1,
          is_active: true,
          order: 1,
          created_at: "2024-06-15T10:00:00Z",
          updated_at: "2024-06-15T10:00:00Z",
        },
        {
          id: 2,
          name: "Event Preferences",
          event_type: null,
          is_active: true,
          order: 2,
          created_at: "2024-06-15T10:00:00Z",
          updated_at: "2024-06-15T10:00:00Z",
        },
      ]);
    },
  ),

  // POST /api/bookingflow/steps/:id/assign_questionnaires/
  http.post(
    `${BASE_URL}/bookingflow/steps/:id/assign_questionnaires/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const step = bookingFlowStepsStore.find((s) => s.id === id);

      if (!step) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as { questionnaire_ids: number[] };
      step.configuration = {
        ...step.configuration,
        questionnaire_ids: body.questionnaire_ids,
      };

      return HttpResponse.json({
        id: step.id,
        step: step.id,
        step_type: step.step_type,
        config_data: step.configuration,
        is_valid: true,
      });
    },
  ),

  // GET /api/bookingflow/steps/:id/available_packages/
  http.get(
    `${BASE_URL}/bookingflow/steps/:id/available_packages/`,
    async () => {
      await delay(30);
      return HttpResponse.json([
        {
          id: 1,
          name: "Basic Package",
          description: "Basic event package",
          category: 1,
          pricing_model: "FIXED",
          base_price: "15000.00",
          currency: "PHP",
          type: "PACKAGE",
          is_active: true,
        },
        {
          id: 2,
          name: "Premium Package",
          description: "Premium event package",
          category: 1,
          pricing_model: "FIXED",
          base_price: "35000.00",
          currency: "PHP",
          type: "PACKAGE",
          is_active: true,
        },
      ]);
    },
  ),

  // GET /api/bookingflow/steps/:id/available_addons/
  http.get(`${BASE_URL}/bookingflow/steps/:id/available_addons/`, async () => {
    await delay(30);
    return HttpResponse.json([
      {
        id: 3,
        name: "Photo Booth",
        description: "Photo booth rental",
        category: 1,
        pricing_model: "FIXED",
        base_price: "8000.00",
        currency: "PHP",
        type: "ADDON",
        is_active: true,
      },
      {
        id: 4,
        name: "Extra Hour",
        description: "Additional hour of coverage",
        category: 1,
        pricing_model: "PER_UNIT",
        base_price: "3000.00",
        currency: "PHP",
        type: "ADDON",
        is_active: true,
      },
    ]);
  }),

  // GET /api/bookingflow/steps/:id/available_categories/
  http.get(
    `${BASE_URL}/bookingflow/steps/:id/available_categories/`,
    async () => {
      await delay(30);
      return HttpResponse.json([
        {
          id: 1,
          name: "Photography",
          description: "Photography services",
          slug: "photography",
          parent: null,
          is_active: true,
          sort_order: 1,
          requires_venue: false,
          typical_duration_hours: 8,
        },
        {
          id: 2,
          name: "Videography",
          description: "Videography services",
          slug: "videography",
          parent: null,
          is_active: true,
          sort_order: 2,
          requires_venue: false,
          typical_duration_hours: 8,
        },
      ]);
    },
  ),

  // POST /api/bookingflow/steps/:id/migrate_availability_to_datetime/
  http.post(
    `${BASE_URL}/bookingflow/steps/:id/migrate_availability_to_datetime/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = bookingFlowStepsStore.findIndex((s) => s.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      bookingFlowStepsStore[idx] = {
        ...bookingFlowStepsStore[idx],
        step_type: "date_time",
        step_type_display: "Date & Time Selection",
      };

      return HttpResponse.json(bookingFlowStepsStore[idx]);
    },
  ),

  // GET /api/bookingflow/sessions/
  http.get(`${BASE_URL}/bookingflow/sessions/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const bookingFlow = url.searchParams.get("booking_flow");
    const isCompleted = url.searchParams.get("is_completed");
    const isAbandoned = url.searchParams.get("is_abandoned");

    let filtered = [...bookingSessionsStore];

    if (bookingFlow) {
      filtered = filtered.filter(
        (s) => s.booking_flow === parseInt(bookingFlow),
      );
    }
    if (isCompleted !== null && isCompleted !== undefined) {
      const isCompletedBool = isCompleted === "true";
      filtered = filtered.filter((s) => s.is_completed === isCompletedBool);
    }
    if (isAbandoned !== null && isAbandoned !== undefined) {
      const isAbandonedBool = isAbandoned === "true";
      filtered = filtered.filter((s) => s.is_abandoned === isAbandonedBool);
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/bookingflow/sessions/:id/
  http.get(`${BASE_URL}/bookingflow/sessions/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const session = bookingSessionsStore.find((s) => s.id === id);

    if (!session) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(session);
  }),

  // POST /api/bookingflow/sessions/
  http.post(`${BASE_URL}/bookingflow/sessions/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as {
      booking_flow: number;
      client?: number;
    };
    const newSession = createMockBookingSession({
      id: bookingSessionsStore.length + 1,
      booking_flow: body.booking_flow,
      client: body.client || null,
    });

    bookingSessionsStore.push(newSession);
    return HttpResponse.json(newSession, { status: 201 });
  }),

  // PATCH /api/bookingflow/sessions/:id/update_data/
  http.patch(
    `${BASE_URL}/bookingflow/sessions/:id/update_data/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = bookingSessionsStore.findIndex((s) => s.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as Record<string, unknown>;
      bookingSessionsStore[idx] = {
        ...bookingSessionsStore[idx],
        booking_data: { ...bookingSessionsStore[idx].booking_data, ...body },
      };

      return HttpResponse.json(bookingSessionsStore[idx]);
    },
  ),

  // POST /api/bookingflow/sessions/:id/complete_booking/
  http.post(
    `${BASE_URL}/bookingflow/sessions/:id/complete_booking/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = bookingSessionsStore.findIndex((s) => s.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      bookingSessionsStore[idx] = {
        ...bookingSessionsStore[idx],
        is_completed: true,
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
      };

      return HttpResponse.json({
        detail: "Booking completed successfully",
        event: {
          id: 100,
          name: "New Booking Event",
          event_date: "2024-12-15",
          status: "CONFIRMED",
          client_id: bookingSessionsStore[idx].client || 1,
          total_price: bookingSessionsStore[idx].total_price,
        },
        session: bookingSessionsStore[idx],
      });
    },
  ),

  // POST /api/bookingflow/sessions/:id/abandon/
  http.post(
    `${BASE_URL}/bookingflow/sessions/:id/abandon/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = bookingSessionsStore.findIndex((s) => s.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as { reason?: string };
      bookingSessionsStore[idx] = {
        ...bookingSessionsStore[idx],
        is_abandoned: true,
        booking_data: {
          ...bookingSessionsStore[idx].booking_data,
          abandon_reason: body.reason,
        },
      };

      return HttpResponse.json(bookingSessionsStore[idx]);
    },
  ),

  // GET /api/bookingflow/analytics/
  http.get(`${BASE_URL}/bookingflow/analytics/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const flowId = url.searchParams.get("flow_id");

    let filtered = [...mockAnalytics];
    if (flowId) {
      filtered = filtered.filter((a) => a.booking_flow === parseInt(flowId));
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // POST /api/bookingflow/analytics/update_daily/
  http.post(
    `${BASE_URL}/bookingflow/analytics/update_daily/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as { flow_id: number; date?: string };
      const analytics: BookingFlowAnalytics = {
        id: mockAnalytics.length + 1,
        booking_flow: body.flow_id,
        date: body.date || new Date().toISOString().split("T")[0],
        sessions_started: 10,
        sessions_completed: 7,
        sessions_abandoned: 2,
        conversion_rate: 70.0,
        average_completion_time: 420,
        step_drop_offs: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return HttpResponse.json(analytics, { status: 201 });
    },
  ),

  // GET /api/bookingflow/public/flows/
  http.get(`${BASE_URL}/bookingflow/public/flows/`, async () => {
    await delay(30);
    const activeFlows = bookingFlowsStore.filter((f) => f.is_active);
    return HttpResponse.json(activeFlows);
  }),

  // POST /api/bookingflow/public/flows/:id/start_session/
  http.post(
    `${BASE_URL}/bookingflow/public/flows/:id/start_session/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const flow = bookingFlowsStore.find((f) => f.id === id);

      if (!flow) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        session_id: `sess-public-${Date.now()}`,
        current_step:
          bookingFlowStepsStore.find(
            (s) => s.booking_flow === id && s.order === 1,
          ) || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        progress_percentage: 0,
      });
    },
  ),

  // GET /api/bookingflow/public/flows/:id/payment_gateways/
  http.get(
    `${BASE_URL}/bookingflow/public/flows/:id/payment_gateways/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const flow = bookingFlowsStore.find((f) => f.id === id);

      if (!flow) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        available_gateways: [
          {
            id: 1,
            name: "Stripe",
            code: "stripe",
            description: "Credit card payments",
            public_config: {},
          },
        ],
        default_gateway: flow.default_payment_gateway,
        require_immediate_payment: flow.require_immediate_payment,
      });
    },
  ),
];
