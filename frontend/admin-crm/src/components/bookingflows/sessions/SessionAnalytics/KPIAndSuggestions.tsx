import React from 'react';
import { Box, Typography, Alert, Stack } from '@mui/material';
import type { AnalyticsMetrics, StepAnalytics } from './useSessionAnalyticsLogic';
import { parseDurationToSeconds } from './useSessionAnalyticsLogic';

interface KPIAndSuggestionsProps {
  metrics: AnalyticsMetrics;
  stepAnalytics: StepAnalytics[];
  formatAnalyticsCurrency: (amount: number) => string;
}

export const KPIAndSuggestions: React.FC<KPIAndSuggestionsProps> = ({
  metrics,
  stepAnalytics,
  formatAnalyticsCurrency,
}) => (
  <Box display="flex" flexWrap="wrap" gap={3}>
    <Box flex="1 1 300px" minWidth={300}>
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Key Performance Indicators
          </Typography>

          <Stack spacing={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">Average Booking Value</Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatAnalyticsCurrency(metrics.averageBookingValue)}
              </Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">Bounce Rate</Typography>
              <Typography variant="body2" fontWeight="medium">
                {metrics.bounceRate.toFixed(1)}%
              </Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">Completed Bookings</Typography>
              <Typography variant="body2" fontWeight="medium">
                {metrics.completedBookings}
              </Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">Abandoned Sessions</Typography>
              <Typography variant="body2" fontWeight="medium" color="error">
                {metrics.abandonedSessions}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>

    <Box flex="1 1 300px" minWidth={300}>
      <Box sx={{ borderRadius: 1, bgcolor: 'background.paper' }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Optimization Suggestions
          </Typography>

          <Stack spacing={2}>
            {stepAnalytics
              .filter((step) => step.dropOffRate > 30)
              .slice(0, 3)
              .map((step) => (
                <Alert key={step.stepId} severity="warning" variant="outlined">
                  <Typography variant="body2">
                    <strong>{step.stepName}</strong> has a high drop-off rate (
                    {step.dropOffRate.toFixed(1)}%). Consider simplifying this step or adding
                    guidance.
                  </Typography>
                </Alert>
              ))}

            {metrics.conversionRate < 20 && (
              <Alert severity="info" variant="outlined">
                <Typography variant="body2">
                  Conversion rate is below 20%. Consider A/B testing different flow configurations.
                </Typography>
              </Alert>
            )}

            {parseDurationToSeconds(metrics.averageCompletionTime) > 900 && (
              <Alert severity="info" variant="outlined">
                <Typography variant="body2">
                  Average completion time exceeds 15 minutes. Consider reducing the number of
                  required steps.
                </Typography>
              </Alert>
            )}

            {stepAnalytics.filter((s) => s.dropOffRate > 30).length === 0 &&
              metrics.conversionRate >= 20 &&
              parseDurationToSeconds(metrics.averageCompletionTime) <= 900 && (
                <Alert severity="success" variant="outlined">
                  <Typography variant="body2">
                    Your booking flow is performing well! All key metrics are within optimal ranges.
                  </Typography>
                </Alert>
              )}
          </Stack>
        </Box>
      </Box>
    </Box>
  </Box>
);
