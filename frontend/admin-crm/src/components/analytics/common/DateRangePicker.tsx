// frontend/admin-crm/src/components/analytics/common/DateRangePicker.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Popover,
  Stack,
  Typography,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  isValid,
  differenceInDays,
} from 'date-fns';

export interface DateRange {
  start_date: string;
  end_date: string;
  label?: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  presets?: DateRangePreset[];
  maxDays?: number;
  allowCustom?: boolean;
  showRefresh?: boolean;
  onRefresh?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  variant?: 'button' | 'select' | 'chip';
}

export interface DateRangePreset {
  label: string;
  value: string;
  getRange: () => { start: Date; end: Date };
}

const DEFAULT_PRESETS: DateRangePreset[] = [
  {
    label: 'Today',
    value: 'today',
    getRange: () => ({
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Yesterday',
    value: 'yesterday',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      };
    },
  },
  {
    label: 'Last 7 Days',
    value: 'last_7_days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 6)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 Days',
    value: 'last_30_days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 29)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 90 Days',
    value: 'last_90_days',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 89)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'This Week',
    value: 'this_week',
    getRange: () => ({
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: 'This Month',
    value: 'this_month',
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    }),
  },
  {
    label: 'This Quarter',
    value: 'this_quarter',
    getRange: () => ({
      start: startOfQuarter(new Date()),
      end: endOfQuarter(new Date()),
    }),
  },
  {
    label: 'This Year',
    value: 'this_year',
    getRange: () => ({
      start: startOfYear(new Date()),
      end: endOfYear(new Date()),
    }),
  },
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  maxDays = 365,
  allowCustom = true,
  showRefresh = false,
  onRefresh,
  disabled = false,
  size = 'medium',
  variant = 'button',
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [error, setError] = useState<string>('');

  const open = Boolean(anchorEl);

  useEffect(() => {
    if (value) {
      // Try to match current value with presets
      const matchingPreset = presets.find(preset => {
        const range = preset.getRange();
        const presetStart = range.start.toISOString().split('T')[0];
        const presetEnd = range.end.toISOString().split('T')[0];
        return presetStart === value.start_date && presetEnd === value.end_date;
      });

      if (matchingPreset) {
        setSelectedPreset(matchingPreset.value);
      } else {
        setSelectedPreset('custom');
        setCustomStart(new Date(value.start_date));
        setCustomEnd(new Date(value.end_date));
      }
    }
  }, [value, presets]);

  const handlePresetSelect = (preset: DateRangePreset) => {
    const range = preset.getRange();
    setSelectedPreset(preset.value);
    setError('');
    
    onChange({
      start_date: range.start.toISOString().split('T')[0],
      end_date: range.end.toISOString().split('T')[0],
      label: preset.label,
    });
  };

  const handleCustomDateChange = () => {
    if (!customStart || !customEnd) {
      setError('Please select both start and end dates');
      return;
    }

    if (!isValid(customStart) || !isValid(customEnd)) {
      setError('Please select valid dates');
      return;
    }

    if (customStart > customEnd) {
      setError('Start date must be before end date');
      return;
    }

    const daysDiff = differenceInDays(customEnd, customStart);
    if (daysDiff > maxDays) {
      setError(`Date range cannot exceed ${maxDays} days`);
      return;
    }

    setError('');
    setSelectedPreset('custom');
    
    onChange({
      start_date: customStart.toISOString().split('T')[0],
      end_date: customEnd.toISOString().split('T')[0],
      label: `${customStart.toLocaleDateString()} - ${customEnd.toLocaleDateString()}`,
    });
  };

  const handleApplyCustom = () => {
    handleCustomDateChange();
    setAnchorEl(null);
  };

  const handleOpenPicker = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getCurrentLabel = () => {
    if (value?.label) {
      return value.label;
    }
    if (value) {
      return `${new Date(value.start_date).toLocaleDateString()} - ${new Date(value.end_date).toLocaleDateString()}`;
    }
    return 'Select date range';
  };

  const renderTrigger = () => {
    switch (variant) {
      case 'select':
        return (
          <FormControl size={size} sx={{ minWidth: 200 }} disabled={disabled}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={selectedPreset}
              label="Date Range"
              onClick={handleOpenPicker}
            >
              {presets.map((preset) => (
                <MenuItem key={preset.value} value={preset.value}>
                  {preset.label}
                </MenuItem>
              ))}
              {allowCustom && (
                <MenuItem value="custom">Custom Range</MenuItem>
              )}
            </Select>
          </FormControl>
        );

      case 'chip':
        return (
          <Chip
            icon={<DateRangeIcon />}
            label={getCurrentLabel()}
            onClick={handleOpenPicker}
            onDelete={showRefresh ? onRefresh : undefined}
            deleteIcon={showRefresh ? <RefreshIcon /> : undefined}
            variant="outlined"
            disabled={disabled}
            sx={{ 
              maxWidth: 250,
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            }}
          />
        );

      default: // button
        return (
          <Button
            variant="outlined"
            startIcon={<DateRangeIcon />}
            endIcon={showRefresh && (
              <IconButton size="small" onClick={onRefresh} disabled={disabled}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            )}
            onClick={handleOpenPicker}
            disabled={disabled}
            size={size}
            sx={{ minWidth: 200 }}
          >
            {getCurrentLabel()}
          </Button>
        );
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {renderTrigger()}

        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 3, minWidth: 300 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Select Date Range</Typography>
              <IconButton size="small" onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Stack spacing={2}>
              {/* Preset Options */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Quick Select
                </Typography>
                <Stack spacing={1}>
                  {presets.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={selectedPreset === preset.value ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => handlePresetSelect(preset)}
                      fullWidth
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </Stack>
              </Box>

              {/* Custom Date Selection */}
              {allowCustom && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Custom Range
                  </Typography>
                  
                  <Stack spacing={2}>
                    <DatePicker
                      label="Start Date"
                      value={customStart}
                      onChange={setCustomStart}
                      maxDate={customEnd || new Date()}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: true,
                        },
                      }}
                    />
                    
                    <DatePicker
                      label="End Date"
                      value={customEnd}
                      onChange={setCustomEnd}
                      minDate={customStart ?? undefined}
                      maxDate={new Date()}
                      slotProps={{
                        textField: {
                          size: 'small',
                          fullWidth: true,
                        },
                      }}
                    />

                    {error && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {error}
                      </Alert>
                    )}

                    <Button
                      variant="contained"
                      onClick={handleApplyCustom}
                      disabled={!customStart || !customEnd || !!error}
                      fullWidth
                    >
                      Apply Custom Range
                    </Button>
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Popover>
      </Box>
    </LocalizationProvider>
  );
};

// Helper hook for managing date range state
export const useDateRange = (initialRange?: DateRange) => {
  const [dateRange, setDateRange] = useState<DateRange>(
    initialRange || {
      start_date: subDays(new Date(), 29).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      label: 'Last 30 Days',
    }
  );

  const updateRange = (range: DateRange) => {
    setDateRange(range);
  };

  const resetToDefault = () => {
    setDateRange({
      start_date: subDays(new Date(), 29).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      label: 'Last 30 Days',
    });
  };

  return {
    dateRange,
    updateRange,
    resetToDefault,
    startDate: new Date(dateRange.start_date),
    endDate: new Date(dateRange.end_date),
    label: dateRange.label,
  };
};