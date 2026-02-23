// frontend/admin-crm/src/test/mocks/handlers/settings.handlers.ts

import { http, HttpResponse, delay } from 'msw';
import {
  mockAdminUsers,
  mockAdminInvitations,
  mockLegalDocuments,
  mockCompanySettings,
  createMockAdminUser,
  createMockAdminInvitation,
  createMockLegalDocument,
} from '../data/settings.mock';
import type {
  AccountSettingsFormData,
  AdminUser,
  LegalDocument,
  CompanySettings,
} from '../../../types/settings.types';

const BASE_URL = 'http://localhost:8000/api';

// Mutable stores for testing mutations
let adminUsersStore = [...mockAdminUsers];
let invitationsStore = [...mockAdminInvitations];
let legalDocumentsStore = [...mockLegalDocuments];
let companySettingsStore = { ...mockCompanySettings };
let currentUser: AdminUser = {
  id: 1,
  email: 'admin@lifeplace.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'ADMIN',
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
  profile: {
    phone: '555-0100',
    company: 'LifePlace',
  },
};

export const resetSettingsStore = () => {
  adminUsersStore = [...mockAdminUsers];
  invitationsStore = [...mockAdminInvitations];
  legalDocumentsStore = [...mockLegalDocuments];
  companySettingsStore = { ...mockCompanySettings };
};

export const settingsHandlers = [
  // === Account Settings ===

  // PUT /api/users/me/
  http.put(`${BASE_URL}/users/me/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as AccountSettingsFormData;
    currentUser = { ...currentUser, ...body };
    return HttpResponse.json(currentUser);
  }),

  // POST /api/users/me/change-password/
  http.post(`${BASE_URL}/users/me/change-password/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as {
      current_password: string;
      new_password: string;
      confirm_password: string;
    };

    if (!body.current_password || !body.new_password) {
      return HttpResponse.json(
        { detail: 'Current password and new password are required' },
        { status: 400 },
      );
    }

    if (body.new_password !== body.confirm_password) {
      return HttpResponse.json({ detail: 'New passwords do not match' }, { status: 400 });
    }

    if (body.current_password === 'wrong-password') {
      return HttpResponse.json({ detail: 'Current password is incorrect' }, { status: 400 });
    }

    return HttpResponse.json({ detail: 'Password changed successfully' });
  }),

  // === Admin Users Management ===

  // GET /api/users/
  http.get(`${BASE_URL}/users/`, async () => {
    await delay(30);

    return HttpResponse.json({
      count: adminUsersStore.length,
      next: null,
      previous: null,
      results: adminUsersStore,
    });
  }),

  // POST /api/users/
  http.post(`${BASE_URL}/users/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newUser = createMockAdminUser({
      id: adminUsersStore.length + 1,
      email: body.email as string,
      first_name: body.first_name as string,
      last_name: body.last_name as string,
      role: 'admin',
      is_active: true,
    });

    adminUsersStore.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // PUT /api/users/:id/
  http.put(`${BASE_URL}/users/:id/`, async ({ params, request }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = adminUsersStore.findIndex((u) => u.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    const updates = (await request.json()) as Record<string, unknown>;
    adminUsersStore[idx] = { ...adminUsersStore[idx], ...updates } as AdminUser;
    return HttpResponse.json(adminUsersStore[idx]);
  }),

  // DELETE /api/users/:id/
  http.delete(`${BASE_URL}/users/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = adminUsersStore.findIndex((u) => u.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    adminUsersStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // === Admin Invitations ===

  // GET /api/users/invitations/
  http.get(`${BASE_URL}/users/invitations/`, async () => {
    await delay(30);

    return HttpResponse.json({
      count: invitationsStore.length,
      next: null,
      previous: null,
      results: invitationsStore,
    });
  }),

  // GET /api/users/invitations/:id/
  http.get(`${BASE_URL}/users/invitations/:id/`, async ({ params }) => {
    await delay(30);

    const { id } = params;
    const invitation = invitationsStore.find((inv) => inv.id === id);

    if (!invitation) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json(invitation);
  }),

  // POST /api/users/invitations/
  http.post(`${BASE_URL}/users/invitations/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;

    // Check for duplicate email
    if (invitationsStore.some((inv) => inv.email === body.email)) {
      return HttpResponse.json(
        { detail: 'An invitation for this email already exists' },
        { status: 400 },
      );
    }

    const newInvitation = createMockAdminInvitation({
      id: `inv-${invitationsStore.length + 1}`,
      email: body.email as string,
      first_name: body.first_name as string,
      last_name: body.last_name as string,
    });

    invitationsStore.push(newInvitation);
    return HttpResponse.json(newInvitation, { status: 201 });
  }),

  // DELETE /api/users/invitations/:id/
  http.delete(`${BASE_URL}/users/invitations/:id/`, async ({ params }) => {
    await delay(50);

    const { id } = params;
    const idx = invitationsStore.findIndex((inv) => inv.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    invitationsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/users/invitations/:id/accept/
  http.post(`${BASE_URL}/users/invitations/:id/accept/`, async ({ params, request }) => {
    await delay(50);

    const { id } = params;
    const invitation = invitationsStore.find((inv) => inv.id === id);

    if (!invitation) {
      return HttpResponse.json({ detail: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.is_accepted) {
      return HttpResponse.json({ detail: 'Invitation has already been accepted' }, { status: 400 });
    }

    const body = (await request.json()) as {
      password: string;
      confirm_password: string;
    };

    if (body.password !== body.confirm_password) {
      return HttpResponse.json({ detail: 'Passwords do not match' }, { status: 400 });
    }

    // Mark invitation as accepted
    invitation.is_accepted = true;

    return HttpResponse.json({
      message: 'Invitation accepted successfully',
      tokens: {
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      },
      user: createMockAdminUser({
        email: invitation.email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
      }),
    });
  }),

  // === Legal Documents ===

  // GET /api/settings/legal/
  http.get(`${BASE_URL}/settings/legal/`, async () => {
    await delay(30);
    return HttpResponse.json({ success: true, data: legalDocumentsStore });
  }),

  // GET /api/settings/legal/:type/
  http.get(`${BASE_URL}/settings/legal/:type/`, async ({ params }) => {
    await delay(30);

    const { type } = params;
    const doc = legalDocumentsStore.find((d) => d.document_type === (type as string).toUpperCase());

    if (!doc) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }

    return HttpResponse.json({ success: true, data: doc });
  }),

  // PUT /api/settings/legal/:type/
  http.put(`${BASE_URL}/settings/legal/:type/`, async ({ params, request }) => {
    await delay(50);

    const { type } = params;
    const idx = legalDocumentsStore.findIndex(
      (d) => d.document_type === (type as string).toUpperCase(),
    );

    if (idx === -1) {
      // Create new document
      const body = (await request.json()) as Record<string, unknown>;
      const newDoc = createMockLegalDocument({
        id: legalDocumentsStore.length + 1,
        document_type: (type as string).toUpperCase() as 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY',
        title: body.title as string,
        content: body.content as string,
        version: body.version as string,
      });

      legalDocumentsStore.push(newDoc);
      return HttpResponse.json({ success: true, data: newDoc });
    }

    const updates = (await request.json()) as Record<string, unknown>;
    legalDocumentsStore[idx] = {
      ...legalDocumentsStore[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    } as LegalDocument;
    return HttpResponse.json({ success: true, data: legalDocumentsStore[idx] });
  }),

  // === Company Settings ===

  // GET /api/settings/company/
  http.get(`${BASE_URL}/settings/company/`, async () => {
    await delay(30);
    return HttpResponse.json({ success: true, data: companySettingsStore });
  }),

  // PUT /api/settings/company/
  http.put(`${BASE_URL}/settings/company/`, async ({ request }) => {
    await delay(50);

    // Handle both JSON and FormData
    const contentType = request.headers.get('content-type');

    if (contentType && contentType.includes('multipart/form-data')) {
      // For FormData requests, just return updated settings
      const formData = await request.formData();
      const updates: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        if (!(value instanceof File)) {
          updates[key] = value;
        }
      });
      companySettingsStore = {
        ...companySettingsStore,
        ...updates,
        updated_at: new Date().toISOString(),
      } as CompanySettings;
    } else {
      const body = (await request.json()) as Record<string, unknown>;
      companySettingsStore = {
        ...companySettingsStore,
        ...body,
        updated_at: new Date().toISOString(),
      } as CompanySettings;
    }

    return HttpResponse.json({ success: true, data: companySettingsStore });
  }),
];
