// frontend/admin-crm/src/components/common/ImageUploadField.tsx

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
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

export interface ImageUploadFieldProps {
  /** Current value - can be a URL string, File object, or null */
  value: string | File | null;
  /** Callback when image changes */
  onChange: (file: File | null) => void;
  /** Field label */
  label?: string;
  /** Helper text shown below the field */
  helperText?: string;
  /** Error message to display */
  error?: string;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Accepted file types */
  acceptedTypes?: string[];
  /** Aspect ratio for preview (width/height, e.g., 4/3 = 1.33) */
  aspectRatio?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Preview height in pixels */
  previewHeight?: number;
}

const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_SIZE_MB = 5;

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  label,
  helperText,
  error,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  aspectRatio,
  disabled = false,
  previewHeight = 200,
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Get preview URL
  const getPreviewUrl = useCallback((): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof File) return URL.createObjectURL(value);
    return null;
  }, [value]);

  const previewUrl = getPreviewUrl();

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

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setLocalError(null);
    const validationError = validateFile(file);

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setIsLoading(true);
    // Simulate brief loading for UX
    setTimeout(() => {
      onChange(file);
      setIsLoading(false);
    }, 200);
  }, [validateFile, onChange]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

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
      handleFileSelect(files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  // Handle click to select file
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Handle delete
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setLocalError(null);
  }, [onChange]);

  const displayError = error || localError;
  const hasImage = !!previewUrl;

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

      <Paper
        elevation={0}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          position: 'relative',
          height: previewHeight,
          width: aspectRatio ? previewHeight * aspectRatio : '100%',
          maxWidth: '100%',
          border: `2px dashed ${
            displayError
              ? theme.palette.error.main
              : isDragging
                ? theme.palette.primary.main
                : theme.palette.divider
          }`,
          borderRadius: 2,
          cursor: disabled ? 'default' : 'pointer',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          backgroundColor: isDragging
            ? alpha(theme.palette.primary.main, 0.05)
            : hasImage
              ? 'transparent'
              : theme.palette.grey[50],
          '&:hover': disabled ? {} : {
            borderColor: displayError
              ? theme.palette.error.main
              : theme.palette.primary.main,
            backgroundColor: hasImage
              ? 'transparent'
              : alpha(theme.palette.primary.main, 0.05),
          },
        }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {/* Loading overlay */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              zIndex: 2,
            }}
          >
            <CircularProgress size={40} />
          </Box>
        )}

        {/* Image preview or placeholder */}
        {hasImage ? (
          <>
            <Box
              component="img"
              src={previewUrl}
              alt="Preview"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* Delete button */}
            {!disabled && (
              <IconButton
                onClick={handleDelete}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: alpha(theme.palette.error.main, 0.9),
                  color: 'white',
                  '&:hover': {
                    backgroundColor: theme.palette.error.dark,
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              p: 2,
            }}
          >
            {isDragging ? (
              <CloudUploadIcon
                sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 1 }}
              />
            ) : (
              <ImageIcon
                sx={{ fontSize: 48, color: theme.palette.grey[400], mb: 1 }}
              />
            )}
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
            >
              {isDragging
                ? 'Drop image here'
                : 'Click or drag image to upload'}
            </Typography>
            <Typography
              variant="caption"
              color="text.disabled"
              align="center"
              sx={{ mt: 0.5 }}
            >
              {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} up to {maxSizeMB}MB
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Helper text or error */}
      {(helperText || displayError) && (
        <Typography
          variant="caption"
          color={displayError ? 'error' : 'text.secondary'}
          sx={{ mt: 0.5, display: 'block' }}
        >
          {displayError || helperText}
        </Typography>
      )}
    </Box>
  );
};

export default ImageUploadField;
