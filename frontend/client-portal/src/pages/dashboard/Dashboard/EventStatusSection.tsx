import React from 'react';
import { Box, Typography, Stack, Chip, Button, CardContent, useTheme, alpha } from '@mui/material';
import {
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  History as HistoryIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import { getRelativeTime } from '@/utils/eventHelpers';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { DashboardData } from '@/hooks/useDashboardData/dashboard-types';
import { safeFormatDate, PHILIPPINE_TIMEZONE } from './dashboard-utils';

interface EventStatusSectionProps {
  eventStatus: DashboardData['eventStatus'];
  onViewEvent: (eventId: number) => void;
  onNavigate: (path: string) => void;
}

const EventStatusSection: React.FC<EventStatusSectionProps> = ({
  eventStatus,
  onViewEvent,
  onNavigate,
}) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <EventIcon color="primary" />
        Event Status
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
        }}
      >
        {/* Next Upcoming Event */}
        <Box sx={{ flex: 1 }}>
          <GlassCard variant="light" intensity="subtle" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Next Upcoming Event
              </Typography>
              {eventStatus.nextUpcomingEvent ? (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {eventStatus.nextUpcomingEvent.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {safeFormatDate(
                      eventStatus.nextUpcomingEvent.start_date,
                      PHILIPPINE_TIMEZONE,
                      'MMM dd, yyyy',
                    )}
                    {eventStatus.nextUpcomingEvent.end_date &&
                      safeFormatDate(
                        eventStatus.nextUpcomingEvent.start_date,
                        PHILIPPINE_TIMEZONE,
                        'yyyy-MM-dd',
                      ) !==
                        safeFormatDate(
                          eventStatus.nextUpcomingEvent.end_date,
                          PHILIPPINE_TIMEZONE,
                          'yyyy-MM-dd',
                        ) &&
                      ` - ${safeFormatDate(eventStatus.nextUpcomingEvent.end_date, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}`}
                  </Typography>
                  <Chip
                    label={eventStatus.nextUpcomingEvent.status.replace('_', ' ')}
                    color="primary"
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => onViewEvent(eventStatus.nextUpcomingEvent!.id)}
                  >
                    View Details
                  </Button>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CalendarIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No upcoming events scheduled
                  </Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Box>

        {/* Recent Activity */}
        <Box sx={{ flex: 1 }}>
          <GlassCard variant="light" intensity="subtle" sx={{ height: '100%' }}>
            <CardContent>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <HistoryIcon fontSize="small" color="action" />
                Recent Activity
              </Typography>
              {eventStatus.recentUpdates.length > 0 ? (
                <Stack spacing={1.5}>
                  {eventStatus.recentUpdates.slice(0, 4).map((update) => (
                    <Box
                      key={update.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          borderColor: alpha(theme.palette.primary.main, 0.2),
                        },
                      }}
                      onClick={() => onViewEvent(update.eventId)}
                    >
                      <Box
                        sx={{
                          p: 0.75,
                          borderRadius: 1,
                          backgroundColor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <UpdateIcon fontSize="small" />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {update.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {update.eventName} · {getRelativeTime(update.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  {eventStatus.recentUpdates.length > 4 && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => onNavigate('/events')}
                      sx={{ alignSelf: 'center', mt: 0.5 }}
                    >
                      View All Activity
                    </Button>
                  )}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No recent activity
                  </Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Box>
      </Box>
    </Box>
  );
};

export default EventStatusSection;
