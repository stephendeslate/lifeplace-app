// frontend/admin-crm/src/test/mocks/handlers/clients.handlers.ts

import { http, HttpResponse, delay } from 'msw';
import {
  mockClients,
  createMockClient,
  createMockPaginatedResponse,
  createMockClientInvitation,
} from '../data/clients.mock';
import type { CreateClientData, UpdateClientData, Client } from '../../../types/clients.types';

const BASE_URL = 'http://localhost:8000/api';

// Mutable store for testing mutations
let clientsStore = [...mockClients];

export const resetClientsStore = () => {
  clientsStore = [...mockClients];
};

export const clientHandlers = [
  // GET /api/clients/
  http.get(`${BASE_URL}/clients/`, async ({ request }) => {
    await delay(50);

    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const isActive = url.searchParams.get('is_active');
    const hasAccount = url.searchParams.get('has_account');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '25');

    let filteredClients = [...clientsStore];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredClients = filteredClients.filter(
        (c) =>
          c.email.toLowerCase().includes(searchLower) ||
          c.first_name.toLowerCase().includes(searchLower) ||
          c.last_name.toLowerCase().includes(searchLower),
      );
    }

    // Apply is_active filter
    if (isActive !== null) {
      const isActiveBoolean = isActive === 'true';
      filteredClients = filteredClients.filter((c) => c.is_active === isActiveBoolean);
    }

    // Apply has_account filter
    if (hasAccount !== null) {
      const hasAccountBoolean = hasAccount === 'true';
      filteredClients = filteredClients.filter((c) => c.has_account === hasAccountBoolean);
    }

    return HttpResponse.json(createMockPaginatedResponse(filteredClients, page, pageSize));
  }),

  // GET /api/clients/:id/
  http.get(`${BASE_URL}/clients/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const client = clientsStore.find((c) => c.id === id);

    if (!client) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(client);
  }),

  // POST /api/clients/
  http.post(`${BASE_URL}/clients/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as CreateClientData;

    // Validate required fields
    if (!body.email || !body.first_name || !body.last_name) {
      return HttpResponse.json(
        { detail: 'Email, first_name, and last_name are required' },
        { status: 400 },
      );
    }

    // Check for duplicate email
    if (clientsStore.some((c) => c.email === body.email)) {
      return HttpResponse.json(
        { detail: 'A client with this email already exists' },
        { status: 400 },
      );
    }

    const newClient = createMockClient({
      id: clientsStore.length + 1,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      profile: body.profile,
      is_active: body.is_active ?? true,
      has_account: false,
      date_joined: new Date().toISOString(),
    });

    clientsStore.push(newClient);

    return HttpResponse.json(newClient, { status: 201 });
  }),

  // PATCH /api/clients/:id/
  http.patch(`${BASE_URL}/clients/:id/`, async ({ params, request }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const clientIndex = clientsStore.findIndex((c) => c.id === id);

    if (clientIndex === -1) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    const updates = (await request.json()) as UpdateClientData;
    const updatedClient: Client = {
      ...clientsStore[clientIndex],
      ...updates,
      profile: updates.profile
        ? { ...clientsStore[clientIndex].profile, ...updates.profile }
        : clientsStore[clientIndex].profile,
    };

    clientsStore[clientIndex] = updatedClient;

    return HttpResponse.json(updatedClient);
  }),

  // DELETE /api/clients/:id/
  http.delete(`${BASE_URL}/clients/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const clientIndex = clientsStore.findIndex((c) => c.id === id);

    if (clientIndex === -1) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    clientsStore.splice(clientIndex, 1);

    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/clients/:id/events/
  http.get(`${BASE_URL}/clients/:id/events/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const client = clientsStore.find((c) => c.id === id);

    if (!client) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    // Return empty events array - in real app would return client's events
    return HttpResponse.json([]);
  }),

  // POST /api/clients/:id/send_invitation/
  http.post(`${BASE_URL}/clients/:id/send_invitation/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const client = clientsStore.find((c) => c.id === id);

    if (!client) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    if (client.has_account) {
      return HttpResponse.json({ detail: 'Client already has an account' }, { status: 400 });
    }

    return HttpResponse.json(
      createMockClientInvitation({
        client: client.email,
        client_name: `${client.first_name} ${client.last_name}`,
      }),
    );
  }),

  // GET /api/clients/invitations/:id/
  http.get(`${BASE_URL}/clients/invitations/:id/`, async ({ params }) => {
    await delay(30);

    const { id } = params;

    if (id === 'not-found') {
      return HttpResponse.json({ detail: 'Invitation not found' }, { status: 404 });
    }

    return HttpResponse.json(createMockClientInvitation({ id: id as string }));
  }),

  // POST /api/clients/invitations/:id/accept/
  http.post(`${BASE_URL}/clients/invitations/:id/accept/`, async ({ params, request }) => {
    await delay(50);

    const { id } = params;

    if (id === 'expired') {
      return HttpResponse.json({ detail: 'Invitation has expired' }, { status: 400 });
    }

    const body = (await request.json()) as { password: string; confirm_password: string };

    if (body.password !== body.confirm_password) {
      return HttpResponse.json({ detail: 'Passwords do not match' }, { status: 400 });
    }

    return HttpResponse.json({
      message: 'Account activated successfully',
      tokens: {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      },
      user: createMockClient({ id: 100, has_account: true }),
    });
  }),

  // POST /api/clients/import/
  http.post(`${BASE_URL}/clients/import/`, async () => {
    await delay(100);

    return HttpResponse.json({
      success: 5,
      errors: [],
    });
  }),
];
