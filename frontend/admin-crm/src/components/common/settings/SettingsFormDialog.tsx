// frontend/admin-crm/src/components/common/settings/SettingsFormDialog.tsx

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Alert,
  Typography,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { 
  ModernDialog,
  ModernForm,
  createDeleteActions,
  type ModernFormSection,
  type ModernDialogAction,
} from '../';

export interface SettingsFormDialogProps<T = Record<string, unknown>> {
  // Dialog state
  open: boolean;
  onClose: () => void;
  
  // Form configuration
  title: string;
  subtitle?: string;
  sections: ModernFormSection[];
  
  // Data
  item?: T | null; // Item to edit (null/undefined for create)
  defaultValues: T;
  
  // Actions
  onSubmit: (data: T) => Promise<void>;
  onDelete?: (item: T) => Promise<void>;
  
  // Validation
  validate?: (data: T) => Record<string, string>;
  
  // UI Configuration
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showDelete?: boolean;
  
  // Loading states
  isSubmitting?: boolean;
  isDeleting?: boolean;
  
  // Custom actions
  customActions?: ModernDialogAction[];
}

export const SettingsFormDialog = <T extends Record<string, unknown>>({
  open,
  onClose,
  title,
  subtitle,
  sections,
  item,
  defaultValues,
  onSubmit,
  onDelete,
  validate,
  maxWidth = 'md',
  showDelete = false,
  isSubmitting = false,
  isDeleting = false,
  customActions = [],
}: SettingsFormDialogProps<T>) => {
  const [formValues, setFormValues] = useState<T>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  const isEditing = Boolean(item);
  const isLoading = isSubmitting || isDeleting;

  // Initialize form values when dialog opens or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        setFormValues({ ...defaultValues, ...item });
      } else {
        setFormValues(defaultValues);
      }
      setErrors({});
      setSubmitError('');
    }
  }, [open, item, defaultValues]);

  const handleFormChange = useCallback((name: string, value: unknown) => {
    setFormValues(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when user starts changing the value
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  }, [errors]);

  const handleSubmit = async () => {
    try {
      setSubmitError('');

      // Run validation
      if (validate) {
        const validationErrors = validate(formValues);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      // Clear any existing errors
      setErrors({});

      // Submit the form
      await onSubmit(formValues);
      
      // Close dialog on success
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'An error occurred while saving. Please try again.'
      );
    }
  };

  const handleDelete = async () => {
    if (!item || !onDelete) return;

    try {
      setSubmitError('');
      await onDelete(item);
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'An error occurred while deleting. Please try again.'
      );
    }
  };

  // Build dialog actions
  const actions: ModernDialogAction[] = [
    // Cancel action
    {
      label: 'Cancel',
      onClick: onClose,
      variant: 'outlined',
      disabled: isLoading,
      startIcon: <CancelIcon />,
    },
    
    // Custom actions
    ...customActions,
    
    // Delete action (if enabled and editing)
    ...(showDelete && isEditing && onDelete ? createDeleteActions(
      onClose,
      handleDelete,
      isDeleting
    ) : []),
    
    // Save action
    {
      label: isEditing ? 'Save Changes' : `Create ${title}`,
      onClick: handleSubmit,
      variant: 'contained',
      color: 'primary',
      disabled: isLoading,
      loading: isSubmitting,
      startIcon: <SaveIcon />,
    },
  ];

  return (
    <ModernDialog
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit ${title}` : `Create ${title}`}
      maxWidth={maxWidth}
      fullWidth
      actions={actions}
      disableBackdropClick={isLoading}
      disableEscapeKeyDown={isLoading}
    >
      <Box>
        {subtitle && (
          <>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              {subtitle}
            </Typography>
            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {submitError && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setSubmitError('')}
          >
            {submitError}
          </Alert>
        )}

        <ModernForm
          sections={sections.map(section => ({
            ...section,
            fields: section.fields.map(field => ({
              ...field,
              error: errors[field.name] || field.error
            }))
          }))}
          values={formValues}
          onChange={handleFormChange}
          disabled={isLoading}
        />
      </Box>
    </ModernDialog>
  );
};

export default SettingsFormDialog;