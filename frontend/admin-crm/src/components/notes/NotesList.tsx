// frontend/admin-crm/src/components/notes/NotesList.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Note as NoteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNotes } from '../../hooks/useNotes';
import { NoteCard } from './NoteCard';
import { NoteFormDialog } from './NoteFormDialog';
import type { 
  NotesListProps, 
  Note, 
  CreateNoteData, 
  UpdateNoteData,
  NoteFilters,
} from '../../types/notes.types';

export const NotesList: React.FC<NotesListProps> = ({
  contentType,
  objectId,
  objectName,
  allowCreate = true,
  allowEdit = true,
  allowDelete = true,
  compact = false,
}) => {
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const {
    createNote,
    updateNote,
    deleteNote,
    isCreatingNote,
    isUpdatingNote,
    isDeletingNote,
  } = useNotes();

  // Get notes for the specific object
  const filters: NoteFilters = searchFilter ? { search: searchFilter } : {};
  const { 
    data: notes = [], 
    isLoading, 
    error,
    refetch,
  } = useNotes().useNotesForObject(contentType, objectId, filters);

  const handleCreate = (data: CreateNoteData | UpdateNoteData) => {
    // Only handle CreateNoteData for creation
    if ('content_type_model' in data && 'object_id' in data) {
      createNote(data as CreateNoteData, {
        onSuccess: () => {
          setCreateDialogOpen(false);
          refetch();
        }
      });
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setEditDialogOpen(true);
  };

  const handleUpdate = (data: UpdateNoteData) => {
    if (editingNote) {
      updateNote(
        { id: editingNote.id, data },
        {
          onSuccess: () => {
            setEditDialogOpen(false);
            setEditingNote(null);
            refetch();
          }
        }
      );
    }
  };

  const handleDeleteClick = (noteId: number) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setNoteToDelete(note);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (noteToDelete) {
      deleteNote(noteToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setNoteToDelete(null);
          refetch();
        }
      });
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load notes. Please try again.
        <Button size="small" onClick={() => refetch()} sx={{ ml: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const renderEmptyState = () => (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 4, 
        textAlign: 'center', 
        bgcolor: 'grey.50',
        border: '2px dashed',
        borderColor: 'grey.300'
      }}
    >
      <NoteIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        No Notes Yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {searchFilter 
          ? 'No notes match your search criteria.'
          : `Start adding notes ${objectName ? `for ${objectName}` : ''} to keep track of important information.`
        }
      </Typography>
      
      {allowCreate && !searchFilter && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add First Note
        </Button>
      )}
    </Paper>
  );

  return (
    <Box>
      {/* Header with search and actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2} flex={1}>
          <TextField
            size="small"
            placeholder="Search notes..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 250 }}
          />
          
          <Tooltip title="Refresh notes">
            <IconButton size="small" onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {allowCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            size="small"
          >
            Add Note
          </Button>
        )}
      </Box>

      {/* Notes count */}
      {notes.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {notes.length} note{notes.length !== 1 ? 's' : ''} found
          {searchFilter && ` for "${searchFilter}"`}
        </Typography>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        renderEmptyState()
      ) : (
        <Stack spacing={compact ? 1 : 2}>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={allowEdit ? handleEdit : undefined}
              onDelete={allowDelete ? handleDeleteClick : undefined}
              allowEdit={allowEdit}
              allowDelete={allowDelete}
              compact={compact}
            />
          ))}
        </Stack>
      )}

      {/* Create Note Dialog */}
      <NoteFormDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        contentType={contentType}
        objectId={objectId}
        onSubmit={handleCreate}
        isLoading={isCreatingNote}
      />

      {/* Edit Note Dialog */}
      <NoteFormDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingNote(null);
        }}
        editingNote={editingNote}
        contentType={contentType}
        objectId={objectId}
        onSubmit={handleUpdate}
        isLoading={isUpdatingNote}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => !isDeletingNote && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Note</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this note? This action cannot be undone.
            {noteToDelete?.title && (
              <>
                <br /><br />
                <strong>"{noteToDelete.title}"</strong>
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeletingNote}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error" 
            variant="contained"
            disabled={isDeletingNote}
          >
            {isDeletingNote ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};