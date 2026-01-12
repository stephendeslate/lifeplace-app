// frontend/admin-crm/src/components/questionnaires/QuestionnairePreview.tsx

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import {
  CloudUpload as UploadIcon,
  Preview as PreviewIcon,
  Group as GuestsIcon,
} from '@mui/icons-material';
import type { Questionnaire, QuestionnaireField } from '../../types/questionnaires.types';

interface QuestionnairePreviewProps {
  questionnaire: Questionnaire;
  compact?: boolean;
}

export const QuestionnairePreview: React.FC<QuestionnairePreviewProps> = ({
  questionnaire,
  compact = false,
}) => {
  // Helper to wrap field with description
  const withDescription = (fieldElement: React.ReactNode, field: QuestionnaireField) => (
    <Box>
      {fieldElement}
      {field.description && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {field.description}
        </Typography>
      )}
    </Box>
  );

  const renderField = (field: QuestionnaireField) => {
    const isRequired = field.required;
    const label = `${field.name}${isRequired ? ' *' : ''}`;
    const placeholder = field.placeholder || undefined;

    switch (field.type) {
      case 'text':
        return withDescription(
          <TextField
            fullWidth
            label={label}
            placeholder={placeholder || `Enter ${field.name.toLowerCase()}`}
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />,
          field
        );

      case 'number':
        return withDescription(
          <TextField
            fullWidth
            label={label}
            type="number"
            placeholder={placeholder || '0'}
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />,
          field
        );

      case 'email':
        return withDescription(
          <TextField
            fullWidth
            label={label}
            type="email"
            placeholder={placeholder || 'example@email.com'}
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />,
          field
        );

      case 'phone':
        return withDescription(
          <TextField
            fullWidth
            label={label}
            type="tel"
            placeholder={placeholder || '+1 (555) 123-4567'}
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />,
          field
        );

      case 'date':
        return withDescription(
          <DatePicker
            label={label}
            disabled
            slotProps={{
              textField: {
                fullWidth: true,
                required: isRequired,
                size: compact ? 'small' : 'medium',
              }
            }}
          />,
          field
        );

      case 'time':
        return withDescription(
          <TimePicker
            label={label}
            disabled
            slotProps={{
              textField: {
                fullWidth: true,
                required: isRequired,
                size: compact ? 'small' : 'medium',
              }
            }}
          />,
          field
        );

      case 'boolean':
        return withDescription(
          <FormControlLabel
            control={<Checkbox disabled />}
            label={label}
            sx={{ alignItems: 'flex-start' }}
          />,
          field
        );

      case 'select':
        return withDescription(
          <FormControl fullWidth size={compact ? 'small' : 'medium'}>
            <InputLabel>{label}</InputLabel>
            <Select
              label={label}
              required={isRequired}
              disabled
            >
              {field.options?.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>,
          field
        );

      case 'multi-select':
        return withDescription(
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Stack spacing={1}>
              {field.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  control={<Checkbox disabled size="small" />}
                  label={option}
                />
              ))}
            </Stack>
          </Box>,
          field
        );

      case 'file':
        return withDescription(
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {label}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              disabled
              fullWidth
              sx={{
                justifyContent: 'flex-start',
                color: 'text.disabled',
                borderColor: 'text.disabled',
              }}
            >
              Choose file to upload
            </Button>
            {(field.max_file_size_mb || field.allowed_file_types?.length > 0) && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {field.allowed_file_types?.length > 0 && `Allowed: ${field.allowed_file_types.join(', ')}`}
                {field.allowed_file_types?.length > 0 && field.max_file_size_mb && ' • '}
                {field.max_file_size_mb && `Max size: ${field.max_file_size_mb}MB`}
                {field.max_files > 1 && ` • Up to ${field.max_files} files`}
              </Typography>
            )}
          </Box>,
          field
        );

      case 'guests':
        return withDescription(
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <GuestsIcon color="primary" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
            </Box>
            {field.options && field.options.length > 0 ? (
              <Stack spacing={1}>
                {field.options.map((category, index) => (
                  <Box key={index} display="flex" alignItems="center" gap={2}>
                    <Typography variant="body2" sx={{ minWidth: 100 }}>
                      {category}:
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      disabled
                      placeholder="0"
                      sx={{ width: 80 }}
                      inputProps={{ min: 0 }}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <TextField
                fullWidth
                type="number"
                placeholder={placeholder || 'Total guests'}
                disabled
                size={compact ? 'small' : 'medium'}
                inputProps={{ min: 0 }}
              />
            )}
          </Box>,
          field
        );

      default:
        return withDescription(
          <TextField
            fullWidth
            label={label}
            placeholder={placeholder || 'Text input'}
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />,
          field
        );
    }
  };

  if (!questionnaire.fields || questionnaire.fields.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <PreviewIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Fields to Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add fields to this questionnaire to see the preview
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        {/* Questionnaire Header */}
        <Box mb={3}>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <PreviewIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              {questionnaire.name}
            </Typography>
            {!questionnaire.is_active && (
              <Chip label="Inactive" size="small" color="default" />
            )}
          </Box>
          
          {questionnaire.event_type_name && (
            <Chip
              label={`For: ${questionnaire.event_type_name}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Form Fields */}
        <Stack spacing={compact ? 2 : 3}>
          {questionnaire.fields
            ?.sort((a, b) => a.order - b.order)
            .map((field) => (
              <Box key={field.id}>
                {renderField(field)}
              </Box>
            ))}
        </Stack>

        {/* Submit Button Preview */}
        <Box mt={4} pt={3} borderTop={1} borderColor="divider">
          <Button
            variant="contained"
            size="large"
            disabled
            fullWidth={compact}
          >
            Submit Questionnaire
          </Button>
        </Box>

        {/* Preview Notice */}
        <Box mt={2}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            This is a preview - form interactions are disabled
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};