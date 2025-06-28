// frontend/admin-crm/src/components/analytics/funnels/FunnelVisualization.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  TrendingDown as DropoffIcon,
} from '@mui/icons-material';
import type { ConversionFunnel, FunnelAnalyticsResult } from '../../../types/analytics.types';

interface FunnelVisualizationProps {
  funnel: ConversionFunnel;
  analytics: FunnelAnalyticsResult;
  compact?: boolean;
}

export const FunnelVisualization: React.FC<FunnelVisualizationProps> = ({
  funnel,
  analytics,
  compact = false,
}) => {
  const maxWidth = compact ? 400 : 600;
  const stepHeight = compact ? 60 : 80;
  const spacing = compact ? 8 : 12;

  // Calculate the width of each step based on conversion rate
  const getStepWidth = (completedCount: number) => {
    if (analytics.total_started === 0) return 100;
    return Math.max(20, (completedCount / analytics.total_started) * 100);
  };

  // Calculate drop-off between steps
  const getDropoffRate = (currentCount: number, previousCount: number) => {
    if (previousCount === 0) return 0;
    return ((previousCount - currentCount) / previousCount) * 100;
  };

  const getStepColor = (index: number) => {
    if (index === 0) return 'success.main';
    if (index === analytics.step_analytics.length - 1) return 'primary.main';
    return 'info.main';
  };

  return (
    <Box sx={{ width: '100%', maxWidth, mx: 'auto' }}>
      {/* Header */}
      <Box textAlign="center" mb={3}>
        <Typography variant="h6" gutterBottom>
          {funnel.name} Conversion Flow
        </Typography>
        <Stack direction="row" justifyContent="center" spacing={4}>
          <Box textAlign="center">
            <Typography variant="h4" color="primary">
              {analytics.total_started.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Started
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="success.main">
              {analytics.total_completed.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Completed
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="warning.main">
              {parseFloat(analytics.overall_conversion_rate).toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Conversion Rate
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Funnel Steps */}
      <Box>
        {analytics.step_analytics.map((stepData, index) => {
          const stepWidth = getStepWidth(stepData.completed_count);
          const previousCount = index > 0 ? analytics.step_analytics[index - 1].completed_count : analytics.total_started;
          const dropoffRate = index > 0 ? getDropoffRate(stepData.completed_count, previousCount) : 0;
          const dropoffCount = index > 0 ? previousCount - stepData.completed_count : 0;

          return (
            <Box key={stepData.step_index}>
              {/* Drop-off indicator (except for first step) */}
              {index > 0 && (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    py: 1,
                  }}
                >
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: 'error.50',
                      border: 1,
                      borderColor: 'error.200',
                    }}
                  >
                    <DropoffIcon fontSize="small" color="error" />
                    <Typography variant="caption" color="error.main">
                      {dropoffCount.toLocaleString()} dropped off ({dropoffRate.toFixed(1)}%)
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Step Box */}
              <Box
                sx={{
                  position: 'relative',
                  mx: 'auto',
                  mb: spacing / 8,
                }}
                style={{ width: `${stepWidth}%` }}
              >
                <Paper
                  elevation={2}
                  sx={{
                    height: stepHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    bgcolor: getStepColor(index),
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Step Content */}
                  <Box display="flex" alignItems="center" gap={1.5} flex={1} minWidth={0}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        flexShrink: 0,
                      }}
                    >
                      {index === 0 ? (
                        <StartIcon fontSize="small" />
                      ) : index === analytics.step_analytics.length - 1 ? (
                        <CompleteIcon fontSize="small" />
                      ) : (
                        <Typography variant="body2" fontWeight="bold">
                          {index + 1}
                        </Typography>
                      )}
                    </Box>

                    <Box flex={1} minWidth={0}>
                      <Typography 
                        variant="subtitle2" 
                        fontWeight="bold"
                        sx={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}
                      >
                        {stepData.step_name}
                      </Typography>
                      {!compact && (
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                          {stepData.completed_count.toLocaleString()} completions
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Conversion Rate */}
                  <Box textAlign="right" flexShrink={0}>
                    <Typography variant="h6" fontWeight="bold">
                      {stepData.conversion_rate.toFixed(1)}%
                    </Typography>
                    {!compact && (
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        conversion
                      </Typography>
                    )}
                  </Box>

                  {/* Funnel shape effect */}
                  <Box
                    sx={{
                      position: 'absolute',
                      right: -1,
                      top: 0,
                      bottom: 0,
                      width: 0,
                      height: 0,
                      borderStyle: 'solid',
                      borderWidth: `${stepHeight / 2}px 0 ${stepHeight / 2}px 20px`,
                      borderColor: `transparent transparent transparent ${getStepColor(index)}`,
                    }}
                  />
                </Paper>

                {/* Step details below (in compact mode) */}
                {compact && (
                  <Box textAlign="center" mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      {stepData.completed_count.toLocaleString()} completions
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Summary */}
      <Box mt={3} textAlign="center">
        <Stack direction={compact ? 'column' : 'row'} spacing={2} justifyContent="center">
          <Chip
            label={`${analytics.step_analytics.length} Steps`}
            variant="outlined"
            size="small"
          />
          <Chip
            label={`${funnel.time_window_hours}h Window`}
            variant="outlined"
            size="small"
          />
          <Chip
            label={`${((analytics.total_started - analytics.total_completed) / analytics.total_started * 100).toFixed(1)}% Drop-off`}
            color="error"
            variant="outlined"
            size="small"
          />
        </Stack>
      </Box>
    </Box>
  );
};