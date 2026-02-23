// frontend/admin-crm/src/components/common/DateTimeDisplay.tsx

import React from 'react';
import { Typography, Box, Tooltip } from '@mui/material';
import type { TypographyProps } from '@mui/material/Typography';
import {
  formatPhilippinesTime,
  formatDualTimezone,
  getUserTimezone,
  BUSINESS_TIMEZONE,
} from '../../utils/timezone';

interface DateTimeDisplayProps {
  /** Date to display (ISO string or Date object) */
  date: string | Date | null | undefined;
  /** Format string (date-fns format) */
  format?: string;
  /** Show timezone suffix (e.g., "PHT") */
  showTimezone?: boolean;
  /** Show dual timezone display (business + user's local) */
  showDualTimezone?: boolean;
  /** Typography variant */
  variant?: TypographyProps['variant'];
  /** Typography color */
  color?: TypographyProps['color'];
  /** Font weight */
  fontWeight?: number | string;
  /** Component to render as */
  component?: React.ElementType;
  /** Additional sx props */
  sx?: TypographyProps['sx'];
}

/**
 * Display datetime in Philippine Time with optional dual timezone display
 *
 * Examples:
 * - Basic: <DateTimeDisplay date={event.start_date} />
 * - Dual timezone: <DateTimeDisplay date={event.start_date} showDualTimezone />
 * - Custom format: <DateTimeDisplay date={event.start_date} format="MMM d, yyyy" />
 */
export const DateTimeDisplay: React.FC<DateTimeDisplayProps> = ({
  date,
  format = 'MMM d, yyyy h:mm a',
  showTimezone = true,
  showDualTimezone = false,
  variant = 'body2',
  color,
  fontWeight,
  component = 'span',
  sx,
}) => {
  if (!date) return null;

  if (showDualTimezone) {
    const userTz = getUserTimezone();

    // Don't show dual timezone if user is in Philippines
    if (userTz === BUSINESS_TIMEZONE) {
      const formatted = formatPhilippinesTime(date, showTimezone, format);
      return (
        <Typography
          variant={variant}
          component={component}
          color={color}
          fontWeight={fontWeight}
          sx={sx}
        >
          {formatted}
        </Typography>
      );
    }

    const dual = formatDualTimezone(date, userTz);

    return (
      <Tooltip title={`Your local time: ${dual.admin}`} arrow>
        <Box component="span">
          <Typography
            variant={variant}
            component={component}
            color={color}
            fontWeight={fontWeight}
            sx={sx}
          >
            {dual.business}
          </Typography>
          {!dual.isSameDay && (
            <Typography
              variant="caption"
              component="span"
              color="text.secondary"
              sx={{ ml: 1, ...sx }}
            >
              ({dual.admin})
            </Typography>
          )}
        </Box>
      </Tooltip>
    );
  }

  const formatted = formatPhilippinesTime(date, showTimezone, format);

  return (
    <Typography
      variant={variant}
      component={component}
      color={color}
      fontWeight={fontWeight}
      sx={sx}
    >
      {formatted}
    </Typography>
  );
};

/**
 * Display date only (no time component)
 *
 * Example: <DateDisplay date={event.start_date} />
 * Output: "Mar 15, 2026 PHT"
 */
export const DateDisplay: React.FC<Omit<DateTimeDisplayProps, 'format'>> = (props) => {
  return <DateTimeDisplay {...props} format="MMM d, yyyy" />;
};

/**
 * Display time only (no date component)
 *
 * Example: <TimeDisplay date={event.start_date} />
 * Output: "6:00 PM PHT"
 */
export const TimeDisplay: React.FC<Omit<DateTimeDisplayProps, 'format'>> = (props) => {
  return <DateTimeDisplay {...props} format="h:mm a" />;
};

/**
 * Display full date with day of week
 *
 * Example: <DateTimeFull date={event.start_date} />
 * Output: "Monday, March 15, 2026 at 6:00 PM PHT"
 */
export const DateTimeFull: React.FC<Omit<DateTimeDisplayProps, 'format'>> = (props) => {
  return <DateTimeDisplay {...props} format="EEEE, MMMM d, yyyy 'at' h:mm a" />;
};

/**
 * Display short date format
 *
 * Example: <DateShort date={event.start_date} />
 * Output: "03/15/2026"
 */
export const DateShort: React.FC<Omit<DateTimeDisplayProps, 'format' | 'showTimezone'>> = (
  props,
) => {
  return <DateTimeDisplay {...props} format="MM/dd/yyyy" showTimezone={false} />;
};
