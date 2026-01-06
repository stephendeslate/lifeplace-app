// frontend/admin-crm/src/components/common/GalleryUploadField.tsx

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';

export interface GalleryUploadFieldProps {
  /** Current value - array of URL strings or File objects */
  value: (string | File)[];
  /** Callback when gallery changes */
  onChange: (files: (string | File)[]) => void;
  /** Field label */
  label?: string;
  /** Helper text shown below the field */
  helperText?: string;
  /** Maximum number of images */
  maxImages?: number;
  /** Maximum file size in MB per image */
  maxSizeMB?: number;
  /** Accepted file types */
  acceptedTypes?: string[];
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Thumbnail size in pixels */
  thumbnailSize?: number;
}

const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_MAX_IMAGES = 10;
const DEFAULT_THUMBNAIL_SIZE = 120;

export const GalleryUploadField: React.FC<GalleryUploadFieldProps> = ({
  value = [],
  onChange,
  label,
  helperText,
  maxImages = DEFAULT_MAX_IMAGES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  thumbnailSize = DEFAULT_THUMBNAIL_SIZE,
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get preview URL for an item
  const getPreviewUrl = useCallback((item: string | File): string => {
    if (typeof item === 'string') return item;
    if (item instanceof File) return URL.createObjectURL(item);
    return '';
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Accepted: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }

    return null;
  }, [acceptedTypes, maxSizeMB]);

  // Handle file selection (multiple files)
  const handleFilesSelect = useCallback((files: FileList) => {
    setError(null);

    const remainingSlots = maxImages - value.length;
    if (remainingSlots <= 0) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const newFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      const validationError = validateFile(file);

      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        newFiles.push(file);
      }
    }

    if (files.length > remainingSlots) {
      errors.push(`Only ${remainingSlots} more image(s) can be added`);
    }

    if (errors.length > 0) {
      setError(errors.join('. '));
    }

    if (newFiles.length > 0) {
      setIsLoading(true);
      setTimeout(() => {
        onChange([...value, ...newFiles]);
        setIsLoading(false);
      }, 200);
    }
  }, [value, maxImages, validateFile, onChange]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesSelect(files);
    }
  }, [disabled, handleFilesSelect]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFilesSelect]);

  // Handle add button click
  const handleAddClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Handle delete
  const handleDelete = useCallback((index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
    setError(null);
  }, [value, onChange]);

  const canAddMore = value.length < maxImages && !disabled;

  return (
    <Box>
      {label && (
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1, fontWeight: 500 }}
        >
          {label}
        </Typography>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
        multiple
      />

      {/* Gallery grid */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        {/* Existing images */}
        {value.map((item, index) => (
          <Paper
            key={index}
            elevation={0}
            sx={{
              position: 'relative',
              width: thumbnailSize,
              height: thumbnailSize,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src={getPreviewUrl(item)}
              alt={`Gallery image ${index + 1}`}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {!disabled && (
              <IconButton
                onClick={() => handleDelete(index)}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: alpha(theme.palette.error.main, 0.9),
                  color: 'white',
                  width: 24,
                  height: 24,
                  '&:hover': {
                    backgroundColor: theme.palette.error.dark,
                  },
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Paper>
        ))}

        {/* Add button / Drop zone */}
        {canAddMore && (
          <Paper
            elevation={0}
            onClick={handleAddClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            sx={{
              width: thumbnailSize,
              height: thumbnailSize,
              border: `2px dashed ${
                isDragging
                  ? theme.palette.primary.main
                  : theme.palette.divider
              }`,
              borderRadius: 1,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              backgroundColor: isDragging
                ? alpha(theme.palette.primary.main, 0.05)
                : theme.palette.grey[50],
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} />
            ) : isDragging ? (
              <CloudUploadIcon
                sx={{ fontSize: 32, color: theme.palette.primary.main }}
              />
            ) : (
              <>
                <AddIcon
                  sx={{ fontSize: 28, color: theme.palette.grey[500] }}
                />
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ mt: 0.5 }}
                >
                  Add
                </Typography>
              </>
            )}
          </Paper>
        )}

        {/* Empty state */}
        {value.length === 0 && !canAddMore && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 2,
              border: `1px dashed ${theme.palette.divider}`,
              borderRadius: 1,
              color: 'text.disabled',
            }}
          >
            <ImageIcon />
            <Typography variant="body2">No images</Typography>
          </Box>
        )}
      </Box>

      {/* Count and helper text */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography
          variant="caption"
          color={error ? 'error' : 'text.secondary'}
        >
          {error || helperText}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {value.length} / {maxImages}
        </Typography>
      </Box>
    </Box>
  );
};

export default GalleryUploadField;
