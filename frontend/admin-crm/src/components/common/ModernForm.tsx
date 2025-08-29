// frontend/admin-crm/src/components/common/ModernForm.tsx

import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  Chip,
  Stack,
  Typography,
  Divider,
  Alert,
  InputAdornment,
} from '@mui/material';
import { tokens } from '../../design-system/tokens';

export interface ModernFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'multiselect' | 'switch' | 'checkbox' | 'radio' | 'textarea';
  value?: any;
  placeholder?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: any; label: string }[];
  multiline?: boolean;
  rows?: number;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  sx?: Record<string, any>;
  show?: boolean;
}

export interface ModernFormSection {
  title?: string;
  description?: string;
  fields: ModernFormField[];
  alert?: {
    severity: 'info' | 'warning' | 'error' | 'success';
    message: string;
  };
}

export interface ModernFormProps {
  sections: ModernFormSection[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit?: (event: React.FormEvent) => void;
  className?: string;
  spacing?: number;
}

export const ModernForm: React.FC<ModernFormProps> = ({
  sections,
  values,
  onChange,
  onSubmit,
  className,
  spacing = 3,
}) => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.(event);
  };

  const renderField = (field: ModernFormField) => {
    if (field.show === false) return null;

    const baseProps = {
      name: field.name,
      label: field.label,
      value: values[field.name] || '',
      disabled: field.disabled,
      required: field.required,
      error: !!field.error,
      helperText: field.error || field.helperText,
      fullWidth: field.fullWidth !== false,
      size: field.size || 'medium' as const,
      sx: field.sx,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
        return (
          <TextField
            {...baseProps}
            type={field.type}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.name, e.target.value)}
            InputProps={{
              startAdornment: field.startAdornment ? (
                <InputAdornment position="start">
                  {field.startAdornment}
                </InputAdornment>
              ) : undefined,
              endAdornment: field.endAdornment ? (
                <InputAdornment position="end">
                  {field.endAdornment}
                </InputAdornment>
              ) : undefined,
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            {...baseProps}
            multiline
            rows={field.rows || 4}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth error={!!field.error} size={field.size || 'medium'}>
            <InputLabel required={field.required}>{field.label}</InputLabel>
            <Select
              value={values[field.name] || ''}
              label={field.label}
              onChange={(e) => onChange(field.name, e.target.value)}
              disabled={field.disabled}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(field.error || field.helperText) && (
              <Typography 
                variant="caption" 
                color={field.error ? 'error' : 'text.secondary'} 
                sx={{ mt: 0.5, ml: 1.5, display: 'block' }}
              >
                {field.error || field.helperText}
              </Typography>
            )}
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl fullWidth error={!!field.error} size={field.size || 'medium'}>
            <InputLabel required={field.required}>{field.label}</InputLabel>
            <Select
              multiple
              value={values[field.name] || []}
              label={field.label}
              onChange={(e) => onChange(field.name, e.target.value)}
              disabled={field.disabled}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as any[]).map((value) => {
                    const option = field.options?.find(opt => opt.value === value);
                    return (
                      <Chip key={value} label={option?.label || value} size="small" />
                    );
                  })}
                </Box>
              )}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(field.error || field.helperText) && (
              <Typography 
                variant="caption" 
                color={field.error ? 'error' : 'text.secondary'} 
                sx={{ mt: 0.5, ml: 1.5, display: 'block' }}
              >
                {field.error || field.helperText}
              </Typography>
            )}
          </FormControl>
        );

      case 'switch':
        return (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={values[field.name] || false}
                  onChange={(e) => onChange(field.name, e.target.checked)}
                  disabled={field.disabled}
                />
              }
              label={field.label}
              sx={field.sx}
            />
            {(field.error || field.helperText) && (
              <Typography 
                variant="caption" 
                color={field.error ? 'error' : 'text.secondary'} 
                sx={{ display: 'block', ml: 1 }}
              >
                {field.error || field.helperText}
              </Typography>
            )}
          </Box>
        );

      case 'checkbox':
        return (
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={values[field.name] || false}
                  onChange={(e) => onChange(field.name, e.target.checked)}
                  disabled={field.disabled}
                />
              }
              label={field.label}
              sx={field.sx}
            />
            {(field.error || field.helperText) && (
              <Typography 
                variant="caption" 
                color={field.error ? 'error' : 'text.secondary'} 
                sx={{ display: 'block', ml: 1 }}
              >
                {field.error || field.helperText}
              </Typography>
            )}
          </Box>
        );

      case 'radio':
        return (
          <FormControl component="fieldset" error={!!field.error}>
            <FormLabel component="legend" required={field.required}>
              {field.label}
            </FormLabel>
            <RadioGroup
              value={values[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio disabled={field.disabled} />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            {(field.error || field.helperText) && (
              <Typography 
                variant="caption" 
                color={field.error ? 'error' : 'text.secondary'} 
                sx={{ mt: 0.5 }}
              >
                {field.error || field.helperText}
              </Typography>
            )}
          </FormControl>
        );

      default:
        return null;
    }
  };

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit} 
      className={className}
      sx={{ width: '100%' }}
    >
      {sections.map((section, sectionIndex) => (
        <Box key={sectionIndex} sx={{ mb: sectionIndex < sections.length - 1 ? 4 : 0 }}>
          {section.title && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {section.title}
              </Typography>
              {section.description && (
                <Typography variant="body2" color="text.secondary">
                  {section.description}
                </Typography>
              )}
            </Box>
          )}

          {section.alert && (
            <Alert 
              severity={section.alert.severity}
              sx={{ 
                mb: 3,
                backdropFilter: 'blur(10px)',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: tokens.spacing.radius.lg,
                border: `1px solid ${tokens.color.borders.glass}`,
              }}
            >
              {section.alert.message}
            </Alert>
          )}

          <Stack spacing={spacing}>
            {section.fields.map((field, fieldIndex) => (
              <Box key={field.name || fieldIndex}>
                {renderField(field)}
              </Box>
            ))}
          </Stack>

          {sectionIndex < sections.length - 1 && (
            <Divider sx={{ mt: 4 }} />
          )}
        </Box>
      ))}
    </Box>
  );
};

// Convenience function to create form sections
export const createFormSection = (
  title: string,
  fields: ModernFormField[],
  options?: {
    description?: string;
    alert?: { severity: 'info' | 'warning' | 'error' | 'success'; message: string };
  }
): ModernFormSection => ({
  title,
  description: options?.description,
  fields,
  alert: options?.alert,
});

export default ModernForm;