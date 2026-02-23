// frontend/admin-crm/src/hooks/useNotes.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../apis/notes.api';
import { useToastActions } from '../contexts/ToastContext';
import type { NoteFilters, CreateNoteData, UpdateNoteData } from '../types/notes.types';

interface ApiError {
  response?: {
    data?: {
      detail?: string;
      [key: string]: unknown;
    };
  };
}

export const useNotes = (filters?: NoteFilters) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastActions();

  // Queries
  const {
    data: notesData,
    isLoading: isLoadingNotes,
    error: notesError,
    refetch: refetchNotes,
  } = useQuery({
    queryKey: ['notes', filters],
    queryFn: () => notesApi.getNotes(filters),
    enabled: !!filters,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const useNote = (id: number) => {
    return useQuery({
      queryKey: ['note', id],
      queryFn: () => notesApi.getNote(id),
      enabled: !!id,
    });
  };

  const useNotesForObject = (contentType: string, objectId: number, filters?: NoteFilters) => {
    return useQuery({
      queryKey: ['notes', 'for-object', contentType, objectId, filters],
      queryFn: () => notesApi.getNotesForObject(contentType, objectId, filters),
      enabled: !!(contentType && objectId),
      staleTime: 60 * 1000, // 1 minute
    });
  };

  // Mutations
  const createNoteMutation = useMutation({
    mutationFn: (data: CreateNoteData) => notesApi.createNote(data),
    onSuccess: (newNote) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({
        queryKey: [
          'notes',
          'for-object',
          newNote.content_type_name?.toLowerCase(),
          newNote.object_id,
        ],
      });
      showSuccess('Note Created', 'Note has been added successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to create note';
      showError('Create Failed', message);
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateNoteData }) =>
      notesApi.updateNote(id, data),
    onSuccess: (updatedNote) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note', updatedNote.id] });
      queryClient.invalidateQueries({
        queryKey: [
          'notes',
          'for-object',
          updatedNote.content_type_name?.toLowerCase(),
          updatedNote.object_id,
        ],
      });
      showSuccess('Note Updated', 'Note has been updated successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to update note';
      showError('Update Failed', message);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: number) => notesApi.deleteNote(id),
    onSuccess: (_, deletedId) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.removeQueries({ queryKey: ['note', deletedId] });
      showSuccess('Note Deleted', 'Note has been deleted successfully.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.detail || 'Failed to delete note';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    notes: notesData?.results || [],
    notesCount: notesData?.count || 0,

    // Loading states
    isLoadingNotes,
    isCreatingNote: createNoteMutation.isPending,
    isUpdatingNote: updateNoteMutation.isPending,
    isDeletingNote: deleteNoteMutation.isPending,

    // Error states
    notesError,
    createError: createNoteMutation.error,
    updateError: updateNoteMutation.error,
    deleteError: deleteNoteMutation.error,

    // Actions
    createNote: createNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    refetchNotes,

    // Hooks for specific queries
    useNote,
    useNotesForObject,
  };
};

export default useNotes;
