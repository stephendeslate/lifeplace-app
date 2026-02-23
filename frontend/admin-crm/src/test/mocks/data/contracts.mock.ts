import type {
  ContractTemplate,
  EventContract,
  ContractAmendment,
} from '../../../types/contracts.types';
import type { PaginatedResponse } from '../../../types/common.types';

export function createMockContractTemplate(
  overrides: Partial<ContractTemplate> = {},
): ContractTemplate {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `Contract Template ${id}`,
    description: `Description for template ${id}`,
    event_type: null,
    content: '<p>Contract content here</p>',
    variables: ['client_name', 'event_date'],
    requires_signature: true,
    sections: [],
    signature_requirements: ['CLIENT'],
    requires_witness: false,
    requires_company_signature: true,
    allows_amendments: true,
    amendment_requires_signature: true,
    is_active: true,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  } as ContractTemplate;
}

export function createMockContractTemplates(count: number): ContractTemplate[] {
  return Array.from({ length: count }, (_, i) =>
    createMockContractTemplate({
      id: i + 1,
      name: `Contract Template ${i + 1}`,
      is_active: i % 4 !== 0,
    }),
  );
}

export const mockContractTemplates = createMockContractTemplates(5);

export function createMockContractTemplatesPaginatedResponse(
  items: ContractTemplate[] = mockContractTemplates,
  page = 1,
  pageSize = 25,
): PaginatedResponse<ContractTemplate> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    count: items.length,
    next: end < items.length ? `/api/contracts/templates/?page=${page + 1}` : null,
    previous: page > 1 ? `/api/contracts/templates/?page=${page - 1}` : null,
    page_count: Math.ceil(items.length / pageSize),
    current_page: page,
    page_size: pageSize,
    results: items.slice(start, end),
  };
}

export function createMockEventContract(overrides: Partial<EventContract> = {}): EventContract {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    event: 1,
    event_details: {
      id: 1,
      name: 'Test Event',
      client_name: 'John Doe',
      start_date: '2024-07-01',
      status: 'CONFIRMED',
    },
    template: 1,
    template_name: 'Standard Contract',
    status: 'DRAFT',
    status_display: 'Draft',
    content: '<p>Contract content</p>',
    sent_at: null,
    fully_signed_at: null,
    valid_until: null,
    contract_value: '50000.00',
    payment_schedule_reference: '',
    currency: 'PHP',
    is_amendment: false,
    original_contract: null,
    amendment_number: 0,
    signature_count: 0,
    is_fully_signed: false,
    is_expired: false,
    is_expiring_soon: false,
    days_until_expiry: null,
    expiry_urgency: null,
    sign_disabled_reason: null,
    contract_type: 'STANDARD',
    missing_signatures: ['CLIENT'],
    signature_progress: {
      total_required: 2,
      signed_count: 0,
      percentage: 0,
      required_roles: ['CLIENT', 'COMPANY_REP'],
      signed_roles: [],
      missing_roles: ['CLIENT', 'COMPANY_REP'],
    },
    signatures: [],
    amendment_requests: [],
    documents: [],
    notes: [],
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  } as EventContract;
}

export function createMockEventContracts(count: number): EventContract[] {
  return Array.from({ length: count }, (_, i) =>
    createMockEventContract({
      id: i + 1,
      status: i % 2 === 0 ? 'DRAFT' : 'SENT',
    }),
  );
}

export const mockEventContracts = createMockEventContracts(5);

export function createMockContractAmendment(
  overrides: Partial<ContractAmendment> = {},
): ContractAmendment {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    original_contract: 1,
    amendment_contract: null,
    amendment_reason: 'Date change requested',
    changes_description: 'Changed event date from July 1 to July 15',
    section_changes: {},
    status: 'REQUESTED',
    status_display: 'Requested',
    original_value: '50000.00',
    new_value: '55000.00',
    value_change: '5000.00',
    requested_by: 1,
    requested_at: '2024-06-20T10:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
    review_notes: '',
    requires_new_signatures: true,
    signature_deadline: null,
    created_at: '2024-06-20T10:00:00Z',
    updated_at: '2024-06-20T10:00:00Z',
    ...overrides,
  } as ContractAmendment;
}
