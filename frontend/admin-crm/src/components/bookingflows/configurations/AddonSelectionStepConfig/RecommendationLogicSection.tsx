// frontend/admin-crm/src/components/bookingflows/configurations/AddonSelectionStepConfig/RecommendationLogicSection.tsx

import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Stack,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { AddonConfigFormData } from './types';

interface RecommendationLogicSectionProps {
  formData: AddonConfigFormData;
  errors: Record<string, string>;
  isDataLoading: boolean;
  onRecommendationLogicChange: (value: string) => void;
}

const PLACEHOLDER = JSON.stringify(
  {
    wedding_packages: ['photography', 'videography'],
    guest_count_above_50: ['sound_equipment', 'extra_tables'],
    outdoor_events: ['tent_rentals', 'lighting'],
  },
  null,
  2,
);

export const RecommendationLogicSection: React.FC<RecommendationLogicSectionProps> = ({
  formData,
  errors,
  isDataLoading,
  onRecommendationLogicChange,
}) => (
  <Accordion>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="subtitle1">Recommendation Logic</Typography>
        {formData.show_recommendations && Object.keys(formData.recommendation_logic).length > 0 && (
          <Chip label="Configured" size="small" color="primary" />
        )}
      </Box>
    </AccordionSummary>
    <AccordionDetails>
      <Stack spacing={2}>
        <Alert severity="info">
          Configure intelligent recommendations to suggest relevant add-ons based on package
          selection, guest count, or other factors.
        </Alert>

        <TextField
          fullWidth
          label="Recommendation Logic (JSON)"
          value={JSON.stringify(formData.recommendation_logic, null, 2)}
          onChange={(e) => onRecommendationLogicChange(e.target.value)}
          multiline
          rows={6}
          error={!!errors.recommendation_logic}
          helperText={
            errors.recommendation_logic || 'Define recommendation rules using JSON format'
          }
          disabled={!formData.show_recommendations || isDataLoading}
          placeholder={PLACEHOLDER}
        />

        <Typography variant="body2" color="text.secondary">
          Example: Recommend photography for wedding packages, or sound equipment for events with
          50+ guests
        </Typography>
      </Stack>
    </AccordionDetails>
  </Accordion>
);
