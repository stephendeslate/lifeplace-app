import type { Note } from '../../../types/notes.types';
import type { PaginatedResponse } from '../../../types/common.types';

export function createMockNote(overrides: Partial<Note> = {}): Note {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    title: `Test Note ${id}`,
    content: `This is the content of note ${id}`,
    created_by: 1,
    created_by_name: 'Admin User',
    content_type: 1,
    object_id: 1,
    content_type_name: 'client',
    content_object_repr: 'John Doe',
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    is_client_visible: false,
    ...overrides,
  };
}

export function createMockNotes(count: number): Note[] {
  return Array.from({ length: count }, (_, i) =>
    createMockNote({
      id: i + 1,
      title: `Note ${i + 1}`,
      content: `Content for note ${i + 1}`,
      is_client_visible: i % 3 === 0,
    }),
  );
}

export const mockNotes = createMockNotes(5);

export function createMockNotesPaginatedResponse(
  items: Note[] = mockNotes,
  page = 1,
  pageSize = 25,
): PaginatedResponse<Note> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    count: items.length,
    next: end < items.length ? `/api/notes/?page=${page + 1}` : null,
    previous: page > 1 ? `/api/notes/?page=${page - 1}` : null,
    page_count: Math.ceil(items.length / pageSize),
    current_page: page,
    page_size: pageSize,
    results: items.slice(start, end),
  };
}
