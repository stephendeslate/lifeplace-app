// frontend/client-portal/src/components/documents/DocumentUploadDialog.tsx

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Alert,
  Stack,
  Typography,
  LinearProgress,
  IconButton,
  Paper,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  AttachFile as AttachIcon,
} from '@mui/icons-material';
import { useEvents } from '../../hooks/useEvents';
import type { FileUpload } from '../../types/events.types';
import type { DocumentEventOption } from '../../types/documents.types';

interface DocumentUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventOptions: DocumentEventOption[];
  defaultEventId?: number;
}

const FILE_CATEGORIES = [
  { value: 'REQUIREMENTS', label: 'Requirements Document' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'OTHER', label: 'Other' },
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.rtf'];

export const DocumentUploadDialog: React.FC<DocumentUploadDialogProps> = ({
  open,
  onClose,
  onSuccess,
  eventOptions,
  defaultEventId,
}) => {
  const { useUploadEventFile } = useEvents();
  const uploadMutation = useUploadEventFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedEventId, setSelectedEventId] = useState<number | ''>(defaultEventId || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState<FileUpload['category']>('OTHER');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Reset form
  const resetForm = () => {
    setSelectedEventId(defaultEventId || '');
    setSelectedFile(null);
    setFileName('');
    setCategory('OTHER');
    setDescription('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!uploadMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Validate file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError(`File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    setSelectedFile(file);
    setFileName(file.name.replace(/\.[^/.]+$/, ''));
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedEventId) {
      setError('Please select an event');
      return;
    }
    if (!selectedFile || !fileName.trim()) {
      setError('Please select a file and provide a name');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        eventId: selectedEventId as number,
        data: {
          name: fileName.trim(),
          category,
          description: description.trim(),
          file: selectedFile,
        },
      });

      resetForm();
      onSuccess();
      onClose();
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={uploadMutation.isPending}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div">
            Upload Document
          </Typography>
          <IconButton
            size="small"
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Error Message */}
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Event Selection */}
          <TextField
            select
            label="Select Event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : '')}
            required
            fullWidth
            disabled={uploadMutation.isPending}
            helperText="Choose which event this document belongs to"
          >
            {eventOptions.length === 0 ? (
              <MenuItem value="" disabled>
                No events available
              </MenuItem>
            ) : (
              eventOptions.map((event) => (
                <MenuItem key={event.id} value={event.id}>
                  {event.name}
                </MenuItem>
              ))
            )}
          </TextField>

          {/* File Selection */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              backgroundColor: selectedFile ? 'success.50' : 'grey.50',
              borderStyle: 'dashed',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept={ALLOWED_EXTENSIONS.join(',')}
              style={{ display: 'none' }}
              disabled={uploadMutation.isPending}
            />
            {selectedFile ? (
              <Stack spacing={1} alignItems="center">
                <AttachIcon color="success" sx={{ fontSize: 32 }} />
                <Typography variant="body1" fontWeight={500}>
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(selectedFile.size)}
                </Typography>
                <Button
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setFileName('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={uploadMutation.isPending}
                >
                  Change File
                </Button>
              </Stack>
            ) : (
              <Stack spacing={1} alignItems="center">
                <UploadIcon color="action" sx={{ fontSize: 40 }} />
                <Typography variant="body1">Click to select a file</Typography>
                <Typography variant="caption" color="text.secondary">
                  PDF, DOC, DOCX, JPG, PNG, TXT (max 10MB)
                </Typography>
              </Stack>
            )}
          </Paper>

          {/* File Name */}
          <TextField
            label="Document Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            required
            fullWidth
            disabled={uploadMutation.isPending || !selectedFile}
            placeholder="Enter a name for this document"
          />

          {/* Category */}
          <TextField
            select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as FileUpload['category'])}
            fullWidth
            disabled={uploadMutation.isPending}
          >
            {FILE_CATEGORIES.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Description */}
          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={uploadMutation.isPending}
            placeholder="Add a description for this document"
          />

          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Uploading...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={uploadMutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={
            !selectedFile || !fileName.trim() || !selectedEventId || uploadMutation.isPending
          }
          startIcon={<UploadIcon />}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUploadDialog;
