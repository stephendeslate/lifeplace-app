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
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { RulesSectionProps } from './types';

export const EarlyLateFeesSection: React.FC<RulesSectionProps> = ({
  formData,
  expanded,
  onToggle,
  onRulesChange,
  onRulesSwitchChange,
}) => (
  <Accordion expanded={expanded} onChange={onToggle}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Early Check-in & Late Checkout</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={3}>
        {/* Early Check-in */}
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={formData.operating_rules.early_checkin_allowed}
                onChange={onRulesSwitchChange('early_checkin_allowed')}
              />
            }
            label="Allow Early Check-in"
          />
          {formData.operating_rules.early_checkin_allowed && (
            <Box display="flex" gap={2} mt={1}>
              <TextField
                label="Fee per Hour"
                value={formData.operating_rules.early_checkin_fee_per_hour}
                onChange={onRulesChange('early_checkin_fee_per_hour')}
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">&#8369;</InputAdornment>,
                  inputProps: { min: 0 },
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Earliest Allowed"
                type="time"
                value={formData.operating_rules.earliest_checkin_time}
                onChange={onRulesChange('earliest_checkin_time')}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Box>
          )}
        </Box>

        <Divider />

        {/* Late Checkout */}
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={formData.operating_rules.late_checkout_allowed}
                onChange={onRulesSwitchChange('late_checkout_allowed')}
              />
            }
            label="Allow Late Checkout"
          />
          {formData.operating_rules.late_checkout_allowed && (
            <Box display="flex" gap={2} mt={1}>
              <TextField
                label="Fee per Hour"
                value={formData.operating_rules.late_checkout_fee_per_hour}
                onChange={onRulesChange('late_checkout_fee_per_hour')}
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">&#8369;</InputAdornment>,
                  inputProps: { min: 0 },
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Max Hours"
                value={formData.operating_rules.late_checkout_max_hours}
                onChange={onRulesChange('late_checkout_max_hours')}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                  inputProps: { min: 1 },
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Latest Allowed"
                type="time"
                value={formData.operating_rules.latest_checkout_time}
                onChange={onRulesChange('latest_checkout_time')}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
            </Box>
          )}
        </Box>
      </Stack>
    </AccordionDetails>
  </Accordion>
);
