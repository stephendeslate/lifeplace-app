// frontend/admin-crm/src/test/mocks/handlers/questionnaires.handlers.ts

import { http, HttpResponse, delay } from "msw";
import {
  mockQuestionnaires,
  mockQuestionnaireFields,
  mockQuestionnaireResponses,
  createMockQuestionnaire,
  createMockQuestionnaireField,
  createMockQuestionnaireResponse,
} from "../data/questionnaires.mock";
import type {
  CreateQuestionnaireData,
  UpdateQuestionnaireData,
  CreateQuestionnaireFieldData,
  UpdateQuestionnaireFieldData,
  QuestionnaireFieldType,
  EventQuestionnaire,
} from "../../../types/questionnaires.types";

const BASE_URL = "http://localhost:8000/api";

// Mutable stores for testing mutations
let questionnairesStore = [...mockQuestionnaires];
let fieldsStore = [...mockQuestionnaireFields];
let responsesStore = [...mockQuestionnaireResponses];
const eventQuestionnairesStore: EventQuestionnaire[] = [
  {
    id: 1,
    event: 1,
    event_name: "Smith Wedding",
    questionnaire: 1,
    questionnaire_name: "Wedding Details Form",
    status: "SENT",
    sent_at: "2024-06-15T10:00:00Z",
    completed_at: null,
    reminder_sent_at: null,
    response_count: 3,
    total_fields: 5,
    completion_percentage: 60,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  },
];

export const resetQuestionnairesStore = () => {
  questionnairesStore = [...mockQuestionnaires];
  fieldsStore = [...mockQuestionnaireFields];
  responsesStore = [...mockQuestionnaireResponses];
};

export const questionnairesHandlers = [
  // === Questionnaires ===

  // GET /api/questionnaires/questionnaires/
  http.get(
    `${BASE_URL}/questionnaires/questionnaires/`,
    async ({ request }) => {
      await delay(30);

      const url = new URL(request.url);
      const search = url.searchParams.get("search");
      const eventType = url.searchParams.get("event_type");
      const isActive = url.searchParams.get("is_active");
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = parseInt(url.searchParams.get("page_size") || "25");

      let filtered = [...questionnairesStore];

      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter((q) =>
          q.name.toLowerCase().includes(searchLower),
        );
      }
      if (eventType) {
        filtered = filtered.filter((q) => q.event_type === parseInt(eventType));
      }
      if (isActive !== null && isActive !== undefined) {
        const isActiveBool = isActive === "true";
        filtered = filtered.filter((q) => q.is_active === isActiveBool);
      }

      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedResults = filtered.slice(start, end);

      return HttpResponse.json({
        count: filtered.length,
        next:
          end < filtered.length
            ? `${BASE_URL}/questionnaires/questionnaires/?page=${page + 1}`
            : null,
        previous:
          page > 1
            ? `${BASE_URL}/questionnaires/questionnaires/?page=${page - 1}`
            : null,
        results: paginatedResults,
      });
    },
  ),

  // GET /api/questionnaires/questionnaires/active/
  http.get(`${BASE_URL}/questionnaires/questionnaires/active/`, async () => {
    await delay(30);
    const active = questionnairesStore.filter((q) => q.is_active);
    return HttpResponse.json(active);
  }),

  // GET /api/questionnaires/questionnaires/validation_rules/
  http.get(
    `${BASE_URL}/questionnaires/questionnaires/validation_rules/`,
    async () => {
      await delay(30);
      return HttpResponse.json({
        rules: {
          text: { min_length: 0, max_length: 500 },
          number: { min: 0, max: 999999 },
          email: { format: "email" },
        },
        field_types: [
          "text",
          "number",
          "date",
          "time",
          "boolean",
          "select",
          "multi-select",
          "email",
          "phone",
          "file",
          "guests",
        ],
      });
    },
  ),

  // GET /api/questionnaires/questionnaires/analytics_summary/
  http.get(
    `${BASE_URL}/questionnaires/questionnaires/analytics_summary/`,
    async () => {
      await delay(30);
      return HttpResponse.json(
        questionnairesStore.map((q) => ({
          questionnaire_id: q.id,
          questionnaire_name: q.name,
          is_active: q.is_active,
          total_fields: q.fields_count,
          events_with_responses: 5,
          total_responses: 25,
        })),
      );
    },
  ),

  // GET /api/questionnaires/questionnaires/:id/
  http.get(
    `${BASE_URL}/questionnaires/questionnaires/:id/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const questionnaire = questionnairesStore.find((q) => q.id === id);

      if (!questionnaire) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json(questionnaire);
    },
  ),

  // POST /api/questionnaires/questionnaires/
  http.post(
    `${BASE_URL}/questionnaires/questionnaires/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as CreateQuestionnaireData;
      const newQuestionnaire = createMockQuestionnaire({
        id: questionnairesStore.length + 1,
        name: body.name,
        event_type: body.event_type || null,
        is_active: body.is_active ?? true,
        order: body.order || questionnairesStore.length + 1,
      });

      questionnairesStore.push(newQuestionnaire);
      return HttpResponse.json(newQuestionnaire, { status: 201 });
    },
  ),

  // PATCH /api/questionnaires/questionnaires/:id/
  http.patch(
    `${BASE_URL}/questionnaires/questionnaires/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = questionnairesStore.findIndex((q) => q.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as UpdateQuestionnaireData;
      questionnairesStore[idx] = { ...questionnairesStore[idx], ...updates };
      return HttpResponse.json(questionnairesStore[idx]);
    },
  ),

  // DELETE /api/questionnaires/questionnaires/:id/
  http.delete(
    `${BASE_URL}/questionnaires/questionnaires/:id/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = questionnairesStore.findIndex((q) => q.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      questionnairesStore.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // POST /api/questionnaires/questionnaires/reorder/
  http.post(
    `${BASE_URL}/questionnaires/questionnaires/reorder/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as { questionnaire_ids: number[] };
      body.questionnaire_ids.forEach((qId, index) => {
        const q = questionnairesStore.find((item) => item.id === qId);
        if (q) {
          q.order = index + 1;
        }
      });

      return HttpResponse.json(
        questionnairesStore.sort((a, b) => a.order - b.order),
      );
    },
  ),

  // POST /api/questionnaires/questionnaires/:id/duplicate/
  http.post(
    `${BASE_URL}/questionnaires/questionnaires/:id/duplicate/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const original = questionnairesStore.find((q) => q.id === id);

      if (!original) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as { name?: string };
      const duplicated = createMockQuestionnaire({
        ...original,
        id: questionnairesStore.length + 1,
        name: body.name || `${original.name} (Copy)`,
      });

      questionnairesStore.push(duplicated);
      return HttpResponse.json(duplicated, { status: 201 });
    },
  ),

  // GET /api/questionnaires/questionnaires/:id/analytics/
  http.get(
    `${BASE_URL}/questionnaires/questionnaires/:id/analytics/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const questionnaire = questionnairesStore.find((q) => q.id === id);

      if (!questionnaire) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        questionnaire_id: id,
        questionnaire_name: questionnaire.name,
        total_fields: questionnaire.fields_count,
        required_fields: 3,
        events_with_responses: 5,
        complete_responses: 4,
        incomplete_responses: 1,
        completion_rate: 80.0,
        field_completion_rates: {},
        recent_activity: { last_7_days: 2, last_30_days: 8, last_90_days: 15 },
      });
    },
  ),

  // GET /api/questionnaires/questionnaires/:id/response_trends/
  http.get(
    `${BASE_URL}/questionnaires/questionnaires/:id/response_trends/`,
    async ({ params, request }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const questionnaire = questionnairesStore.find((q) => q.id === id);

      if (!questionnaire) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const url = new URL(request.url);
      const days = parseInt(url.searchParams.get("days") || "30");

      return HttpResponse.json({
        questionnaire_id: id,
        questionnaire_name: questionnaire.name,
        period_days: days,
        daily_counts: [
          { date: "2024-06-14", events: 2, responses: 8 },
          { date: "2024-06-15", events: 3, responses: 12 },
        ],
      });
    },
  ),

  // GET /api/questionnaires/questionnaires/:questionnaireId/fields/
  http.get(
    `${BASE_URL}/questionnaires/questionnaires/:questionnaireId/fields/`,
    async ({ params }) => {
      await delay(30);

      const questionnaireId = parseInt(params.questionnaireId as string);
      const fields = fieldsStore.filter(
        (f) => f.questionnaire === questionnaireId,
      );
      return HttpResponse.json(fields);
    },
  ),

  // === Questionnaire Fields ===

  // GET /api/questionnaires/fields/
  http.get(`${BASE_URL}/questionnaires/fields/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const questionnaireId = url.searchParams.get("questionnaire_id");

    let filtered = [...fieldsStore];

    if (questionnaireId) {
      filtered = filtered.filter(
        (f) => f.questionnaire === parseInt(questionnaireId),
      );
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/questionnaires/fields/:id/
  http.get(`${BASE_URL}/questionnaires/fields/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const field = fieldsStore.find((f) => f.id === id);

    if (!field) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(field);
  }),

  // POST /api/questionnaires/fields/
  http.post(`${BASE_URL}/questionnaires/fields/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as CreateQuestionnaireFieldData;
    const newField = createMockQuestionnaireField({
      id: fieldsStore.length + 1,
      questionnaire: body.questionnaire,
      name: body.name,
      type: body.type as QuestionnaireFieldType,
      required: body.required ?? false,
      order: body.order || fieldsStore.length + 1,
    });

    fieldsStore.push(newField);
    return HttpResponse.json(newField, { status: 201 });
  }),

  // PATCH /api/questionnaires/fields/:id/
  http.patch(
    `${BASE_URL}/questionnaires/fields/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = fieldsStore.findIndex((f) => f.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as UpdateQuestionnaireFieldData;
      fieldsStore[idx] = { ...fieldsStore[idx], ...updates };
      return HttpResponse.json(fieldsStore[idx]);
    },
  ),

  // DELETE /api/questionnaires/fields/:id/
  http.delete(`${BASE_URL}/questionnaires/fields/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = fieldsStore.findIndex((f) => f.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    fieldsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/questionnaires/fields/reorder/
  http.post(
    `${BASE_URL}/questionnaires/fields/reorder/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as { field_ids: number[] };
      body.field_ids.forEach((fieldId, index) => {
        const field = fieldsStore.find((f) => f.id === fieldId);
        if (field) {
          field.order = index + 1;
        }
      });

      return HttpResponse.json(fieldsStore.sort((a, b) => a.order - b.order));
    },
  ),

  // GET /api/questionnaires/fields/:id/value_distribution/
  http.get(
    `${BASE_URL}/questionnaires/fields/:id/value_distribution/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const field = fieldsStore.find((f) => f.id === id);

      if (!field) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        field_id: id,
        field_name: field.name,
        field_type: field.type,
        total_responses: 20,
        distribution: [
          { value: "Option A", count: 12, percentage: 60.0 },
          { value: "Option B", count: 5, percentage: 25.0 },
          { value: "Option C", count: 3, percentage: 15.0 },
        ],
      });
    },
  ),

  // === Questionnaire Responses ===

  // GET /api/questionnaires/responses/
  http.get(`${BASE_URL}/questionnaires/responses/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const eventId = url.searchParams.get("event");

    let filtered = [...responsesStore];

    if (eventId) {
      filtered = filtered.filter((r) => r.event === parseInt(eventId));
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/questionnaires/responses/:id/
  http.get(`${BASE_URL}/questionnaires/responses/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const response = responsesStore.find((r) => r.id === id);

    if (!response) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(response);
  }),

  // POST /api/questionnaires/responses/
  http.post(`${BASE_URL}/questionnaires/responses/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newResponse = createMockQuestionnaireResponse({
      id: responsesStore.length + 1,
      event: body.event as number,
      field: body.field as number,
      value: body.value as string,
    });

    responsesStore.push(newResponse);
    return HttpResponse.json(newResponse, { status: 201 });
  }),

  // PATCH /api/questionnaires/responses/:id/
  http.patch(
    `${BASE_URL}/questionnaires/responses/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = responsesStore.findIndex((r) => r.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as Record<string, unknown>;
      responsesStore[idx] = { ...responsesStore[idx], ...updates };
      return HttpResponse.json(responsesStore[idx]);
    },
  ),

  // DELETE /api/questionnaires/responses/:id/
  http.delete(
    `${BASE_URL}/questionnaires/responses/:id/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = responsesStore.findIndex((r) => r.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      responsesStore.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // POST /api/questionnaires/responses/save_event_responses/
  http.post(
    `${BASE_URL}/questionnaires/responses/save_event_responses/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as {
        event_id: number;
        responses: Array<{ field: number; value: string }>;
      };
      const newResponses = body.responses.map((r, i) =>
        createMockQuestionnaireResponse({
          id: responsesStore.length + i + 1,
          event: body.event_id,
          field: r.field,
          value: r.value,
        }),
      );

      responsesStore.push(...newResponses);
      return HttpResponse.json(newResponses, { status: 201 });
    },
  ),

  // === Event Questionnaires ===

  // GET /api/questionnaires/event-questionnaires/
  http.get(`${BASE_URL}/questionnaires/event-questionnaires/`, async () => {
    await delay(30);
    return HttpResponse.json({
      results: eventQuestionnairesStore,
      count: eventQuestionnairesStore.length,
    });
  }),

  // GET /api/questionnaires/event-questionnaires/for_event/:eventId/
  http.get(
    `${BASE_URL}/questionnaires/event-questionnaires/for_event/:eventId/`,
    async ({ params }) => {
      await delay(30);

      const eventId = parseInt(params.eventId as string);
      const filtered = eventQuestionnairesStore.filter(
        (eq) => eq.event === eventId,
      );
      return HttpResponse.json(filtered);
    },
  ),

  // GET /api/questionnaires/event-questionnaires/:id/
  http.get(
    `${BASE_URL}/questionnaires/event-questionnaires/:id/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const eq = eventQuestionnairesStore.find((item) => item.id === id);

      if (!eq) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json(eq);
    },
  ),

  // POST /api/questionnaires/event-questionnaires/
  http.post(
    `${BASE_URL}/questionnaires/event-questionnaires/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as Record<string, unknown>;
      const newEq: EventQuestionnaire = {
        id: eventQuestionnairesStore.length + 1,
        event: body.event as number,
        event_name: "Event",
        questionnaire: body.questionnaire as number,
        questionnaire_name: "Questionnaire",
        status: "PENDING",
        sent_at: null,
        completed_at: null,
        reminder_sent_at: null,
        response_count: 0,
        total_fields: 5,
        completion_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      eventQuestionnairesStore.push(newEq);
      return HttpResponse.json(newEq, { status: 201 });
    },
  ),

  // PATCH /api/questionnaires/event-questionnaires/:id/
  http.patch(
    `${BASE_URL}/questionnaires/event-questionnaires/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = eventQuestionnairesStore.findIndex((eq) => eq.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as Record<string, unknown>;
      eventQuestionnairesStore[idx] = {
        ...eventQuestionnairesStore[idx],
        ...updates,
      } as EventQuestionnaire;
      return HttpResponse.json(eventQuestionnairesStore[idx]);
    },
  ),

  // DELETE /api/questionnaires/event-questionnaires/:id/
  http.delete(
    `${BASE_URL}/questionnaires/event-questionnaires/:id/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = eventQuestionnairesStore.findIndex((eq) => eq.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      eventQuestionnairesStore.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // POST /api/questionnaires/event-questionnaires/:id/send/
  http.post(
    `${BASE_URL}/questionnaires/event-questionnaires/:id/send/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = eventQuestionnairesStore.findIndex((eq) => eq.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      eventQuestionnairesStore[idx] = {
        ...eventQuestionnairesStore[idx],
        status: "SENT",
        sent_at: new Date().toISOString(),
      };

      return HttpResponse.json(eventQuestionnairesStore[idx]);
    },
  ),

  // POST /api/questionnaires/event-questionnaires/:id/send_reminder/
  http.post(
    `${BASE_URL}/questionnaires/event-questionnaires/:id/send_reminder/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = eventQuestionnairesStore.findIndex((eq) => eq.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      eventQuestionnairesStore[idx] = {
        ...eventQuestionnairesStore[idx],
        reminder_sent_at: new Date().toISOString(),
      };

      return HttpResponse.json({ detail: "Reminder sent successfully" });
    },
  ),

  // GET /api/questionnaires/event-questionnaires/:id/responses/
  http.get(
    `${BASE_URL}/questionnaires/event-questionnaires/:id/responses/`,
    async () => {
      await delay(30);
      return HttpResponse.json(responsesStore.slice(0, 3));
    },
  ),
];
