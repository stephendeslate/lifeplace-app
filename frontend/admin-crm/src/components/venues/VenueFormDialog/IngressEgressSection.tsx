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
  Alert,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { RulesSectionProps } from './types';

export const IngressEgressSection: React.FC<RulesSectionProps> = ({
  formData,
  expanded,
  onToggle,
  onRulesChange,
  onRulesSwitchChange,
}) => (
  <Accordion expanded={expanded} onChange={onToggle}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="h6">Ingress & Egress (Setup/Teardown)</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={2}>
        <Alert severity="info" sx={{ mb: 1 }}>
          Ingress is setup time before the program. Egress is teardown time after.
        </Alert>

        <Box display="flex" gap={2}>
          <TextField
            label="Default Ingress"
            value={formData.operating_rules.ingress_hours}
            onChange={onRulesChange('ingress_hours')}
            type="number"
            InputProps={{
              endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
              inputProps: { min: 0, step: 0.5 },
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Default Egress"
            value={formData.operating_rules.egress_hours}
            onChange={onRulesChange('egress_hours')}
            type="number"
            InputProps={{
              endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
              inputProps: { min: 0, step: 0.5 },
            }}
            sx={{ flex: 1 }}
          />
        </Box>

        <Box display="flex" gap={2}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.operating_rules.allow_custom_ingress}
                onChange={onRulesSwitchChange('allow_custom_ingress')}
              />
            }
            label="Allow Custom Ingress"
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.operating_rules.allow_custom_egress}
                onChange={onRulesSwitchChange('allow_custom_egress')}
              />
            }
            label="Allow Custom Egress"
          />
        </Box>

        {formData.operating_rules.allow_custom_ingress && (
          <Box display="flex" gap={2}>
            <TextField
              label="Min Ingress"
              value={formData.operating_rules.min_ingress_hours}
              onChange={onRulesChange('min_ingress_hours')}
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                inputProps: { min: 0, step: 0.5 },
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Ingress"
              value={formData.operating_rules.max_ingress_hours}
              onChange={onRulesChange('max_ingress_hours')}
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                inputProps: { min: 0, step: 0.5 },
              }}
              sx={{ flex: 1 }}
            />
          </Box>
        )}

        {formData.operating_rules.allow_custom_egress && (
          <Box display="flex" gap={2}>
            <TextField
              label="Min Egress"
              value={formData.operating_rules.min_egress_hours}
              onChange={onRulesChange('min_egress_hours')}
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                inputProps: { min: 0, step: 0.5 },
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Egress"
              value={formData.operating_rules.max_egress_hours}
              onChange={onRulesChange('max_egress_hours')}
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                inputProps: { min: 0, step: 0.5 },
              }}
              sx={{ flex: 1 }}
            />
          </Box>
        )}
      </Stack>
    </AccordionDetails>
  </Accordion>
);
