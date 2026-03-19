import React from 'react';
import {
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Typography,
  InputAdornment,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { RulesSectionProps } from './types';

export const TimingRulesSection: React.FC<RulesSectionProps> = ({
  formData,
  expanded,
  onToggle,
  onRulesChange,
  onRulesSwitchChange,
}) => (
  <Accordion expanded={expanded} onChange={onToggle}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Check-in/Checkout & Duration</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={2}>
        <Alert severity="info" sx={{ mb: 1 }}>
          These rules define the default timing behavior for events at this venue.
        </Alert>

        <Typography variant="subtitle2" color="text.secondary">
          Default Times
        </Typography>
        <Box display="flex" gap={2}>
          <TextField
            label="Check-in Time"
            type="time"
            value={formData.operating_rules.default_check_in_time}
            onChange={onRulesChange('default_check_in_time')}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Checkout Time"
            type="time"
            value={formData.operating_rules.default_checkout_time}
            onChange={onRulesChange('default_checkout_time')}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.operating_rules.checkout_next_day}
                onChange={onRulesSwitchChange('checkout_next_day')}
              />
            }
            label="Checkout Next Day"
            sx={{ ml: 2 }}
          />
        </Box>

        <Divider />

        <Typography variant="subtitle2" color="text.secondary">
          Program Duration
        </Typography>
        <Box display="flex" gap={2}>
          <TextField
            label="Minimum Hours"
            value={formData.operating_rules.minimum_program_hours}
            onChange={onRulesChange('minimum_program_hours')}
            type="number"
            InputProps={{
              endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
              inputProps: { min: 0, step: 0.5 },
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Maximum Hours"
            value={formData.operating_rules.maximum_program_hours}
            onChange={onRulesChange('maximum_program_hours')}
            type="number"
            InputProps={{
              endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
              inputProps: { min: 0, step: 0.5 },
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Default Hours"
            value={formData.operating_rules.default_program_hours}
            onChange={onRulesChange('default_program_hours')}
            type="number"
            InputProps={{
              endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
              inputProps: { min: 0, step: 0.5 },
            }}
            sx={{ flex: 1 }}
          />
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={formData.operating_rules.is_fixed_duration}
              onChange={onRulesSwitchChange('is_fixed_duration')}
            />
          }
          label="Fixed Duration (user cannot adjust)"
        />
      </Stack>
    </AccordionDetails>
  </Accordion>
);
