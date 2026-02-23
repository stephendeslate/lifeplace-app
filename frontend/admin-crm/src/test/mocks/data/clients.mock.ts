// frontend/admin-crm/src/test/mocks/data/clients.mock.ts

import type { Client, ClientInvitation } from '../../../types/clients.types';
import type { PaginatedResponse } from '../../../types/common.types';

export function createMockClient(overrides: Partial<Client> = {}): Client {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    email: `client${id}@example.com`,
    first_name: 'Test',
    last_name: 'Client',
    date_joined: '2024-01-15T10:00:00Z',
    is_active: true,
    has_account: false,
    profile: {
      company: 'Test Company',
      phone: '555-0100',
    },
    ...overrides,
  };
}

export function createMockClients(count: number): Client[] {
  const firstNames = [
    'John',
    'Jane',
    'Bob',
    'Alice',
    'Charlie',
    'Diana',
    'Eve',
    'Frank',
    'Grace',
    'Henry',
  ];
  const lastNames = [
    'Doe',
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Wilson',
  ];

  return Array.from({ length: count }, (_, i) =>
    createMockClient({
      id: i + 1,
      email: `${firstNames[i % 10].toLowerCase()}.${lastNames[i % 10].toLowerCase()}@example.com`,
      first_name: firstNames[i % 10],
      last_name: lastNames[i % 10],
      has_account: i % 3 === 0, // Every 3rd client has an account
      is_active: i % 5 !== 0, // Every 5th client is inactive
    }),
  );
}

export const mockClients = createMockClients(10);

export function createMockPaginatedResponse<T>(
  items: T[],
  page = 1,
  pageSize = 25,
): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedResults = items.slice(start, end);

  return {
    count: items.length,
    next: end < items.length ? `/api/clients/?page=${page + 1}` : null,
    previous: page > 1 ? `/api/clients/?page=${page - 1}` : null,
    page_count: Math.ceil(items.length / pageSize),
    current_page: page,
    page_size: pageSize,
    results: paginatedResults,
  };
}

export function createMockClientInvitation(
  overrides: Partial<ClientInvitation> = {},
): ClientInvitation {
  return {
    id: 'inv-123-456',
    client: 'client1@example.com',
    client_name: 'John Doe',
    invited_by: 'admin@lifeplace.com',
    is_accepted: false,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
