import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Stack,
  Alert,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import type { CustomField } from './types';
import { FIELD_TYPES } from './types';

interface CustomFieldDialogProps {
  open: boolean;
  onClose: () => void;
  editingField: CustomField | null;
  onSave: (field: CustomField) => void;
  disabled?: boolean;
}

export const CustomFieldDialog: React.FC<CustomFieldDialogProps> = ({
  open,
  onClose,
  editingField,
  onSave,
  disabled = false,
}) => {
  const [fieldData, setFieldData] = useState<Omit<CustomField, 'id'>>({
    name: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [newOption, setNewOption] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingField) {
      setFieldData({
        name: editingField.name,
        type: editingField.type,
        required: editingField.required,
        options: editingField.options || [],
      });
    } else {
      setFieldData({
        name: '',
        type: 'text',
        required: false,
        options: [],
      });
    }
    setErrors({});
  }, [editingField, open]);

  const validateField = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fieldData.name.trim()) {
      newErrors.name = 'Field name is required';
    }

    if (fieldData.type === 'select' && (!fieldData.options || fieldData.options.length === 0)) {
      newErrors.options = 'Select fields must have at least one option';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateField()) return;

    onSave({
      id: editingField?.id || '',
      name: fieldData.name.trim(),
      type: fieldData.type,
      required: fieldData.required,
      options: fieldData.type === 'select' ? fieldData.options : undefined,
    });
  };

  const handleAddOption = () => {
    if (newOption.trim() && !fieldData.options?.includes(newOption.trim())) {
      setFieldData((prev) => ({
        ...prev,
        options: [...(prev.options || []), newOption.trim()],
      }));
      setNewOption('');
      if (errors.options) {
        setErrors((prev) => ({ ...prev, options: '' }));
      }
    }
  };

  const handleRemoveOption = (optionToRemove: string) => {
    setFieldData((prev) => ({
      ...prev,
      options: prev.options?.filter((option) => option !== optionToRemove) || [],
    }));
  };

  const handleTypeChange = (newType: string) => {
    setFieldData((prev) => ({
      ...prev,
      type: newType,
      options: newType === 'select' ? prev.options : [],
    }));
    setErrors({});
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableEscapeKeyDown={disabled}>
      <DialogTitle>{editingField ? 'Edit Custom Field' : 'Add Custom Field'}</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Field Name"
            value={fieldData.name}
            onChange={(e) => {
              setFieldData((prev) => ({ ...prev, name: e.target.value }));
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: '' }));
              }
            }}
            error={!!errors.name}
            helperText={errors.name}
            required
            disabled={disabled}
          />

          <FormControl fullWidth disabled={disabled}>
            <InputLabel>Field Type</InputLabel>
            <Select
              value={fieldData.type}
              label="Field Type"
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              {FIELD_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={fieldData.required}
                onChange={(e) => setFieldData((prev) => ({ ...prev, required: e.target.checked }))}
                disabled={disabled}
              />
            }
            label="Required Field"
          />

          {fieldData.type === 'select' && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Select Options
              </Typography>

              <Box display="flex" gap={1} mb={2}>
                <TextField
                  size="small"
                  placeholder="Add option..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
                  sx={{ flex: 1 }}
                  disabled={disabled}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddOption}
                  disabled={!newOption.trim() || disabled}
                >
                  Add
                </Button>
              </Box>

              {errors.options && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.options}
                </Alert>
              )}

              {fieldData.options && fieldData.options.length > 0 ? (
                <List dense>
                  {fieldData.options.map((option, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: 'background.paper',
                      }}
                    >
                      <ListItemText primary={option} />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveOption(option)}
                          size="small"
                          color="error"
                          disabled={disabled}
                          aria-label={`Remove option ${option}`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No options added
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={disabled}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!fieldData.name.trim() || disabled}
        >
          {editingField ? 'Update' : 'Add'} Field
        </Button>
      </DialogActions>
    </Dialog>
  );
};
