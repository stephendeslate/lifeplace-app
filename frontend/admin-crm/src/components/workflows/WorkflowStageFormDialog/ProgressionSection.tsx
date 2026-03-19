import React from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormControlLabel,
  Switch,
  Typography,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ListSubheader,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { CreateWorkflowStageData } from '@/types/workflows';
import { PROGRESSION_CONDITIONS } from '@/types/workflows';

interface ProgressionSectionProps {
  formData: CreateWorkflowStageData;
  onInputChange: (
    field: keyof CreateWorkflowStageData,
    value: string | boolean | number | null,
  ) => void;
}

export const ProgressionSection: React.FC<ProgressionSectionProps> = ({
  formData,
  onInputChange,
}) => (
  <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Progression Settings</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={2}>
        <FormControl fullWidth>
          <InputLabel>Progression Condition</InputLabel>
          <Select
            value={formData.progression_condition}
            label="Progression Condition"
            onChange={(e) => onInputChange('progression_condition', e.target.value)}
          >
            <ListSubheader>Manual</ListSubheader>
            {PROGRESSION_CONDITIONS.filter((c) => c.category === 'manual').map((condition) => (
              <MenuItem key={condition.value} value={condition.value}>
                {condition.label}
              </MenuItem>
            ))}
            <ListSubheader>Event-Based</ListSubheader>
            {PROGRESSION_CONDITIONS.filter((c) => c.category === 'event').map((condition) => (
              <MenuItem key={condition.value} value={condition.value}>
                {condition.label}
              </MenuItem>
            ))}
            <ListSubheader>Time-Based</ListSubheader>
            {PROGRESSION_CONDITIONS.filter((c) => c.category === 'time').map((condition) => (
              <MenuItem key={condition.value} value={condition.value}>
                {condition.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={formData.required_tasks_completed}
              onChange={(e) => onInputChange('required_tasks_completed', e.target.checked)}
            />
          }
          label="Require all tasks to be completed before progressing"
        />

        <Alert severity="info">
          Progression conditions determine when an event automatically moves to the next stage. If
          no condition is set, progression will be manual.
        </Alert>
      </Stack>
    </AccordionDetails>
  </Accordion>
);
