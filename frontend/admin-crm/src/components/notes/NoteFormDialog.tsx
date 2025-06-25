// frontend/admin-crm/src/components/notes/NoteFormDialog.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { 
  type NoteFormDialogProps,
  type NoteFormData,
  type CreateNoteData,
  type UpdateNoteData,
} from '../../types/notes.types';

const defaultFormData: NoteFormData = {
  title: '',
  content: '',
};

export const NoteFormDialog: React.FC<NoteFormDialogProps> = ({
  open,
  onClose,
  editingNote,
  contentType,
  objectId,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<NoteFormData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (editingNote) {
        setFormData({
          title: editingNote.title || '',
          content: editingNote.content || '',
        });
      } else {
        setFormData(defaultFormData);
      }
      setErrors({});
    }
  }, [editingNote, open]);

  const handleInputChange = (field: keyof NoteFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.content.trim()) {
      newErrors.content = 'Note content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingNote) {
      // Update existing note
      const updateData: UpdateNoteData = {
        title: formData.title.trim() || undefined,
        content: formData.content.trim(),
      };
      onSubmit(updateData);
    } else {
      // Create new note
      const createData: CreateNoteData = {
        title: formData.title.trim() || undefined,
        content: formData.content.trim(),
        content_type_model: contentType,
        object_id: objectId,
      };
      onSubmit(createData);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 }
      }}
    >
      {open && (
        <>
          <DialogTitle>
            {editingNote ? 'Edit Note' : 'Add New Note'}
          </DialogTitle>
      
          <DialogContent>
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Title (Optional)"
                  value={formData.title}
                  onChange={handleInputChange('title')}
                  error={!!errors.title}
                  helperText={errors.title}
                  placeholder="Enter a brief title for this note"
                  disabled={isLoading}
                />
                
                <TextField
                  fullWidth
                  label="Note Content"
                  value={formData.content}
                  onChange={handleInputChange('content')}
                  error={!!errors.content}
                  helperText={errors.content || 'Enter your note content here'}
                  multiline
                  rows={8}
                  required
                  placeholder="Write your note here..."
                  disabled={isLoading}
                  onKeyDown={handleKeyDown}
                />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    💡 <strong>Tip:</strong> Press Ctrl+Enter (Cmd+Enter on Mac) to save quickly
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={isLoading || !formData.content.trim()}
              startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{ minWidth: 120 }}
            >
              {isLoading ? 'Saving...' : editingNote ? 'Update Note' : 'Add Note'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};