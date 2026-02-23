import { http, HttpResponse, delay } from 'msw';
import {
  mockNotifications,
  createMockNotification,
  createMockNotificationCounts,
  createMockNotificationType,
} from '../data/notifications.mock';
import type { Notification } from '../../../types/notifications.types';

const BASE_URL = 'http://localhost:8000/api';

let notificationsStore: Notification[] = [...mockNotifications];

export const resetNotificationsStore = () => {
  notificationsStore = [...mockNotifications];
};

export const notificationsHandlers = [
  // GET /api/notifications/notifications/ - List notifications
  http.get(`${BASE_URL}/notifications/notifications/`, async ({ request }) => {
    await delay(50);
    const url = new URL(request.url);
    const isRead = url.searchParams.get('is_read');

    let filtered = [...notificationsStore];
    if (isRead === 'true') filtered = filtered.filter((n) => n.is_read);
    if (isRead === 'false') filtered = filtered.filter((n) => !n.is_read);

    return HttpResponse.json({
      count: filtered.length,
      next: null,
      previous: null,
      results: filtered,
    });
  }),

  // GET /api/notifications/notifications/counts/ - Notification counts
  http.get(`${BASE_URL}/notifications/notifications/counts/`, async () => {
    await delay(30);
    return HttpResponse.json(createMockNotificationCounts());
  }),

  // GET /api/notifications/notifications/unread/ - Unread notifications
  http.get(`${BASE_URL}/notifications/notifications/unread/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || 10);
    const unread = notificationsStore.filter((n) => !n.is_read).slice(0, limit);
    return HttpResponse.json(unread);
  }),

  // GET /api/notifications/notifications/recent/ - Recent notifications
  http.get(`${BASE_URL}/notifications/notifications/recent/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || 10);
    return HttpResponse.json(notificationsStore.slice(0, limit));
  }),

  // POST /api/notifications/notifications/:id/mark_read/ - Mark as read
  http.post(`${BASE_URL}/notifications/notifications/:id/mark_read/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const notification = notificationsStore.find((n) => n.id === id);
    if (!notification) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    notification.is_read = true;
    notification.read_at = new Date().toISOString();
    return HttpResponse.json(notification);
  }),

  // POST /api/notifications/notifications/:id/mark_unread/ - Mark as unread
  http.post(`${BASE_URL}/notifications/notifications/:id/mark_unread/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const notification = notificationsStore.find((n) => n.id === id);
    if (!notification) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    notification.is_read = false;
    notification.read_at = null;
    return HttpResponse.json(notification);
  }),

  // POST /api/notifications/notifications/mark_all_read/ - Mark all as read
  http.post(`${BASE_URL}/notifications/notifications/mark_all_read/`, async () => {
    await delay(30);
    let count = 0;
    notificationsStore.forEach((n) => {
      if (!n.is_read) {
        n.is_read = true;
        n.read_at = new Date().toISOString();
        count++;
      }
    });
    return HttpResponse.json({ marked_read: count });
  }),

  // DELETE /api/notifications/notifications/:id/ - Delete notification
  http.delete(`${BASE_URL}/notifications/notifications/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const idx = notificationsStore.findIndex((n) => n.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    notificationsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/notifications/notifications/create_notification/ - Create notification
  http.post(`${BASE_URL}/notifications/notifications/create_notification/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const recipientIds = (body.recipient_ids as number[]) || [1];
    const notifications = recipientIds.map((recipientId) =>
      createMockNotification({
        id: notificationsStore.length + 100 + recipientId,
        recipient: recipientId,
        title: 'New notification',
      }),
    );
    notificationsStore.push(...notifications);
    return HttpResponse.json(
      {
        created_count: notifications.length,
        total_recipients: recipientIds.length,
        notifications,
      },
      { status: 201 },
    );
  }),

  // GET /api/notifications/types/ - List notification types
  http.get(`${BASE_URL}/notifications/types/`, async () => {
    await delay(30);
    const types = [
      createMockNotificationType({
        id: 1,
        code: 'EVENT_CREATED',
        name: 'Event Created',
        category: 'EVENT' as never,
      }),
      createMockNotificationType({
        id: 2,
        code: 'PAYMENT_RECEIVED',
        name: 'Payment Received',
        category: 'PAYMENT' as never,
      }),
    ];
    return HttpResponse.json({
      count: types.length,
      next: null,
      previous: null,
      page_count: 1,
      current_page: 1,
      page_size: 25,
      results: types,
    });
  }),

  // POST /api/notifications/types/ - Create notification type
  http.post(`${BASE_URL}/notifications/types/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newType = createMockNotificationType({
      id: 100,
      name: body.name as string,
      code: body.code as string,
    });
    return HttpResponse.json(newType, { status: 201 });
  }),

  // GET /api/notifications/preferences/my_preferences/ - Get preferences
  http.get(`${BASE_URL}/notifications/preferences/my_preferences/`, async () => {
    await delay(30);
    return HttpResponse.json({
      id: 1,
      user: 1,
      email_enabled: true,
      sms_enabled: false,
      in_app_enabled: true,
      push_enabled: false,
      digest_frequency: 'DAILY',
      disabled_types: [],
      quiet_hours_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      created_at: '2024-06-15T10:00:00Z',
      updated_at: '2024-06-15T10:00:00Z',
    });
  }),

  // PUT /api/notifications/preferences/update_preferences/ - Update preferences
  http.put(`${BASE_URL}/notifications/preferences/update_preferences/`, async ({ request }) => {
    await delay(30);
    const body = await request.json();
    return HttpResponse.json({
      id: 1,
      user: 1,
      email_enabled: true,
      sms_enabled: false,
      in_app_enabled: true,
      push_enabled: false,
      digest_frequency: 'DAILY',
      disabled_types: [],
      quiet_hours_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null,
      created_at: '2024-06-15T10:00:00Z',
      updated_at: new Date().toISOString(),
      ...(body as object),
    });
  }),
];
