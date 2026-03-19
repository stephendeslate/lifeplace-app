import React from 'react';
import { Box, Typography, Alert, Chip, Stack } from '@mui/material';
import { Timeline as StepsIcon } from '@mui/icons-material';
import type { BookingFlowDetail } from '@/types/bookingflows';
import { ModernCard } from '@/components/common';

interface FlowStepsPreviewProps {
  flow: BookingFlowDetail;
}

export const FlowStepsPreview: React.FC<FlowStepsPreviewProps> = ({ flow }) => (
  <ModernCard sx={{ mt: 3 }}>
    <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
      <StepsIcon color="primary" />
      Flow Steps ({flow.steps?.length || 0})
    </Typography>

    {flow.steps && flow.steps.length > 0 ? (
      <Stack spacing={1}>
        {flow.steps
          .sort((a, b) => a.order - b.order)
          .map((step, index) => (
            <Box
              key={step.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                border: 1,
                borderColor: step.is_enabled ? 'primary.light' : 'grey.300',
                borderRadius: 1,
                backgroundColor: step.is_enabled ? 'primary.50' : 'grey.50',
                opacity: step.is_enabled ? 1 : 0.6,
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: step.is_enabled ? 'primary.main' : 'grey.400',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}
              >
                {index + 1}
              </Box>

              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {step.step_type_display}
                </Typography>
              </Box>

              <Box display="flex" gap={1}>
                {step.is_required && (
                  <Chip label="Required" size="small" color="error" variant="outlined" />
                )}
                {step.is_skippable && (
                  <Chip label="Skippable" size="small" color="primary" variant="outlined" />
                )}
                {!step.is_enabled && (
                  <Chip label="Disabled" size="small" color="default" variant="outlined" />
                )}
              </Box>
            </Box>
          ))}
      </Stack>
    ) : (
      <Alert severity="warning">
        No steps configured for this booking flow. Add steps to provide a complete booking
        experience.
      </Alert>
    )}
  </ModernCard>
);
