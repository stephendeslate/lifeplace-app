import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  IconButton,
  Stack,
  Button,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import type {
  QuestionnaireFieldFormData,
  QuestionnaireFieldType,
} from '@/types/questionnaires.types';
import { QUESTIONNAIRE_FIELD_TYPES } from '@/types/questionnaires.types';

interface FieldEditorProps {
  field: QuestionnaireFieldFormData;
  fieldIndex: number;
  errors: Partial<{ [key: string]: string }>;
  onFieldChange: (index: number, field: keyof QuestionnaireFieldFormData, value: unknown) => void;
  onRemoveField: (index: number) => void;
  onOptionChange: (fieldIndex: number, optionIndex: number, value: string) => void;
  onAddOption: (fieldIndex: number) => void;
  onRemoveOption: (fieldIndex: number, optionIndex: number) => void;
  requiresOptions: (type: QuestionnaireFieldType) => boolean;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  fieldIndex,
  errors,
  onFieldChange,
  onRemoveField,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  requiresOptions,
}) => {
  return (
    <Box>
      <Stack spacing={2}>
        <TextField
          fullWidth
          label="Field Name"
          value={field.name}
          onChange={(e) => onFieldChange(fieldIndex, 'name', e.target.value)}
          error={!!errors[`field_${fieldIndex}_name`]}
          helperText={errors[`field_${fieldIndex}_name`]}
          required
          size="small"
        />

        <Box display="flex" gap={2}>
          <FormControl sx={{ flex: 1 }} size="small">
            <InputLabel>Field Type</InputLabel>
            <Select
              value={field.type}
              onChange={(e) => onFieldChange(fieldIndex, 'type', e.target.value)}
              label="Field Type"
            >
              {QUESTIONNAIRE_FIELD_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={field.required}
                  onChange={(e) => onFieldChange(fieldIndex, 'required', e.target.checked)}
                />
              }
              label="Required"
            />
          </Box>

          <IconButton
            size="small"
            color="error"
            onClick={() => onRemoveField(fieldIndex)}
            sx={{ alignSelf: 'center' }}
          >
            <RemoveIcon />
          </IconButton>
        </Box>

        {requiresOptions(field.type) && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">Options</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => onAddOption(fieldIndex)}>
                Add Option
              </Button>
            </Box>

            {field.options.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 1 }}>
                At least one option is required for select fields.
              </Alert>
            ) : (
              <Stack spacing={1}>
                {field.options.map((option, optionIndex) => (
                  <Box key={optionIndex} display="flex" gap={1}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={`Option ${optionIndex + 1}`}
                      value={option}
                      onChange={(e) => onOptionChange(fieldIndex, optionIndex, e.target.value)}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onRemoveOption(fieldIndex, optionIndex)}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}

            {errors[`field_${fieldIndex}_options`] && (
              <Typography variant="caption" color="error">
                {errors[`field_${fieldIndex}_options`]}
              </Typography>
            )}
          </Box>
        )}
      </Stack>
    </Box>
  );
};
