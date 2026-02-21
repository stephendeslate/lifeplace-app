// frontend/admin-crm/src/test/mocks/handlers/support.handlers.ts

import { http, HttpResponse, delay } from "msw";
import {
  mockSupportInquiries,
  mockSupportMessages,
  mockSupportStats,
  createMockSupportMessage,
} from "../data/support.mock";
import type {
  SupportInquiry,
  SupportInquiryUpdate,
  SupportReply,
} from "../../../types/support.types";

const BASE_URL = "http://localhost:8000/api";

// Mutable stores for testing mutations
let inquiriesStore = [...mockSupportInquiries];
let messagesStore = [...mockSupportMessages];

export const resetSupportStore = () => {
  inquiriesStore = [...mockSupportInquiries];
  messagesStore = [...mockSupportMessages];
};

export const supportHandlers = [
  // GET /api/messaging/admin/support/
  http.get(`${BASE_URL}/messaging/admin/support/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const assignedAdmin = url.searchParams.get("assigned_admin");
    const priority = url.searchParams.get("priority");
    const search = url.searchParams.get("search");

    let filtered = [...inquiriesStore];

    if (status) {
      filtered = filtered.filter((i) => i.status === status);
    }
    if (category) {
      filtered = filtered.filter((i) => i.category === category);
    }
    if (assignedAdmin) {
      filtered = filtered.filter(
        (i) => i.assigned_admin?.toString() === assignedAdmin,
      );
    }
    if (priority) {
      filtered = filtered.filter((i) => i.priority === priority);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.subject.toLowerCase().includes(searchLower) ||
          i.client_name.toLowerCase().includes(searchLower) ||
          i.client_email.toLowerCase().includes(searchLower),
      );
    }

    return HttpResponse.json({
      count: filtered.length,
      next: null,
      previous: null,
      results: filtered,
    });
  }),

  // GET /api/messaging/admin/support/stats/
  http.get(`${BASE_URL}/messaging/admin/support/stats/`, async () => {
    await delay(30);
    return HttpResponse.json(mockSupportStats);
  }),

  // GET /api/messaging/admin/support/:id/
  http.get(`${BASE_URL}/messaging/admin/support/:id/`, async ({ params }) => {
    await delay(30);

    const { id } = params;
    const inquiry = inquiriesStore.find((i) => i.id === id);

    if (!inquiry) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    // Return detail view with messages
    return HttpResponse.json({
      ...inquiry,
      messages: messagesStore,
    });
  }),

  // PATCH /api/messaging/admin/support/:id/
  http.patch(
    `${BASE_URL}/messaging/admin/support/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const { id } = params;
      const idx = inquiriesStore.findIndex((i) => i.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as SupportInquiryUpdate;
      inquiriesStore[idx] = {
        ...inquiriesStore[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      } as SupportInquiry;

      return HttpResponse.json(inquiriesStore[idx]);
    },
  ),

  // POST /api/messaging/admin/support/:id/add_reply/
  http.post(
    `${BASE_URL}/messaging/admin/support/:id/add_reply/`,
    async ({ params, request }) => {
      await delay(50);

      const { id } = params;
      const inquiry = inquiriesStore.find((i) => i.id === id);

      if (!inquiry) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as SupportReply;
      const newMessage = createMockSupportMessage({
        id: `msg-${messagesStore.length + 1}`,
        content: body.content,
        is_internal_note: body.is_internal_note || false,
        sender: {
          id: 100,
          email: "admin@lifeplace.com",
          first_name: "Admin",
          last_name: "User",
          display_name: "Admin User",
          role: "admin",
        },
      });

      messagesStore.push(newMessage);

      // Update message count and last_message_at
      const inquiryIdx = inquiriesStore.findIndex((i) => i.id === id);
      if (inquiryIdx !== -1) {
        inquiriesStore[inquiryIdx] = {
          ...inquiriesStore[inquiryIdx],
          message_count: inquiriesStore[inquiryIdx].message_count + 1,
          last_message_at: new Date().toISOString(),
        };
      }

      return HttpResponse.json(newMessage, { status: 201 });
    },
  ),
];
