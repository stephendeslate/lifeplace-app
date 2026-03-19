import React from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Typography,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { RulesSectionProps } from './types';

export const TimeConstraintsSection: React.FC<RulesSectionProps> = ({
  formData,
  expanded,
  onToggle,
  onRulesChange,
  onRulesSwitchChange,
}) => (
  <Accordion expanded={expanded} onChange={onToggle}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Time Constraints</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={2}>
        <Box display="flex" gap={2}>
          <TextField
            label="Earliest Start Time"
            type="time"
            value={formData.operating_rules.earliest_start_time}
            onChange={onRulesChange('earliest_start_time')}
            InputLabelProps={{ shrink: true }}
            helperText="Earliest program can start"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Latest End Time"
            type="time"
            value={formData.operating_rules.latest_end_time}
            onChange={onRulesChange('latest_end_time')}
            InputLabelProps={{ shrink: true }}
            helperText="Music curfew / latest end"
            sx={{ flex: 1 }}
          />
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          <TextField
            label="Hard Cutoff Time"
            type="time"
            value={formData.operating_rules.hard_cutoff_time}
            onChange={onRulesChange('hard_cutoff_time')}
            InputLabelProps={{ shrink: true }}
            helperText="Absolute latest (all activities must end)"
            sx={{ flex: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.operating_rules.hard_cutoff_next_day}
                onChange={onRulesSwitchChange('hard_cutoff_next_day')}
              />
            }
            label="Cutoff Next Day"
          />
        </Box>

        <TextField
          label="Early Access Minutes"
          value={formData.operating_rules.early_access_minutes}
          onChange={onRulesChange('early_access_minutes')}
          type="number"
          InputProps={{
            endAdornment: <InputAdornment position="end">min</InputAdornment>,
            inputProps: { min: 0 },
          }}
          helperText="Minutes before booked time guests can arrive"
          sx={{ width: 200 }}
        />
      </Stack>
    </AccordionDetails>
  </Accordion>
);
