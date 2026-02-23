import { http, HttpResponse, delay } from 'msw';
import {
  mockTemplates,
  createMockTemplate,
  createMockTemplatesPaginatedResponse,
  createMockCommunicationRecord,
} from '../data/communications.mock';
import type { CommunicationTemplate } from '../../../types/communications.types';

const BASE_URL = 'http://localhost:8000/api';

let templatesStore: CommunicationTemplate[] = [...mockTemplates];

export const resetCommunicationsStore = () => {
  templatesStore = [...mockTemplates];
};

export const communicationsHandlers = [
  // GET /api/communications/templates/ - List templates (paginated)
  http.get(`${BASE_URL}/communications/templates/`, async ({ request }) => {
    await delay(50);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('page_size') || 25);
    return HttpResponse.json(createMockTemplatesPaginatedResponse(templatesStore, page, pageSize));
  }),

  // GET /api/communications/templates/:id/ - Get single template
  http.get(`${BASE_URL}/communications/templates/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const template = templatesStore.find((t) => t.id === id);
    if (!template) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json(template);
  }),

  // POST /api/communications/templates/ - Create template
  http.post(`${BASE_URL}/communications/templates/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newTemplate = createMockTemplate({
      id: templatesStore.length + 100,
      name: body.name as string,
      channel: (body.channel as 'EMAIL' | 'SMS') || 'EMAIL',
      body_template: body.body_template as string,
    });
    templatesStore.push(newTemplate);
    return HttpResponse.json(newTemplate, { status: 201 });
  }),

  // PATCH /api/communications/templates/:id/ - Update template
  http.patch(`${BASE_URL}/communications/templates/:id/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const idx = templatesStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    templatesStore[idx] = {
      ...templatesStore[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(templatesStore[idx]);
  }),

  // DELETE /api/communications/templates/:id/ - Delete template
  http.delete(`${BASE_URL}/communications/templates/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const idx = templatesStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    templatesStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/communications/templates/:id/preview/ - Preview template
  http.post(`${BASE_URL}/communications/templates/:id/preview/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const template = templatesStore.find((t) => t.id === id);
    return HttpResponse.json({
      subject: template?.subject_template || 'Preview Subject',
      body: '<p>Rendered preview content</p>',
    });
  }),

  // GET /api/communications/records/ - List records
  http.get(`${BASE_URL}/communications/records/`, async () => {
    await delay(50);
    return HttpResponse.json([
      createMockCommunicationRecord({ id: 'rec-1' }),
      createMockCommunicationRecord({
        id: 'rec-2',
        delivery_status: 'DELIVERED',
      }),
    ]);
  }),

  // POST /api/communications/records/send_manual/ - Send manual
  http.post(`${BASE_URL}/communications/records/send_manual/`, async () => {
    await delay(50);
    return HttpResponse.json(
      createMockCommunicationRecord({ id: 'rec-new', delivery_status: 'SENT' }),
      { status: 201 },
    );
  }),

  // POST /api/communications/records/send_bulk/ - Send bulk
  http.post(`${BASE_URL}/communications/records/send_bulk/`, async () => {
    await delay(50);
    return HttpResponse.json(
      {
        sent_count: 5,
        records: [createMockCommunicationRecord({ id: 'rec-bulk-1' })],
      },
      { status: 201 },
    );
  }),

  // GET /api/communications/records/analytics/ - Communication analytics
  http.get(`${BASE_URL}/communications/records/analytics/`, async () => {
    await delay(30);
    return HttpResponse.json({
      total_sent: 100,
      delivered: 95,
      opened: 60,
      delivery_rate: 95.0,
      open_rate: 63.2,
    });
  }),

  // POST /api/communications/templates/:id/duplicate/ - Duplicate template
  http.post(`${BASE_URL}/communications/templates/:id/duplicate/`, async ({ params }) => {
    await delay(50);
    const id = Number(params.id);
    const original = templatesStore.find((t) => t.id === id);
    const duplicate = createMockTemplate({
      id: templatesStore.length + 200,
      name: `${original?.name || 'Template'} (Copy)`,
    });
    templatesStore.push(duplicate);
    return HttpResponse.json(duplicate, { status: 201 });
  }),
];
