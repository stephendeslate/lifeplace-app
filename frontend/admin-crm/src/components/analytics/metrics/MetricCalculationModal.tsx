// frontend/admin-crm/src/components/analytics/metrics/MetricCalculationModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  CircularProgress,
  Alert,
  TextField,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import {
  PlayArrow as CalculateIcon,
  Schedule as TimeIcon,
  TrendingUp as ValueIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { 
  MetricDefinition, 
  MetricCalculationRequest,
  MetricCalculationResult 
} from '../../../types/analytics.types';

interface MetricCalculationModalProps {
  open: boolean;
  onClose: () => void;
  metric: MetricDefinition | null;
  onCalculate: (request: MetricCalculationRequest) => void;
  isCalculating: boolean;
  calculationResult?: MetricCalculationResult;
  calculationError?: any;
}

export const MetricCalculationModal: React.FC<MetricCalculationModalProps> = ({
  open,
  onClose,
  metric,
  onCalculate,
  isCalculating,
  calculationResult,
  calculationError,
}) => {
  const [dateRange, setDateRange] = useState<{
    start_date: Date | null;
    end_date: Date | null;
  }>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end_date: new Date(), // Today
  });

  const [customFilters, setCustomFilters] = useState<string>('{}');
  const [filtersError, setFiltersError] = useState<string>('');

  useEffect(() => {
    if (open) {
      // Reset state when modal opens
      setDateRange({
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end_date: new Date(),
      });
      setCustomFilters('{}');
      setFiltersError('');
    }
  }, [open]);

  const handleCalculate = () => {
    let filters = {};
    
    // Parse custom filters
    try {
      if (customFilters.trim() && customFilters !== '{}') {
        filters = JSON.parse(customFilters);
      }
    } catch (error) {
      setFiltersError('Invalid JSON format in custom filters');
      return;
    }

    setFiltersError('');

    const request: MetricCalculationRequest = {
      start_date: dateRange.start_date?.toISOString().split('T')[0],
      end_date: dateRange.end_date?.toISOString().split('T')[0],
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };

    onCalculate(request);
  };

  const formatValue = (value: string, format: string, decimals: number) => {
    const numValue = parseFloat(value);
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(numValue);
      case 'percentage':
        return `${numValue.toFixed(decimals)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(numValue);
      case 'duration':
        const hours = Math.floor(numValue / 60);
        const minutes = Math.round(numValue % 60);
        return `${hours}h ${minutes}m`;
      case 'bytes':
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(numValue) / Math.log(1024));
        return `${(numValue / Math.pow(1024, i)).toFixed(decimals)} ${sizes[i]}`;
      default:
        return numValue.toFixed(decimals);
    }
  };

  const getCalculationStatus = () => {
    if (isCalculating) {
      return { icon: <CircularProgress size={20} />, text: 'Calculating...', color: 'info' };
    }
    if (calculationError) {
      return { icon: <ErrorIcon />, text: 'Calculation Failed', color: 'error' };
    }
    if (calculationResult) {
      return { icon: <SuccessIcon />, text: 'Calculation Complete', color: 'success' };
    }
    return { icon: <InfoIcon />, text: 'Ready to Calculate', color: 'default' };
  };

  const status = getCalculationStatus();

  if (!metric) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CalculateIcon />
            Calculate Metric: {metric.name}
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3}>
            {/* Metric Information */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Metric Details
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Type:</Typography>
                  <Chip label={metric.metric_type} size="small" color="primary" variant="outlined" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Source:</Typography>
                  <Typography variant="body2">{metric.source_domain}.{metric.source_model}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Aggregation:</Typography>
                  <Chip 
                    label={metric.is_real_time ? 'Real-time' : metric.aggregation_period} 
                    size="small" 
                    color={metric.is_real_time ? 'warning' : 'default'}
                    variant="outlined" 
                  />
                </Box>
                {metric.source_field && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Field:</Typography>
                    <Typography variant="body2">{metric.source_field}</Typography>
                  </Box>
                )}
              </Stack>
            </Paper>

            {/* Calculation Parameters */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Calculation Parameters
              </Typography>
              
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <DatePicker
                    label="Start Date"
                    value={dateRange.start_date}
                    onChange={(date) => setDateRange({ ...dateRange, start_date: date })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                      },
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={dateRange.end_date}
                    onChange={(date) => setDateRange({ ...dateRange, end_date: date })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                      },
                    }}
                  />
                </Stack>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Custom Filters (JSON)
                  </Typography>
                  <TextField
                    multiline
                    rows={4}
                    value={customFilters}
                    onChange={(e) => setCustomFilters(e.target.value)}
                    placeholder='{"status": "confirmed", "category": "premium"}'
                    fullWidth
                    size="small"
                    error={!!filtersError}
                    helperText={filtersError || 'Optional: Add custom filters in JSON format'}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Calculation Status */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Calculation Status
              </Typography>
              
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                {status.icon}
                <Typography variant="body2" color={`${status.color}.main`}>
                  {status.text}
                </Typography>
              </Box>

              {/* Error Display */}
              {calculationError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Calculation Error
                  </Typography>
                  <Typography variant="body2">
                    {calculationError.response?.data?.detail || calculationError.message || 'Unknown error occurred'}
                  </Typography>
                </Alert>
              )}

              {/* Result Display */}
              {calculationResult && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.50' }}>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <ValueIcon color="success" />
                      <Typography variant="h6" color="success.main">
                        Calculation Result
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="h3" fontWeight="bold" color="success.dark">
                        {formatValue(
                          calculationResult.value, 
                          calculationResult.display_format || metric.display_format,
                          metric.decimal_places
                        )}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={2}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TimeIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          Calculated: {new Date(calculationResult.calculation_time).toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>

                    {calculationResult.time_range && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Time Range: {calculationResult.time_range.start_date || 'All time'} to {calculationResult.time_range.end_date || 'Now'}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Real-time Warning */}
              {metric.is_real_time && (
                <Alert severity="info" icon={<InfoIcon />}>
                  This is a real-time metric. The calculation may take longer as it processes current data.
                </Alert>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isCalculating}>
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={handleCalculate}
            disabled={isCalculating || !dateRange.start_date || !dateRange.end_date}
            startIcon={isCalculating ? <CircularProgress size={16} /> : <CalculateIcon />}
          >
            {isCalculating ? 'Calculating...' : 'Calculate'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};