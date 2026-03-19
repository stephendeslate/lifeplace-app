import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import type { CreateWorkflowStageData, StageType } from '@/types/workflows';
import { STAGE_TYPES } from '@/types/workflows';

interface StageInfoSectionProps {
  formData: CreateWorkflowStageData;
  errors: Record<string, string>;
  isEditing: boolean;
  onInputChange: (
    field: keyof CreateWorkflowStageData,
    value: string | boolean | number | null,
  ) => void;
}

export const StageInfoSection: React.FC<StageInfoSectionProps> = ({
  formData,
  errors,
  isEditing,
  onInputChange,
}) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Stage Information
    </Typography>

    <Stack spacing={2}>
      <TextField
        fullWidth
        label="Stage Name"
        value={formData.name}
        onChange={(e) => onInputChange('name', e.target.value)}
        error={!!errors.name}
        helperText={errors.name || 'A descriptive name for this stage'}
        required
      />

      <Box display="flex" gap={2}>
        <FormControl fullWidth>
          <InputLabel>Stage Type</InputLabel>
          <Select
            value={formData.stage}
            label="Stage Type"
            onChange={(e) => onInputChange('stage', e.target.value as StageType)}
          >
            {STAGE_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isEditing ? (
          <TextField
            label="Order"
            value={formData.order}
            onChange={(e) => onInputChange('order', parseInt(e.target.value) || 1)}
            error={!!errors.order}
            helperText={errors.order || 'Changing order may reorder other stages'}
            type="number"
            sx={{ minWidth: 120 }}
          />
        ) : (
          <TextField
            label="Order"
            value="Auto"
            disabled
            helperText="Order is automatically assigned"
            sx={{ minWidth: 120 }}
          />
        )}
      </Box>

      <TextField
        fullWidth
        label="Task Description"
        value={formData.task_description}
        onChange={(e) => onInputChange('task_description', e.target.value)}
        multiline
        rows={2}
        helperText="Description of what happens in this stage"
      />
    </Stack>
  </Box>
);
