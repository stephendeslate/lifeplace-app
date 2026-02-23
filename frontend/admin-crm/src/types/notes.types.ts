// frontend/admin-crm/src/types/notes.types.ts

export interface Note {
  id: number;
  title: string;
  content: string;
  created_by: number | null;
  created_by_name?: string;
  content_type: number;
  object_id: number;
  content_type_name?: string;
  content_object_repr?: string;
  created_at: string;
  updated_at: string;
  is_client_visible: boolean;
}

export interface CreateNoteData {
  title?: string;
  content: string;
  content_type_model: string; // e.g., 'client', 'event'
  object_id: number;
  is_client_visible?: boolean;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  is_client_visible?: boolean;
}

export interface NoteFilters {
  search?: string;
  content_type?: string;
  object_id?: number;
  created_by?: number;
  date_from?: string;
  date_to?: string;
}

export interface NoteFormData {
  title: string;
  content: string;
  is_client_visible: boolean;
}

// Component prop types
export interface NotesListProps {
  contentType: string;
  objectId: number;
  objectName?: string;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  compact?: boolean;
}

export interface NoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingNote?: Note | null;
  contentType: string;
  objectId: number;
  onSubmit: (data: CreateNoteData | UpdateNoteData) => void;
  isLoading: boolean;
}

export interface NoteCardProps {
  note: Note;
  onEdit?: (note: Note) => void;
  onDelete?: (id: number) => void;
  allowEdit?: boolean;
  allowDelete?: boolean;
  compact?: boolean;
}

export interface NotePreviewProps {
  note: Note;
  maxLength?: number;
}
