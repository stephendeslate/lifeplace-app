import React from 'react';
import {
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from '@mui/material';
import type { QuestionnaireField } from '@/types/questionnaires.types';

interface QuestionnaireFieldInputProps {
  field: QuestionnaireField;
  value: string;
  editMode: boolean;
  onFieldChange: (fieldId: number, value: string) => void;
}

export const QuestionnaireFieldInput: React.FC<QuestionnaireFieldInputProps> = ({
  field,
  value,
  editMode,
  onFieldChange,
}) => {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone': {
      return (
        <TextField
          fullWidth
          value={value}
          onChange={(e) => onFieldChange(field.id, e.target.value)}
          disabled={!editMode}
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
          placeholder={field.placeholder || (field.type === 'phone' ? '(123) 456-7890' : undefined)}
          required={field.required}
          helperText={field.description}
        />
      );
    }

    case 'number': {
      return (
        <TextField
          fullWidth
          type="number"
          value={value}
          onChange={(e) => onFieldChange(field.id, e.target.value)}
          disabled={!editMode}
          required={field.required}
          placeholder={field.placeholder}
          helperText={field.description}
        />
      );
    }

    case 'date': {
      return (
        <TextField
          fullWidth
          type="date"
          value={value}
          onChange={(e) => onFieldChange(field.id, e.target.value)}
          disabled={!editMode}
          required={field.required}
          InputLabelProps={{ shrink: true }}
          helperText={field.description}
        />
      );
    }

    case 'time': {
      return (
        <TextField
          fullWidth
          type="time"
          value={value}
          onChange={(e) => onFieldChange(field.id, e.target.value)}
          disabled={!editMode}
          required={field.required}
          InputLabelProps={{ shrink: true }}
          helperText={field.description}
        />
      );
    }

    case 'boolean': {
      return (
        <FormControlLabel
          control={
            <Switch
              checked={value === 'true'}
              onChange={(e) => onFieldChange(field.id, e.target.checked ? 'true' : 'false')}
              disabled={!editMode}
            />
          }
          label={value === 'true' ? 'Yes' : 'No'}
        />
      );
    }

    case 'select': {
      return (
        <FormControl fullWidth disabled={!editMode}>
          <Select
            value={value}
            onChange={(e) => onFieldChange(field.id, e.target.value as string)}
            required={field.required}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {field.options?.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    case 'multi-select': {
      const selectedValues = value ? value.split(',') : [];
      return (
        <FormControl fullWidth disabled={!editMode}>
          <Select
            multiple
            value={selectedValues}
            onChange={(e) => {
              const values = e.target.value as string[];
              onFieldChange(field.id, values.join(','));
            }}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} size="small" />
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
        </FormControl>
      );
    }

    default: {
      return (
        <TextField
          fullWidth
          value={value}
          onChange={(e) => onFieldChange(field.id, e.target.value)}
          disabled={!editMode}
          multiline
          rows={3}
          required={field.required}
          placeholder={field.placeholder}
          helperText={field.description}
        />
      );
    }
  }
};
