import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  InputLabel,
  Chip,
  OutlinedInput,
  LinearProgress,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type {
  QuestionnaireStepConfiguration,
  QuestionnaireField,
  QuestionnaireDetailResponse,
} from '@/types/booking';

interface QuestionnaireFieldRendererProps {
  field: QuestionnaireField;
  questionnaire: QuestionnaireDetailResponse;
  config: QuestionnaireStepConfiguration | null;
  shouldShowField: (
    questionnaire: QuestionnaireDetailResponse,
    field: QuestionnaireField,
  ) => boolean;
  getResponse: (fieldKey: string) => unknown;
  getFieldError: (fieldKey: string) => string | undefined;
  hasFieldError: (fieldKey: string) => boolean;
  validationErrors: Record<string, string[]>;
  handleFieldChange: (fieldId: string, value: unknown) => void;
  handleFileUpload: (fieldId: number, files: File[]) => void;
  isUploading: (fieldId: number) => boolean;
  getUploadError: (fieldId: number) => string | undefined;
  getUploadedFiles: (fieldId: number) => string[];
}

export const QuestionnaireFieldRenderer: React.FC<QuestionnaireFieldRendererProps> = ({
  field,
  questionnaire,
  config,
  shouldShowField,
  getResponse,
  getFieldError,
  hasFieldError,
  validationErrors,
  handleFieldChange,
  handleFileUpload,
  isUploading,
  getUploadError,
  getUploadedFiles,
}) => {
  const fieldKey = `field_${field.id}`;
  const value = getResponse(fieldKey) || '';
  const error = getFieldError(fieldKey) || validationErrors[fieldKey]?.[0];
  const hasError = hasFieldError(fieldKey) || !!validationErrors[fieldKey];

  if (!shouldShowField(questionnaire, field)) {
    return null;
  }

  switch (field.type) {
    case 'text':
      return (
        <TextField
          fullWidth
          label={field.name}
          value={value}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          required={field.required}
          error={hasError}
          helperText={error || field.description || field.description || field.help_text}
          placeholder={field.placeholder}
          multiline={false}
        />
      );

    case 'textarea':
      return (
        <TextField
          fullWidth
          label={field.name}
          value={value}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          required={field.required}
          error={hasError}
          helperText={error || field.description || field.help_text}
          placeholder={field.placeholder}
          multiline
          rows={4}
        />
      );

    case 'number':
      return (
        <TextField
          fullWidth
          type="number"
          label={field.name}
          value={value}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          required={field.required}
          error={hasError}
          helperText={error || field.description || field.help_text}
          placeholder={field.placeholder}
        />
      );

    case 'email':
      return (
        <TextField
          fullWidth
          type="email"
          label={field.name}
          value={value}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          required={field.required}
          error={hasError}
          helperText={error || field.description || field.help_text}
          placeholder={field.placeholder}
        />
      );

    case 'phone':
      return (
        <TextField
          fullWidth
          type="tel"
          label={field.name}
          value={value}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          required={field.required}
          error={hasError}
          helperText={error || field.description || field.help_text}
          placeholder={field.placeholder}
        />
      );

    case 'date':
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={field.name}
            value={value ? new Date(value as string | number | Date) : null}
            onChange={(date) =>
              handleFieldChange(fieldKey, date?.toISOString().split('T')[0] || '')
            }
            slotProps={{
              textField: {
                fullWidth: true,
                required: field.required,
                error: hasError,
                helperText: error || field.description || field.help_text,
              },
            }}
          />
        </LocalizationProvider>
      );

    case 'time':
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <TimePicker
            label={field.name}
            value={value ? new Date(`2000-01-01T${value}`) : null}
            onChange={(time) =>
              handleFieldChange(fieldKey, time?.toTimeString().split(' ')[0] || '')
            }
            slotProps={{
              textField: {
                fullWidth: true,
                required: field.required,
                error: hasError,
                helperText: error || field.description || field.help_text,
              },
            }}
          />
        </LocalizationProvider>
      );

    case 'boolean':
      return (
        <FormControl error={hasError}>
          <FormControlLabel
            control={
              <Checkbox
                checked={value === 'true' || value === true}
                onChange={(e) => handleFieldChange(fieldKey, e.target.checked)}
              />
            }
            label={field.name}
          />
          {(error || field.description || field.help_text) && (
            <FormHelperText>{error || field.description || field.help_text}</FormHelperText>
          )}
        </FormControl>
      );

    case 'select':
      return (
        <FormControl fullWidth error={hasError}>
          <InputLabel>{field.name}</InputLabel>
          <Select
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            label={field.name}
            required={field.required}
          >
            {field.options?.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
          {(error || field.description || field.help_text) && (
            <FormHelperText>{error || field.description || field.help_text}</FormHelperText>
          )}
        </FormControl>
      );

    case 'multi-select':
      return (
        <FormControl fullWidth error={hasError}>
          <InputLabel>{field.name}</InputLabel>
          <Select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            input={<OutlinedInput label={field.name} />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((val) => (
                  <Chip key={val} label={val} size="small" />
                ))}
              </Box>
            )}
            required={field.required}
          >
            {field.options?.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
          {(error || field.description || field.help_text) && (
            <FormHelperText>{error || field.description || field.help_text}</FormHelperText>
          )}
        </FormControl>
      );

    case 'radio':
      return (
        <FormControl error={hasError}>
          <FormLabel component="legend">{field.name}</FormLabel>
          <RadioGroup value={value} onChange={(e) => handleFieldChange(fieldKey, e.target.value)}>
            {field.options?.map((option) => (
              <FormControlLabel key={option} value={option} control={<Radio />} label={option} />
            ))}
          </RadioGroup>
          {(error || field.description || field.help_text) && (
            <FormHelperText>{error || field.description || field.help_text}</FormHelperText>
          )}
        </FormControl>
      );

    case 'file':
      if (!config?.allow_file_uploads) {
        return <Alert severity="info">File uploads are not enabled for this questionnaire</Alert>;
      }

      return (() => {
        const uploadError = getUploadError(field.id);
        const uploading = isUploading(field.id);
        const uploadedFiles = getUploadedFiles(field.id);

        return (
          <FormControl fullWidth error={hasError}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {field.name} {field.required && '*'}
            </Typography>

            <TextField
              type="file"
              fullWidth
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const files = Array.from(e.target.files || []) as File[];
                if (files.length > 0) {
                  // Validate file size
                  const maxSizeMB = config?.max_file_size_mb || 10;
                  const oversizedFiles = files.filter(
                    (file) => file.size > maxSizeMB * 1024 * 1024,
                  );

                  if (oversizedFiles.length > 0) {
                    alert(`Some files are too large. Maximum file size is ${maxSizeMB}MB`);
                    return;
                  }

                  // Validate file types
                  if (config?.allowed_file_types && config.allowed_file_types.length > 0) {
                    const invalidFiles = files.filter((file) => {
                      const fileExt = file.name.split('.').pop()?.toLowerCase();
                      return !fileExt || !config.allowed_file_types.includes(fileExt);
                    });

                    if (invalidFiles.length > 0) {
                      alert(
                        `Some files have invalid types. Allowed types: ${config.allowed_file_types.join(', ')}`,
                      );
                      return;
                    }
                  }

                  handleFileUpload(field.id, files);
                }
              }}
              inputProps={{
                accept: config?.allowed_file_types?.map((ext) => `.${ext}`).join(','),
                multiple: true,
              }}
              error={hasError}
              helperText={
                error ||
                field.description ||
                field.help_text ||
                `Max file size: ${config?.max_file_size_mb || 10}MB`
              }
              disabled={uploading}
            />

            {uploading && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary">
                  Uploading files...
                </Typography>
              </Box>
            )}

            {uploadError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {uploadError}
              </Alert>
            )}

            {uploadedFiles.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Uploaded files: {uploadedFiles.length}
                </Typography>
              </Box>
            )}
          </FormControl>
        );
      })();

    case 'rating':
      return (
        <FormControl fullWidth error={hasError}>
          <FormLabel component="legend">{field.name}</FormLabel>
          <TextField
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, parseInt(e.target.value) || 0)}
            inputProps={{ min: 1, max: 5 }}
            helperText={error || field.description || field.help_text || 'Rate from 1 to 5'}
            error={hasError}
          />
        </FormControl>
      );

    case 'guests': {
      const categories = field.options && field.options.length > 0 ? field.options : null;

      if (categories) {
        const guestValues = typeof value === 'string' && value ? JSON.parse(value) : {};

        return (
          <FormControl fullWidth error={hasError}>
            <FormLabel component="legend">
              {field.name} {field.required && '*'}
            </FormLabel>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {categories.map((category) => (
                <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ minWidth: 100 }}>
                    {category}:
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={guestValues[category] || ''}
                    onChange={(e) => {
                      const newValues = {
                        ...guestValues,
                        [category]: parseInt(e.target.value) || 0,
                      };
                      handleFieldChange(fieldKey, JSON.stringify(newValues));
                    }}
                    inputProps={{ min: 0 }}
                    sx={{ width: 100 }}
                  />
                </Box>
              ))}
            </Box>
            {(error || field.description || field.help_text) && (
              <FormHelperText>{error || field.description || field.help_text}</FormHelperText>
            )}
          </FormControl>
        );
      }

      return (
        <TextField
          fullWidth
          type="number"
          label={field.name}
          value={value}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          required={field.required}
          error={hasError}
          helperText={error || field.description || field.help_text}
          placeholder={field.placeholder || 'Enter total number of guests'}
          inputProps={{ min: 0 }}
        />
      );
    }

    default:
      return <Alert severity="warning">Unsupported field type: {field.type}</Alert>;
  }
};
