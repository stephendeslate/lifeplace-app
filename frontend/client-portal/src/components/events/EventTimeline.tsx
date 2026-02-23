// frontend/client-portal/src/components/events/EventTimeline.tsx

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Skeleton,
  Alert,
  Chip,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Event as EventIcon,
  Message as MessageIcon,
  Payment as PaymentIcon,
  Task as TaskIcon,
  Update as UpdateIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { formatDistance, isToday, isYesterday, isThisWeek } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { useEvents } from '../../hooks/useEvents';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import type { EventTimeline as EventTimelineType } from '../../types/events.types';

interface EventTimelineProps {
  eventId: number;
  maxItems?: number;
  showEmpty?: boolean;
}

interface GroupedTimelineItems {
  label: string;
  items: EventTimelineType[];
}

const PHILIPPINE_TIMEZONE = 'Asia/Manila';

// Helper to get action icon
const getActionIcon = (actionType: string) => {
  switch (actionType.toLowerCase()) {
    case 'event_created':
    case 'event_updated':
      return <EventIcon fontSize="small" />;
    case 'message_sent':
    case 'communication':
      return <MessageIcon fontSize="small" />;
    case 'payment_received':
    case 'payment_failed':
    case 'invoice_created':
      return <PaymentIcon fontSize="small" />;
    case 'task_created':
    case 'task_completed':
      return <TaskIcon fontSize="small" />;
    case 'preferences_updated':
    case 'settings_changed':
      return <SettingsIcon fontSize="small" />;
    default:
      return <UpdateIcon fontSize="small" />;
  }
};

// Helper to get action color
const getActionColor = (
  actionType: string,
): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
  switch (actionType.toLowerCase()) {
    case 'event_created':
    case 'payment_received':
    case 'task_completed':
      return 'success';
    case 'payment_failed':
      return 'error';
    case 'message_sent':
    case 'communication':
      return 'info';
    case 'preferences_updated':
    case 'settings_changed':
      return 'warning';
    default:
      return 'primary';
  }
};

// Helper to format action type for display
const formatActionType = (actionType: string): string => {
  return actionType
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Helper to get date group label (using PHT timezone)
const getDateGroupLabel = (dateString: string): string => {
  const datePHT = toZonedTime(dateString, PHILIPPINE_TIMEZONE);

  if (isToday(datePHT)) return 'Today';
  if (isYesterday(datePHT)) return 'Yesterday';
  if (isThisWeek(datePHT)) return 'This Week';
  return 'Earlier';
};

// Timeline Event Item Component
interface TimelineEventItemProps {
  item: EventTimelineType;
  index: number;
  isLast: boolean;
  globalIndex: number;
}

const TimelineEventItem: React.FC<TimelineEventItemProps> = ({ item, isLast, globalIndex }) => {
  const theme = useTheme();
  const actionColor = getActionColor(item.action_type);
  const actionIcon = getActionIcon(item.action_type);

  // Parse created_at - if no timezone specified, treat as PHT (+08:00)
  const createdAtStr = item.created_at;
  const hasTimezone =
    createdAtStr.includes('+') || createdAtStr.includes('Z') || createdAtStr.includes('-', 10);
  const normalizedTimestamp = hasTimezone ? createdAtStr : `${createdAtStr}+08:00`;

  const postedTime = new Date(normalizedTimestamp);
  const currentTime = new Date();

  const formattedDate = {
    date: formatInTimeZone(normalizedTimestamp, PHILIPPINE_TIMEZONE, 'MMM d'),
    time: formatInTimeZone(normalizedTimestamp, PHILIPPINE_TIMEZONE, 'h:mm a'),
    // Relative time is timezone-independent (absolute difference)
    relative: formatDistance(postedTime, currentTime, { addSuffix: true }),
  };

  return (
    <AnimatedElement animation="slideUp" delay={globalIndex * 80}>
      <Box sx={{ position: 'relative', pb: isLast ? 0 : 3 }}>
        {/* Gradient Timeline Connector */}
        {!isLast && (
          <Box
            sx={{
              position: 'absolute',
              left: 19,
              top: 44,
              bottom: -12,
              width: 2,
              background: `linear-gradient(180deg, ${alpha(theme.palette[actionColor].main, 0.5)} 0%, ${alpha(theme.palette[actionColor].main, 0.1)} 100%)`,
              borderRadius: 1,
            }}
          />
        )}

        {/* Event Container */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Timeline Dot with Avatar */}
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                backgroundColor: alpha(theme.palette[actionColor].main, 0.12),
                color: theme.palette[actionColor].main,
                border: `2px solid ${theme.palette[actionColor].main}`,
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: `0 0 12px ${alpha(theme.palette[actionColor].main, 0.4)}`,
                },
              }}
            >
              {actionIcon}
            </Avatar>
          </Box>

          {/* Event Content Card */}
          <GlassCard
            variant="light"
            intensity="medium"
            hover
            sx={{
              flex: 1,
              p: 2.5,
              border: `1px solid ${alpha(theme.palette[actionColor].main, 0.2)}`,
              backgroundColor: alpha(theme.palette[actionColor].main, 0.03),
              borderLeft: `3px solid ${theme.palette[actionColor].main}`,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette[actionColor].main, 0.06),
                borderColor: alpha(theme.palette[actionColor].main, 0.35),
              },
            }}
          >
            {/* Header Row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                mb: 1,
              }}
            >
              <Box sx={{ flex: 1 }}>
                {/* Description */}
                <Typography
                  variant="body1"
                  component="h4"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    lineHeight: 1.4,
                    color: 'text.primary',
                  }}
                >
                  {item.description}
                </Typography>
              </Box>

              {/* Action Type Chip */}
              <Box
                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}
              >
                <Chip
                  label={formatActionType(item.action_type)}
                  size="small"
                  color={actionColor}
                  variant="outlined"
                  sx={{
                    backgroundColor: alpha(theme.palette[actionColor].main, 0.08),
                    fontSize: '0.7rem',
                    height: 22,
                    fontWeight: 500,
                  }}
                />
              </Box>
            </Box>

            {/* Footer Row */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 1.5 }}
            >
              {/* Actor */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  sx={{
                    width: 22,
                    height: 22,
                    fontSize: '0.7rem',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                >
                  {item.actor_name?.charAt(0) || 'S'}
                </Avatar>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 500,
                    color: 'text.secondary',
                  }}
                >
                  {item.actor_name || 'System'}
                </Typography>
              </Box>

              {/* Timestamp */}
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    display: 'block',
                  }}
                >
                  {formattedDate.date} at {formattedDate.time} PHT
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                  }}
                >
                  {formattedDate.relative}
                </Typography>
              </Box>
            </Stack>
          </GlassCard>
        </Box>
      </Box>
    </AnimatedElement>
  );
};

// Loading Skeleton Component
const TimelineSkeleton: React.FC = () => {
  const theme = useTheme();

  return (
    <Box>
      {[1, 2, 3].map((item, index) => (
        <Box key={item} sx={{ position: 'relative', pb: index < 2 ? 3 : 0 }}>
          {index < 2 && (
            <Box
              sx={{
                position: 'absolute',
                left: 19,
                top: 44,
                bottom: -12,
                width: 2,
                backgroundColor: alpha(theme.palette.divider, 0.3),
                borderRadius: 1,
              }}
            />
          )}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// Main Component
const EventTimeline: React.FC<EventTimelineProps> = ({ eventId, maxItems, showEmpty = true }) => {
  const theme = useTheme();
  const { useEventTimeline } = useEvents();
  const { data: timeline, isLoading, error } = useEventTimeline(eventId);

  // Group timeline items by date
  const groupedItems = useMemo((): GroupedTimelineItems[] => {
    if (!timeline || timeline.length === 0) return [];

    const items = maxItems ? timeline.slice(0, maxItems) : timeline;
    const groups: Record<string, EventTimelineType[]> = {};

    items.forEach((item) => {
      const label = getDateGroupLabel(item.created_at);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(item);
    });

    // Order: Today, Yesterday, This Week, Earlier
    const order = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    return order.filter((label) => groups[label]).map((label) => ({ label, items: groups[label] }));
  }, [timeline, maxItems]);

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Unable to load event timeline. Please try again later.
      </Alert>
    );
  }

  if (!timeline || timeline.length === 0) {
    return showEmpty ? (
      <GlassCard
        variant="light"
        intensity="subtle"
        hover={false}
        sx={{
          p: 4,
          textAlign: 'center',
        }}
      >
        <PersonIcon sx={{ fontSize: 56, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No activity yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Event activity and updates will appear here as they happen.
        </Typography>
      </GlassCard>
    ) : null;
  }

  // Calculate global index for staggered animations
  let globalIndex = 0;

  return (
    <Box role="log" aria-label="Event timeline">
      {/* Grouped Timeline */}
      {groupedItems.map((group, groupIndex) => (
        <Box key={group.label} sx={{ mb: groupIndex < groupedItems.length - 1 ? 3 : 0 }}>
          {/* Group Header */}
          <AnimatedElement animation="fadeIn" delay={globalIndex * 80}>
            <Typography
              variant="overline"
              sx={{
                display: 'block',
                mb: 2,
                ml: 7,
                fontWeight: 700,
                letterSpacing: 1.2,
                color: group.label === 'Today' ? 'primary.main' : 'text.secondary',
                fontSize: '0.75rem',
              }}
            >
              {group.label}
            </Typography>
          </AnimatedElement>

          {/* Group Items */}
          {group.items.map((item, index) => {
            const itemGlobalIndex = globalIndex++;
            return (
              <TimelineEventItem
                key={item.id}
                item={item}
                index={index}
                isLast={groupIndex === groupedItems.length - 1 && index === group.items.length - 1}
                globalIndex={itemGlobalIndex}
              />
            );
          })}
        </Box>
      ))}

      {/* Show more indicator */}
      {maxItems && timeline.length > maxItems && (
        <AnimatedElement animation="fadeIn" delay={(globalIndex + 1) * 80}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              mt: 3,
              p: 2,
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.info.main, 0.04),
              border: `1px dashed ${alpha(theme.palette.info.main, 0.3)}`,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Showing <strong>{maxItems}</strong> of <strong>{timeline.length}</strong> activities
            </Typography>
          </GlassCard>
        </AnimatedElement>
      )}
    </Box>
  );
};

export default EventTimeline;
