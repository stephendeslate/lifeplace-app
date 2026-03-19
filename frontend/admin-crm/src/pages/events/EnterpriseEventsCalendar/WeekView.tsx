import React from 'react';
import { Box, IconButton, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { formatInManila, parseDateStringAsManila } from '@/utils/timezone';
import { ModernCard } from '@/components/common/ModernCard';
import {
  AvailabilityIndicator,
  AvailabilityBadge,
} from '@/components/availability/AvailabilityIndicator';

import type { Event, EventStatus } from '@/types/events.types';
import type { CalendarDateInfo } from '@/types/availability.types';
import type { CalendarEvent } from './types';

interface WeekViewProps {
  enhancedCalendarDates: CalendarDateInfo[];
  showAvailabilityIndicators: boolean;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getStatusColor: (status: EventStatus) => string;
  getEventTime: (event: CalendarEvent) => string;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: Event) => void;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>, event: Event) => void;
  onAvailabilityDetailOpen: () => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  enhancedCalendarDates,
  showAvailabilityIndicators,
  getEventsForDate,
  getStatusColor,
  getEventTime,
  onDateSelect,
  onEventClick,
  onMenuOpen,
  onAvailabilityDetailOpen,
}) => {
  const theme = useTheme();

  return (
    <ModernCard variant="flat" size="large">
      <Box sx={{ p: 2 }}>
        {/* Week Header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
          {enhancedCalendarDates.map((dateInfo) => {
            // IMPORTANT: Use parseDateStringAsManila to interpret date as PHT midnight
            const date = parseDateStringAsManila(dateInfo.date);
            return (
              <Box key={dateInfo.date} sx={{ textAlign: 'center', p: 1 }}>
                <Stack spacing={0.5} alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {formatInManila(date, 'EEE')}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: dateInfo.isToday ? 'bold' : 'normal',
                      color: dateInfo.isToday ? 'primary.main' : 'text.primary',
                    }}
                  >
                    {formatInManila(date, 'd')}
                  </Typography>
                  {showAvailabilityIndicators && (
                    <AvailabilityBadge availability={dateInfo} size="medium" />
                  )}
                </Stack>
              </Box>
            );
          })}
        </Box>

        {/* Week Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {enhancedCalendarDates.map((dateInfo) => {
            // IMPORTANT: Use parseDateStringAsManila to interpret date as PHT midnight
            const date = parseDateStringAsManila(dateInfo.date);
            const dayEvents = getEventsForDate(date);

            return (
              <Box
                key={dateInfo.date}
                sx={{
                  minHeight: 400,
                  p: 1,
                  border: 1,
                  borderColor: dateInfo.hasEvents ? 'primary.light' : 'divider',
                  borderRadius: 1,
                  backgroundColor: dateInfo.isToday
                    ? alpha(theme.palette.primary.main, 0.1)
                    : 'background.paper',
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
                onClick={() => onDateSelect(date)}
              >
                <Stack spacing={1}>
                  {dayEvents.map((event) => (
                    <Paper
                      key={event.id}
                      elevation={1}
                      sx={{
                        p: 1,
                        backgroundColor: `${getStatusColor(event.status)}.main`,
                        color: `${getStatusColor(event.status)}.contrastText`,
                        cursor: 'pointer',
                        position: 'relative',
                        '&:hover': {
                          elevation: 3,
                          transform: 'translateY(-1px)',
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <Typography variant="caption" fontWeight="bold">
                        {getEventTime(event)}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {event.name || 'Untitled Event'}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {event.client_name}
                      </Typography>

                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMenuOpen(e, event);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          color: 'inherit',
                          opacity: 0.7,
                          '&:hover': { opacity: 1 },
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}

                  {/* Availability info for week view */}
                  {showAvailabilityIndicators && (
                    <Box sx={{ mt: 'auto', pt: 1 }}>
                      <AvailabilityIndicator
                        availability={dateInfo}
                        compact={true}
                        interactive={true}
                        onClick={onAvailabilityDetailOpen}
                      />
                    </Box>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Box>
    </ModernCard>
  );
};
