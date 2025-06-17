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
  const renderField = (field: QuestionnaireField) => {
    const isRequired = field.required;
    const label = `${field.name}${isRequired ? ' *' : ''}`;

    switch (field.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={label}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            label={label}
            type="number"
            placeholder="0"
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />
        );

      case 'email':
        return (
          <TextField
            fullWidth
            label={label}
            type="email"
            placeholder="example@email.com"
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />
        );

      case 'phone':
        return (
          <TextField
            fullWidth
            label={label}
            type="tel"
            placeholder="+1 (555) 123-4567"
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />
        );

      case 'date':
        return (
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
          />
        );

      case 'time':
        return (
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
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={<Checkbox disabled />}
            label={label}
            sx={{ alignItems: 'flex-start' }}
          />
        );

      case 'select':
        return (
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
          </FormControl>
        );

      case 'multi-select':
        return (
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
          </Box>
        );

      case 'file':
        return (
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
          </Box>
        );

      default:
        return (
          <TextField
            fullWidth
            label={label}
            placeholder="Text input"
            required={isRequired}
            disabled
            size={compact ? 'small' : 'medium'}
          />
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