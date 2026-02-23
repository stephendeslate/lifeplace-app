// frontend/admin-crm/src/apis/notes.api.ts

import api from '../utils/api';
import type { Note, CreateNoteData, UpdateNoteData, NoteFilters } from '../types/notes.types';
import type { PaginatedResponse } from '../types/common.types';

export const notesApi = {
  // Get notes for a specific object
  getNotesForObject: async (
    contentType: string,
    objectId: number,
    filters?: NoteFilters,
  ): Promise<Note[]> => {
    const params = new URLSearchParams();
    params.append('content_type', contentType);
    params.append('object_id', objectId.toString());

    if (filters?.search) params.append('search', filters.search);
    if (filters?.created_by) params.append('created_by', filters.created_by.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const response = await api.get<Note[]>(`/notes/for_object/?${params.toString()}`);
    return response.data;
  },

  // Get all notes with pagination
  getNotes: async (filters?: NoteFilters): Promise<PaginatedResponse<Note>> => {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.content_type) params.append('content_type', filters.content_type);
    if (filters?.object_id) params.append('object_id', filters.object_id.toString());
    if (filters?.created_by) params.append('created_by', filters.created_by.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const response = await api.get<PaginatedResponse<Note>>(`/notes/?${params.toString()}`);
    return response.data;
  },

  // Get single note
  getNote: async (id: number): Promise<Note> => {
    const response = await api.get<Note>(`/notes/${id}/`);
    return response.data;
  },

  // Create note
  createNote: async (data: CreateNoteData): Promise<Note> => {
    const response = await api.post<Note>('/notes/', data);
    return response.data;
  },

  // Update note
  updateNote: async (id: number, data: UpdateNoteData): Promise<Note> => {
    const response = await api.put<Note>(`/notes/${id}/`, data);
    return response.data;
  },

  // Delete note
  deleteNote: async (id: number): Promise<void> => {
    await api.delete(`/notes/${id}/`);
  },
};
