// frontend/client-portal/src/components/events/EventTimeline.tsx

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
} from '@mui/lab';
import {
  Event as EventIcon,
  Message as MessageIcon,
  Payment as PaymentIcon,
  Task as TaskIcon,
  Update as UpdateIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useEvents } from '../../hooks/useEvents';

interface EventTimelineProps {
  eventId: number;
  maxItems?: number;
  showEmpty?: boolean;
}

const EventTimeline: React.FC<EventTimelineProps> = ({ 
  eventId, 
  maxItems,
  showEmpty = true 
}) => {
  const { useEventTimeline } = useEvents();
  const { data: timeline, isLoading, error } = useEventTimeline(eventId);

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

  const getActionColor = (actionType: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
    switch (actionType.toLowerCase()) {
      case 'event_created':
        return 'success';
      case 'payment_received':
        return 'success';
      case 'payment_failed':
        return 'error';
      case 'task_completed':
        return 'success';
      case 'message_sent':
        return 'info';
      case 'preferences_updated':
        return 'warning';
      default:
        return 'primary';
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Timeline sx={{ p: 0, m: 0 }}>
          {[1, 2, 3].map((item) => (
            <TimelineItem key={item}>
              <TimelineSeparator>
                <Skeleton variant="circular" width={24} height={24} />
                <TimelineConnector />
              </TimelineSeparator>
              <TimelineContent>
                <Skeleton variant="text" width="80%" height={24} />
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={16} />
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Box>
    );
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
      <Paper 
        sx={{ 
          p: 3, 
          textAlign: 'center',
          backgroundColor: 'grey.50',
        }}
      >
        <PersonIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No activity yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Event activity and updates will appear here as they happen.
        </Typography>
      </Paper>
    ) : null;
  }

  const timelineItems = maxItems ? timeline.slice(0, maxItems) : timeline;

  return (
    <Box role="log" aria-label="Event timeline">
      <Timeline sx={{ p: 0, m: 0 }}>
        {timelineItems.map((item, index) => (
          <TimelineItem key={item.id}>
            <TimelineSeparator>
              <TimelineDot
                color={getActionColor(item.action_type)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                }}
              >
                {getActionIcon(item.action_type)}
              </TimelineDot>
              {index < timelineItems.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            
            <TimelineContent sx={{ pb: 2 }}>
              <Paper 
                elevation={1} 
                sx={{ 
                  p: 2,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack spacing={1}>
                  <Typography 
                    variant="body1" 
                    component="h4"
                    sx={{ fontWeight: 500 }}
                  >
                    {item.description}
                  </Typography>
                  
                  <Stack 
                    direction="row" 
                    justifyContent="space-between" 
                    alignItems="center"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      {item.actor_name}
                    </Typography>
                    
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      title={new Date(item.created_at).toLocaleString()}
                    >
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
      
      {maxItems && timeline.length > maxItems && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {maxItems} of {timeline.length} activities
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default EventTimeline;