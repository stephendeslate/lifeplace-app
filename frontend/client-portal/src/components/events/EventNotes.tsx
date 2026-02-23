// frontend/client-portal/src/components/events/EventNotes.tsx

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Skeleton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Note as NoteIcon, Send as SendIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { useEvents } from '../../hooks/useEvents';

interface EventNotesProps {
  eventId: number;
}

export const EventNotes: React.FC<EventNotesProps> = ({ eventId }) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const { useEventNotes, useCreateEventNote } = useEvents();

  const { data: notes = [], isLoading, error, refetch } = useEventNotes(eventId);
  const createNoteMutation = useCreateEventNote();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    createNoteMutation.mutate(
      { eventId, data: { content: newNoteContent.trim() } },
      {
        onSuccess: () => {
          setNewNoteContent('');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Box>
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load notes.
        <Button size="small" onClick={() => refetch()} sx={{ ml: 1 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Add New Note Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Add a Note
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Share questions, requests, or important information with us.
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Type your note here..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            disabled={createNoteMutation.isPending}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!newNoteContent.trim() || createNoteMutation.isPending}
              startIcon={
                createNoteMutation.isPending ? <CircularProgress size={20} /> : <SendIcon />
              }
            >
              {createNoteMutation.isPending ? 'Sending...' : 'Send Note'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Notes List */}
      {notes.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'grey.50',
            border: '2px dashed',
            borderColor: 'grey.300',
          }}
        >
          <NoteIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Notes Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the form above to add your first note. Notes are a great way to communicate with us
            about your event.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {notes.map((note) => (
            <Paper key={note.id} sx={{ p: 3 }}>
              {note.title && (
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  {note.title}
                </Typography>
              )}
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  mb: 2,
                }}
              >
                {note.content}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(new Date(note.created_at), 'MMM dd, yyyy at h:mm a')}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default EventNotes;
