// frontend/admin-crm/src/components/common/InlineEditableText.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, TextField, Typography, CircularProgress, Tooltip } from '@mui/material';
import type { TypographyProps } from '@mui/material/Typography';
import { Edit as EditIcon } from '@mui/icons-material';

export interface InlineEditableTextProps {
  /** Current value to display */
  value: string;
  /** Callback when value is saved - should return a promise */
  onSave: (newValue: string) => Promise<void>;
  /** Placeholder text when value is empty */
  placeholder?: string;
  /** Whether the field is required (validation) */
  required?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Allow multiline editing */
  multiline?: boolean;
  /** Typography variant for display mode */
  variant?: TypographyProps['variant'];
  /** Disable editing */
  disabled?: boolean;
  /** Show error state */
  error?: boolean;
  /** Helper text to show below field when editing */
  helperText?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Optional sx props for the container */
  sx?: TypographyProps['sx'];
}

export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onSave,
  placeholder = 'Click to edit',
  required = false,
  maxLength,
  multiline = false,
  variant = 'body2',
  disabled = false,
  error = false,
  helperText,
  'data-testid': testId,
  sx,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync edit value when external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const validate = useCallback(
    (val: string): string | null => {
      if (required && !val.trim()) {
        return 'This field is required';
      }
      if (maxLength && val.length > maxLength) {
        return `Maximum ${maxLength} characters allowed`;
      }
      return null;
    },
    [required, maxLength],
  );

  const handleStartEdit = useCallback(() => {
    if (disabled || isSaving) return;
    setIsEditing(true);
    setEditValue(value);
    setLocalError(null);
  }, [disabled, isSaving, value]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    setLocalError(null);
  }, [value]);

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim();

    // Validate
    const validationError = validate(trimmedValue);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    // Skip save if value hasn't changed
    if (trimmedValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setLocalError(null);

    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setLocalError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, validate, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Enter' && multiline && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleCancel, handleSave, multiline],
  );

  const handleBlur = useCallback(() => {
    // Don't save on blur if there's a validation error - let user fix it
    if (!localError) {
      handleSave();
    }
  }, [handleSave, localError]);

  // Display mode
  if (!isEditing) {
    return (
      <Box
        data-testid={testId}
        onClick={handleStartEdit}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: disabled ? 'default' : 'pointer',
          borderRadius: 0.5,
          px: 0.5,
          py: 0.25,
          mx: -0.5,
          transition: 'all 0.15s ease',
          minHeight: '24px',
          ...(!disabled && {
            '&:hover': {
              backgroundColor: 'action.hover',
              '& .edit-icon': {
                opacity: 1,
              },
            },
          }),
          ...(error && {
            color: 'error.main',
          }),
          ...sx,
        }}
      >
        <Typography
          variant={variant}
          component="span"
          sx={{
            color: value ? 'inherit' : 'text.secondary',
            fontStyle: value ? 'normal' : 'italic',
          }}
        >
          {value || placeholder}
        </Typography>
        {!disabled && (
          <Tooltip title="Click to edit" placement="top">
            <EditIcon
              className="edit-icon"
              sx={{
                fontSize: 14,
                opacity: 0,
                color: 'text.secondary',
                transition: 'opacity 0.15s ease',
              }}
            />
          </Tooltip>
        )}
      </Box>
    );
  }

  // Edit mode
  return (
    <Box
      data-testid={testId}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'flex-start',
        minWidth: 150,
        ...sx,
      }}
    >
      <TextField
        inputRef={inputRef}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          // Clear error when user starts typing
          if (localError) {
            setLocalError(null);
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        error={!!localError || error}
        helperText={localError || helperText}
        multiline={multiline}
        rows={multiline ? 2 : undefined}
        size="small"
        variant="outlined"
        fullWidth
        placeholder={placeholder}
        inputProps={{
          maxLength,
        }}
        InputProps={{
          endAdornment: isSaving ? <CircularProgress size={16} sx={{ ml: 1 }} /> : undefined,
          sx: {
            fontSize: variant === 'body2' ? '0.875rem' : undefined,
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
          },
        }}
      />
    </Box>
  );
};

export default InlineEditableText;
