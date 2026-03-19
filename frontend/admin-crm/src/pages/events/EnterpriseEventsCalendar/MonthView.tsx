import React from 'react';
import { Box, Badge, Stack, Tooltip, Typography } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { formatInManila, parseDateStringAsManila } from '@/utils/timezone';
import { ModernCard } from '@/components/common/ModernCard';
import { AvailabilityBadge } from '@/components/availability/AvailabilityIndicator';

import type { Event, EventStatus } from '@/types/events.types';
import type { CalendarDateInfo } from '@/types/availability.types';
import type { CalendarEvent } from './types';

interface MonthViewProps {
  enhancedCalendarDates: CalendarDateInfo[];
  isMobile: boolean;
  showAvailabilityIndicators: boolean;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getDateCellStyle: (dateInfo: CalendarDateInfo) => Record<string, unknown>;
  getStatusColor: (status: EventStatus) => string;
  getEventTime: (event: CalendarEvent) => string;
  onDateSelect: (date: Date) => void;
  onEventClick: (event: Event) => void;
  onDateClick: (dateStr: string) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  enhancedCalendarDates,
  isMobile,
  showAvailabilityIndicators,
  getEventsForDate,
  getDateCellStyle,
  getStatusColor,
  getEventTime,
  onDateSelect,
  onEventClick,
  onDateClick,
}) => {
  const weeks: CalendarDateInfo[][] = [];
  for (let i = 0; i < enhancedCalendarDates.length; i += 7) {
    weeks.push(enhancedCalendarDates.slice(i, i + 7));
  }

  return (
    <ModernCard variant="flat" size="large">
      <Box sx={{ p: 2 }}>
        {/* Calendar Header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Typography
              key={day}
              variant="subtitle2"
              align="center"
              sx={{ p: 1, fontWeight: 600, color: 'text.secondary' }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {/* Calendar Grid */}
        {weeks.map((week, weekIndex) => (
          <Box
            key={weekIndex}
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}
          >
            {week.map((dateInfo) => {
              // IMPORTANT: Use parseDateStringAsManila to interpret date as PHT midnight
              const date = parseDateStringAsManila(dateInfo.date);
              const dayEvents = getEventsForDate(date);

              return (
                <Box
                  key={dateInfo.date}
                  sx={getDateCellStyle(dateInfo)}
                  onClick={() => onDateSelect(date)}
                >
                  {/* Date Header */}
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: dateInfo.isToday ? 'bold' : 'normal',
                        color: dateInfo.isToday
                          ? 'primary.contrastText'
                          : dateInfo.isCurrentMonth
                            ? 'text.primary'
                            : 'text.secondary',
                      }}
                    >
                      {formatInManila(date, 'd')}
                    </Typography>

                    {/* Availability Indicator */}
                    {showAvailabilityIndicators && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <AvailabilityBadge availability={dateInfo} size="small" />
                        {dateInfo.conflicts.length > 0 && (
                          <Badge badgeContent={dateInfo.conflicts.length} color="error" max={9}>
                            <WarningIcon fontSize="small" color="warning" />
                          </Badge>
                        )}
                      </Stack>
                    )}
                  </Stack>

                  {/* Events */}
                  <Stack spacing={0.5} sx={{ maxHeight: isMobile ? 40 : 80, overflow: 'hidden' }}>
                    {dayEvents.slice(0, isMobile ? 1 : 3).map((event) => (
                      <Tooltip
                        key={event.id}
                        title={`${event.name || 'Untitled Event'} - ${event.client_name}`}
                        arrow
                      >
                        <Box
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                          sx={{
                            p: 0.5,
                            borderRadius: 0.5,
                            backgroundColor: `${getStatusColor(event.status)}.main`,
                            color: `${getStatusColor(event.status)}.contrastText`,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            '&:hover': {
                              opacity: 0.8,
                              transform: 'scale(1.02)',
                            },
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'inherit' }}>
                            {getEventTime(event)} {event.name || 'Untitled'}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}

                    {/* More events indicator */}
                    {dayEvents.length > (isMobile ? 1 : 3) && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          textAlign: 'center',
                          fontStyle: 'italic',
                          cursor: 'pointer',
                          '&:hover': { color: 'primary.main' },
                        }}
                        onClick={() => onDateClick(dateInfo.date)}
                      >
                        +{dayEvents.length - (isMobile ? 1 : 3)} more
                      </Typography>
                    )}
                  </Stack>

                  {/* Availability Status Bar */}
                  {showAvailabilityIndicators && !dateInfo.can_book_event && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        backgroundColor: dateInfo.can_create_lead ? 'warning.main' : 'error.main',
                        borderRadius: '0 0 4px 4px',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </ModernCard>
  );
};
