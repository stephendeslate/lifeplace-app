// frontend/admin-crm/src/components/workflows/CustomTimingInput.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  FormHelperText,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { TimingType, TimingUnit, CustomTiming } from '../../types/workflows.types';
import {
  stringToCustomTiming,
  customTimingToString,
} from '../../types/workflows.types';

export interface CustomTimingInputProps {
  /** Current value as string (e.g., 'AFTER_3_DAYS', 'ON_CREATION') */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Label for the timing type select */
  label?: string;
  /** Helper text to display below */
  helperText?: string;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorText?: string;
  /** Disable the input */
  disabled?: boolean;
  /** Maximum value allowed (default: 365) */
  maxValue?: number;
  /** Minimum value allowed (default: 1) */
  minValue?: number;
  /** Whether to show the "before event" option */
  showBeforeEvent?: boolean;
  /** Test ID prefix */
  'data-testid'?: string;
}

const TIMING_TYPE_OPTIONS: { value: TimingType; label: string }[] = [
  { value: 'immediate', label: 'Immediately' },
  { value: 'after', label: 'After delay' },
  { value: 'before_event', label: 'Before event date' },
];

const TIMING_UNIT_OPTIONS: { value: TimingUnit; label: string }[] = [
  { value: 'HOURS', label: 'Hours' },
  { value: 'DAYS', label: 'Days' },
  { value: 'WEEKS', label: 'Weeks' },
];

export const CustomTimingInput: React.FC<CustomTimingInputProps> = ({
  value,
  onChange,
  label = 'Scheduled Execution',
  helperText,
  error = false,
  errorText,
  disabled = false,
  maxValue = 365,
  minValue = 1,
  showBeforeEvent = true,
  'data-testid': testId,
}) => {
  // Parse initial value to internal state
  const [timingType, setTimingType] = useState<TimingType>('immediate');
  const [numValue, setNumValue] = useState<number>(1);
  const [unit, setUnit] = useState<TimingUnit>('DAYS');
  const [localError, setLocalError] = useState<string | null>(null);

  // Parse value on mount and when value changes externally
  useEffect(() => {
    const parsed = stringToCustomTiming(value);
    setTimingType(parsed.type);
    if (parsed.value !== undefined) {
      setNumValue(parsed.value);
    }
    if (parsed.unit !== undefined) {
      setUnit(parsed.unit);
    }
  }, [value]);

  // Build string and call onChange when internal state changes
  const updateValue = useCallback((newType: TimingType, newValue: number, newUnit: TimingUnit) => {
    // Validate
    if (newType !== 'immediate' && (newValue < minValue || newValue > maxValue)) {
      setLocalError(`Value must be between ${minValue} and ${maxValue}`);
      return;
    }
    setLocalError(null);

    const timing: CustomTiming = {
      type: newType,
      value: newValue,
      unit: newUnit,
    };
    const str = customTimingToString(timing);
    onChange(str);
  }, [onChange, minValue, maxValue]);

  const handleTypeChange = (event: SelectChangeEvent<TimingType>) => {
    const newType = event.target.value as TimingType;
    setTimingType(newType);
    updateValue(newType, numValue, unit);
  };

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value, 10) || minValue;
    setNumValue(newValue);
    updateValue(timingType, newValue, unit);
  };

  const handleUnitChange = (event: SelectChangeEvent<TimingUnit>) => {
    const newUnit = event.target.value as TimingUnit;
    setUnit(newUnit);
    updateValue(timingType, numValue, newUnit);
  };

  const filteredTypeOptions = showBeforeEvent
    ? TIMING_TYPE_OPTIONS
    : TIMING_TYPE_OPTIONS.filter(opt => opt.value !== 'before_event');

  const displayError = errorText || localError;

  return (
    <Box data-testid={testId}>
      <Box display="flex" gap={2} alignItems="flex-start" flexWrap="wrap">
        {/* Timing Type Select */}
        <FormControl
          sx={{ minWidth: 180 }}
          error={error || !!displayError}
          disabled={disabled}
        >
          <InputLabel id={`${testId}-type-label`}>{label}</InputLabel>
          <Select
            labelId={`${testId}-type-label`}
            id={`${testId}-type`}
            value={timingType}
            label={label}
            onChange={handleTypeChange}
            data-testid={`${testId}-type`}
          >
            {filteredTypeOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Value Input - only show for non-immediate */}
        {timingType !== 'immediate' && (
          <>
            <TextField
              type="number"
              value={numValue}
              onChange={handleValueChange}
              disabled={disabled}
              error={error || !!displayError}
              sx={{ width: 100 }}
              inputProps={{
                min: minValue,
                max: maxValue,
                'data-testid': `${testId}-value`,
              }}
              size="small"
            />

            {/* Unit Select - only for 'after' type */}
            {timingType === 'after' && (
              <FormControl
                sx={{ minWidth: 120 }}
                error={error || !!displayError}
                disabled={disabled}
              >
                <Select
                  value={unit}
                  onChange={handleUnitChange}
                  data-testid={`${testId}-unit`}
                  size="small"
                >
                  {TIMING_UNIT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Static text for 'before_event' type */}
            {timingType === 'before_event' && (
              <Typography
                variant="body1"
                sx={{
                  alignSelf: 'center',
                  color: disabled ? 'text.disabled' : 'text.secondary',
                }}
              >
                days before event
              </Typography>
            )}
          </>
        )}
      </Box>

      {/* Helper/Error Text */}
      {(helperText || displayError) && (
        <FormHelperText error={error || !!displayError} sx={{ mt: 0.5, ml: 0 }}>
          {displayError || helperText}
        </FormHelperText>
      )}
    </Box>
  );
};

export default CustomTimingInput;
