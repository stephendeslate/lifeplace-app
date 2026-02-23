import { http, HttpResponse, delay } from 'msw';
import {
  mockContractTemplates,
  mockEventContracts,
  createMockContractTemplate,
  createMockEventContract,
  createMockContractAmendment,
  createMockContractTemplatesPaginatedResponse,
} from '../data/contracts.mock';
import type { ContractTemplate, EventContract } from '../../../types/contracts.types';

const BASE_URL = 'http://localhost:8000/api';

let templatesStore: ContractTemplate[] = [...mockContractTemplates];
let contractsStore: EventContract[] = [...mockEventContracts];

export const resetContractsStore = () => {
  templatesStore = [...mockContractTemplates];
  contractsStore = [...mockEventContracts];
};

export const contractsHandlers = [
  // === Contract Templates ===

  // GET /api/contracts/templates/ - List templates (paginated)
  http.get(`${BASE_URL}/contracts/templates/`, async ({ request }) => {
    await delay(50);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('page_size') || 25);
    return HttpResponse.json(
      createMockContractTemplatesPaginatedResponse(templatesStore, page, pageSize),
    );
  }),

  // GET /api/contracts/templates/:id/ - Get single template
  http.get(`${BASE_URL}/contracts/templates/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const template = templatesStore.find((t) => t.id === id);
    if (!template) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json(template);
  }),

  // POST /api/contracts/templates/ - Create template
  http.post(`${BASE_URL}/contracts/templates/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newTemplate = createMockContractTemplate({
      id: templatesStore.length + 100,
      name: body.name as string,
    });
    templatesStore.push(newTemplate);
    return HttpResponse.json(newTemplate, { status: 201 });
  }),

  // PATCH /api/contracts/templates/:id/ - Update template
  http.patch(`${BASE_URL}/contracts/templates/:id/`, async ({ params, request }) => {
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

  // DELETE /api/contracts/templates/:id/ - Delete template
  http.delete(`${BASE_URL}/contracts/templates/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const idx = templatesStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    templatesStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // === Event Contracts ===

  // GET /api/contracts/contracts/ - List contracts
  http.get(`${BASE_URL}/contracts/contracts/`, async ({ request }) => {
    await delay(50);
    const url = new URL(request.url);
    const eventId = url.searchParams.get('event');
    const clientId = url.searchParams.get('client');

    let filtered = [...contractsStore];
    if (eventId) {
      filtered = filtered.filter((c) => {
        const eid = typeof c.event === 'number' ? c.event : c.event?.id;
        return eid === Number(eventId);
      });
    }
    if (clientId) {
      filtered = filtered.filter((c) => c.event_details?.client_name != null);
    }

    return HttpResponse.json(filtered);
  }),

  // GET /api/contracts/contracts/for_event/ - Contracts for event
  // IMPORTANT: Must be before :id handler to prevent "for_event" matching as :id
  http.get(`${BASE_URL}/contracts/contracts/for_event/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const eventId = Number(url.searchParams.get('event_id'));
    const filtered = contractsStore.filter((c) => {
      const eid = typeof c.event === 'number' ? c.event : c.event?.id;
      return eid === eventId;
    });
    return HttpResponse.json(filtered);
  }),

  // GET /api/contracts/contracts/:id/ - Get single contract
  http.get(`${BASE_URL}/contracts/contracts/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const contract = contractsStore.find((c) => c.id === id);
    if (!contract) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json(contract);
  }),

  // POST /api/contracts/contracts/ - Create contract
  http.post(`${BASE_URL}/contracts/contracts/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newContract = createMockEventContract({
      id: contractsStore.length + 100,
      event: (body.event as number) || 1,
      template: (body.template as number) || 1,
    });
    contractsStore.push(newContract);
    return HttpResponse.json(newContract, { status: 201 });
  }),

  // PATCH /api/contracts/contracts/:id/ - Update contract
  http.patch(`${BASE_URL}/contracts/contracts/:id/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const idx = contractsStore.findIndex((c) => c.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    contractsStore[idx] = {
      ...contractsStore[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(contractsStore[idx]);
  }),

  // DELETE /api/contracts/contracts/:id/ - Delete contract
  http.delete(`${BASE_URL}/contracts/contracts/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const idx = contractsStore.findIndex((c) => c.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    contractsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/contracts/contracts/:id/add_signature/ - Add signature
  http.post(`${BASE_URL}/contracts/contracts/:id/add_signature/`, async ({ params }) => {
    await delay(50);
    const id = Number(params.id);
    return HttpResponse.json(
      {
        id: 1,
        contract: id,
        signer: 1,
        role: 'CLIENT',
        role_display: 'Client',
        signature_data: 'base64-signature-data',
        signed_at: new Date().toISOString(),
        signer_name: 'John Doe',
        signer_title: '',
        signer_email: 'john@example.com',
        is_verified: false,
        verification_method: 'none',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  // POST /api/contracts/contracts/:id/void/ - Void contract
  http.post(`${BASE_URL}/contracts/contracts/:id/void/`, async ({ params }) => {
    await delay(50);
    const id = Number(params.id);
    const idx = contractsStore.findIndex((c) => c.id === id);
    if (idx !== -1) {
      contractsStore[idx] = { ...contractsStore[idx], status: 'VOID' as never };
    }
    return HttpResponse.json(
      contractsStore[idx] || createMockEventContract({ id, status: 'VOID' as never }),
    );
  }),

  // POST /api/contracts/contracts/:id/request_amendment/ - Request amendment
  http.post(`${BASE_URL}/contracts/contracts/:id/request_amendment/`, async ({ params }) => {
    await delay(50);
    return HttpResponse.json(
      createMockContractAmendment({
        id: 1,
        original_contract: Number(params.id),
      }),
      { status: 201 },
    );
  }),

  // POST /api/contracts/amendments/:id/approve/ - Approve amendment
  http.post(`${BASE_URL}/contracts/amendments/:id/approve/`, async ({ params }) => {
    await delay(30);
    return HttpResponse.json(
      createMockContractAmendment({
        id: Number(params.id),
        status: 'APPROVED' as never,
      }),
    );
  }),

  // POST /api/contracts/amendments/:id/reject/ - Reject amendment
  http.post(`${BASE_URL}/contracts/amendments/:id/reject/`, async ({ params }) => {
    await delay(30);
    return HttpResponse.json(
      createMockContractAmendment({
        id: Number(params.id),
        status: 'REJECTED' as never,
      }),
    );
  }),

  // POST /api/contracts/contracts/:id/send_contract/ - Send contract
  http.post(`${BASE_URL}/contracts/contracts/:id/send_contract/`, async ({ params }) => {
    await delay(50);
    const id = Number(params.id);
    const idx = contractsStore.findIndex((c) => c.id === id);
    if (idx !== -1) {
      contractsStore[idx] = {
        ...contractsStore[idx],
        status: 'SENT' as never,
        sent_at: new Date().toISOString(),
      };
    }
    return HttpResponse.json(
      contractsStore[idx] || createMockEventContract({ id, status: 'SENT' as never }),
    );
  }),
];
