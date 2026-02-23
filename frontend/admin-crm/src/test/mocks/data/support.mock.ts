import type {
  SupportInquiry,
  SupportMessage,
  SupportStats,
  SupportCategory,
  SupportStatus,
  SupportPriority,
} from '../../../types/support.types';

export function createMockSupportInquiry(overrides: Partial<SupportInquiry> = {}): SupportInquiry {
  const id = overrides.id || `inq-${Math.floor(Math.random() * 10000)}`;
  const category: SupportCategory = overrides.category || 'general';
  const status: SupportStatus = overrides.status || 'active';
  const categoryDisplayMap: Record<SupportCategory, string> = {
    billing: 'Billing',
    event: 'Event',
    technical: 'Technical',
    general: 'General',
  };
  const statusDisplayMap: Record<SupportStatus, string> = {
    active: 'Active',
    waiting: 'Waiting',
    resolved: 'Resolved',
    archived: 'Archived',
  };
  return {
    id,
    subject: `Support Inquiry ${id}`,
    category,
    category_display: categoryDisplayMap[category],
    status,
    status_display: statusDisplayMap[status],
    priority: 'normal',
    client: 1,
    client_name: 'John Doe',
    client_email: 'john@example.com',
    assigned_admin: null,
    assigned_admin_name: null,
    event: null,
    event_name: null,
    message_count: 3,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    last_message_at: '2024-06-15T12:00:00Z',
    ...overrides,
  };
}

export function createMockSupportInquiries(count: number): SupportInquiry[] {
  const subjects = [
    'Cannot complete payment',
    'Need to change event date',
    'Website login issue',
    'Question about pricing',
    'Invoice discrepancy',
  ];
  const categories: SupportCategory[] = ['billing', 'event', 'technical', 'general', 'billing'];
  const statuses: SupportStatus[] = ['active', 'waiting', 'active', 'resolved', 'archived'];
  const priorities: SupportPriority[] = ['urgent', 'high', 'normal', 'low', 'normal'];
  return Array.from({ length: count }, (_, i) =>
    createMockSupportInquiry({
      id: `inq-${i + 1}`,
      subject: subjects[i % subjects.length],
      category: categories[i % categories.length],
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      client: i + 1,
      client_name: `Client ${i + 1}`,
      message_count: (i + 1) * 2,
    }),
  );
}

export const mockSupportInquiries = createMockSupportInquiries(5);

export function createMockSupportMessage(overrides: Partial<SupportMessage> = {}): SupportMessage {
  const id = overrides.id || `msg-${Math.floor(Math.random() * 10000)}`;
  return {
    id,
    sender: {
      id: 1,
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      display_name: 'John Doe',
      role: 'client',
    },
    content: 'This is a support message.',
    message_type: 'text',
    is_internal_note: false,
    attachments: [],
    created_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockSupportMessages(count: number): SupportMessage[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSupportMessage({
      id: `msg-${i + 1}`,
      content: `Message ${i + 1} content`,
      is_internal_note: i % 3 === 0,
      sender: {
        id: i % 2 === 0 ? 1 : 100,
        email: i % 2 === 0 ? 'john@example.com' : 'admin@lifeplace.com',
        first_name: i % 2 === 0 ? 'John' : 'Admin',
        last_name: i % 2 === 0 ? 'Doe' : 'User',
        display_name: i % 2 === 0 ? 'John Doe' : 'Admin User',
        role: i % 2 === 0 ? 'client' : 'admin',
      },
    }),
  );
}

export const mockSupportMessages = createMockSupportMessages(5);

export function createMockSupportStats(overrides: Partial<SupportStats> = {}): SupportStats {
  return {
    total: 45,
    open: 12,
    in_progress: 8,
    resolved_today: 5,
    unassigned: 3,
    by_category: {
      billing: 15,
      event: 12,
      technical: 8,
      general: 10,
    },
    by_priority: {
      urgent: 3,
      high: 8,
      normal: 25,
      low: 9,
    },
    ...overrides,
  };
}

export const mockSupportStats = createMockSupportStats();
