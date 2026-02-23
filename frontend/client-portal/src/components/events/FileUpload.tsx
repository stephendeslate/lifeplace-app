// frontend/client-portal/src/components/events/FileUpload.tsx

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

interface FileUploadProps {
  eventId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FILE_CATEGORIES = [
  { value: 'REQUIREMENTS', label: 'Requirements Document' },
  { value: 'PHOTO', label: 'Photo' },
  { value: 'OTHER', label: 'Other' },
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.rtf'];

const FileUploadComponent: React.FC<FileUploadProps> = ({ eventId, open, onClose, onSuccess }) => {
  const { useUploadEventFile } = useEvents();
  const uploadMutation = useUploadEventFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState<FileUpload['category']>('OTHER');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Reset form
  const resetForm = () => {
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
    if (!selectedFile || !fileName.trim()) {
      setError('Please select a file and provide a name');
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        eventId,
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
            Upload File
          </Typography>
          <IconButton onClick={handleClose} disabled={uploadMutation.isPending} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* File Selection */}
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<AttachIcon />}
                fullWidth
                disabled={uploadMutation.isPending}
                sx={{ py: 1.5 }}
              >
                {selectedFile ? 'Change File' : 'Select File'}
              </Button>
            </label>
          </Box>

          {/* Selected File Info */}
          {selectedFile && (
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Stack spacing={1}>
                <Typography variant="body2" fontWeight={500}>
                  Selected File:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedFile.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Size: {formatFileSize(selectedFile.size)} • Type: {selectedFile.type || 'Unknown'}
                </Typography>
              </Stack>
            </Paper>
          )}

          {/* File Name */}
          <TextField
            label="File Name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            disabled={uploadMutation.isPending}
            required
            fullWidth
            placeholder="Enter a descriptive name for this file"
            helperText="This name will be shown to identify your file"
          />

          {/* Category */}
          <TextField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as FileUpload['category'])}
            disabled={uploadMutation.isPending}
            required
            select
            fullWidth
            helperText="Select the type of document you're uploading"
          >
            {FILE_CATEGORIES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Description */}
          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploadMutation.isPending}
            multiline
            rows={3}
            fullWidth
            placeholder="Add any additional details about this file..."
            helperText="Optional description to provide context for this file"
          />

          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploading file...
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
          onClick={handleUpload}
          variant="contained"
          startIcon={<UploadIcon />}
          disabled={!selectedFile || !fileName.trim() || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FileUploadComponent;
