// frontend/admin-crm/src/components/analytics/reports/ReportScheduler.tsx

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  DateRange as DateIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import type { ScheduleFrequency } from '../../../types/analytics.types';

interface ScheduleConfig {
  frequency: ScheduleFrequency;
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
}

interface ReportSchedulerProps {
  value: ScheduleConfig;
  onChange: (config: ScheduleConfig) => void;
  disabled?: boolean;
  showRecipients?: boolean;
}

export const ReportScheduler: React.FC<ReportSchedulerProps> = ({
  value,
  onChange,
  disabled = false,
  showRecipients = true,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFrequencyChange = (frequency: ScheduleFrequency) => {
    onChange({
      ...value,
      frequency,
      time: frequency === 'MANUAL' ? '' : value.time,
      dayOfWeek: frequency === 'WEEKLY' ? value.dayOfWeek : undefined,
      dayOfMonth: frequency === 'MONTHLY' ? value.dayOfMonth : undefined,
    });
    setErrors({});
  };

  const handleTimeChange = (time: string) => {
    onChange({ ...value, time });
    if (errors.time) {
      setErrors({ ...errors, time: '' });
    }
  };

  const handleDayOfWeekChange = (dayOfWeek: number) => {
    onChange({ ...value, dayOfWeek });
    if (errors.dayOfWeek) {
      setErrors({ ...errors, dayOfWeek: '' });
    }
  };

  const handleDayOfMonthChange = (dayOfMonth: number) => {
    onChange({ ...value, dayOfMonth });
    if (errors.dayOfMonth) {
      setErrors({ ...errors, dayOfMonth: '' });
    }
  };

  const getScheduleDescription = (): string => {
    if (value.frequency === 'MANUAL') {
      return 'Report will only be generated manually';
    }

    let description = `Report will be generated ${value.frequency.toLowerCase()}`;
    
    if (value.time) {
      description += ` at ${value.time}`;
    }
    
    if (value.frequency === 'WEEKLY' && value.dayOfWeek !== undefined) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      description += ` on ${days[value.dayOfWeek]}s`;
    }
    
    if (value.frequency === 'MONTHLY' && value.dayOfMonth) {
      const suffix = getOrdinalSuffix(value.dayOfMonth);
      description += ` on the ${value.dayOfMonth}${suffix} of each month`;
    }
    
    return description;
  };

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const getNextExecutionTime = (): string => {
    if (value.frequency === 'MANUAL') {
      return 'N/A';
    }

    // This is a simplified calculation - in reality, you'd want to use a proper date library
    const now = new Date();
    let nextExecution = new Date();

    if (value.time) {
      const [hours, minutes] = value.time.split(':').map(Number);
      nextExecution.setHours(hours, minutes, 0, 0);
    }

    switch (value.frequency) {
      case 'DAILY': {
        if (nextExecution <= now) {
          nextExecution.setDate(nextExecution.getDate() + 1);
        }
        break;
      }
      case 'WEEKLY': {
        // Find next occurrence of the specified day
        const targetDay = value.dayOfWeek || 0;
        const currentDay = nextExecution.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        if (daysUntilTarget === 0 && nextExecution <= now) {
          nextExecution.setDate(nextExecution.getDate() + 7);
        } else {
          nextExecution.setDate(nextExecution.getDate() + daysUntilTarget);
        }
        break;
      }
      case 'MONTHLY': {
        if (value.dayOfMonth) {
          nextExecution.setDate(value.dayOfMonth);
          if (nextExecution <= now) {
            nextExecution.setMonth(nextExecution.getMonth() + 1);
          }
        }
        break;
      }
      case 'QUARTERLY': {
        // Simplified quarterly calculation
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const nextQuarterStart = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 1);
        nextExecution = nextQuarterStart;
        break;
      }
    }

    return nextExecution.toLocaleString();
  };

  const scheduleFrequencies: Array<{ value: ScheduleFrequency; label: string }> = [
    { value: 'MANUAL', label: 'Manual Only' },
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'QUARTERLY', label: 'Quarterly' },
  ];

  const weekDays = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' },
  ];

  return (
    <Card>
      <CardHeader
        avatar={<ScheduleIcon />}
        title="Schedule Configuration"
        subheader="Configure when and how often this report should be generated"
      />
      
      <CardContent>
        <Stack spacing={3}>
          {/* Frequency Selection */}
          <FormControl fullWidth disabled={disabled}>
            <InputLabel>Frequency</InputLabel>
            <Select
              value={value.frequency}
              label="Frequency"
              onChange={(e) => handleFrequencyChange(e.target.value as ScheduleFrequency)}
            >
              {scheduleFrequencies.map((freq) => (
                <MenuItem key={freq.value} value={freq.value}>
                  {freq.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Time Configuration */}
          {value.frequency !== 'MANUAL' && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TimeIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">
                  Execution Time
                </Typography>
              </Box>
              
              <TextField
                label="Time"
                type="time"
                value={value.time}
                onChange={(e) => handleTimeChange(e.target.value)}
                error={!!errors.time}
                helperText={errors.time || 'Time when the report should be generated'}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }} // 5 min intervals
                fullWidth
                disabled={disabled}
              />
            </Box>
          )}

          {/* Weekly Configuration */}
          {value.frequency === 'WEEKLY' && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <DateIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">
                  Day of Week
                </Typography>
              </Box>
              
              <FormControl fullWidth disabled={disabled}>
                <InputLabel>Day of Week</InputLabel>
                <Select
                  value={value.dayOfWeek ?? ''}
                  label="Day of Week"
                  onChange={(e) => handleDayOfWeekChange(Number(e.target.value))}
                  error={!!errors.dayOfWeek}
                >
                  {weekDays.map((day) => (
                    <MenuItem key={day.value} value={day.value}>
                      {day.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.dayOfWeek && (
                  <FormHelperText error>{errors.dayOfWeek}</FormHelperText>
                )}
              </FormControl>
            </Box>
          )}

          {/* Monthly Configuration */}
          {value.frequency === 'MONTHLY' && (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <DateIcon fontSize="small" color="action" />
                <Typography variant="subtitle2">
                  Day of Month
                </Typography>
              </Box>
              
              <TextField
                label="Day of Month"
                type="number"
                value={value.dayOfMonth || ''}
                onChange={(e) => handleDayOfMonthChange(Number(e.target.value))}
                error={!!errors.dayOfMonth}
                helperText={errors.dayOfMonth || 'Day of the month (1-28) when the report should be generated'}
                inputProps={{ min: 1, max: 28 }}
                fullWidth
                disabled={disabled}
              />
            </Box>
          )}

          <Divider />

          {/* Schedule Summary */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Schedule Summary
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              {getScheduleDescription()}
            </Alert>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Next execution:
              </Typography>
              <Chip
                label={getNextExecutionTime()}
                size="small"
                color={value.frequency === 'MANUAL' ? 'default' : 'primary'}
                variant="outlined"
              />
            </Box>
          </Box>

          {/* Recipients Section */}
          {showRecipients && (
            <>
              <Divider />
              
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2">
                    Recipients
                  </Typography>
                </Box>
                
                {value.recipients.length > 0 ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {value.recipients.map((email) => (
                      <Chip
                        key={email}
                        label={email}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No recipients configured. Report will only be available for download.
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};