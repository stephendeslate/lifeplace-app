import type {
  CommunicationTemplate,
  CommunicationRecord,
} from "../../../types/communications.types";
import type { PaginatedResponse } from "../../../types/common.types";

export function createMockTemplate(
  overrides: Partial<CommunicationTemplate> = {},
): CommunicationTemplate {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `Template ${id}`,
    channel: "EMAIL",
    category: "MANUAL",
    context_type: "GENERAL",
    context_type_display: "General",
    include_client_context: true,
    include_event_context: false,
    subject_template: `Subject for template ${id}`,
    body_template: `<p>Body content for template ${id}</p>`,
    is_system: false,
    layout: null,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  } as CommunicationTemplate;
}

export function createMockTemplates(count: number): CommunicationTemplate[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTemplate({
      id: i + 1,
      name: `Template ${i + 1}`,
      channel: i % 2 === 0 ? "EMAIL" : "SMS",
    }),
  );
}

export const mockTemplates = createMockTemplates(5);

export function createMockTemplatesPaginatedResponse(
  items: CommunicationTemplate[] = mockTemplates,
  page = 1,
  pageSize = 25,
): PaginatedResponse<CommunicationTemplate> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    count: items.length,
    next:
      end < items.length
        ? `/api/communications/templates/?page=${page + 1}`
        : null,
    previous:
      page > 1 ? `/api/communications/templates/?page=${page - 1}` : null,
    page_count: Math.ceil(items.length / pageSize),
    current_page: page,
    page_size: pageSize,
    results: items.slice(start, end),
  };
}

export function createMockCommunicationRecord(
  overrides: Partial<CommunicationRecord> = {},
): CommunicationRecord {
  const id = overrides.id || `rec-${Math.floor(Math.random() * 10000)}`;
  return {
    id,
    template_name: "Test Template",
    channel: "EMAIL",
    category: "MANUAL",
    recipient: "client@example.com",
    subject: "Test Subject",
    body: "<p>Test body</p>",
    delivery_status: "SENT",
    is_opened: false,
    context_data: {},
    created_at: "2024-06-15T10:00:00Z",
    ...overrides,
  } as CommunicationRecord;
}
