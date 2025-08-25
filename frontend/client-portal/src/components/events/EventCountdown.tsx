// frontend/client-portal/src/components/events/EventCountdown.tsx

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import {
  Event as EventIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
} from '@mui/icons-material';

interface EventCountdownProps {
  daysUntil: number;
  compact?: boolean;
  showIcon?: boolean;
}

const EventCountdown: React.FC<EventCountdownProps> = ({ 
  daysUntil, 
  compact = false, 
  showIcon = true 
}) => {
  const getCountdownConfig = (days: number) => {
    if (days < 0) {
      return {
        color: 'text.secondary' as const,
        bgColor: 'grey.100',
        text: 'Event passed',
        icon: <CompletedIcon fontSize={compact ? 'small' : 'medium'} />,
        chipColor: 'default' as const,
      };
    }
    
    if (days === 0) {
      return {
        color: 'error.main' as const,
        bgColor: 'error.light',
        text: 'Today!',
        icon: <EventIcon fontSize={compact ? 'small' : 'medium'} />,
        chipColor: 'error' as const,
      };
    }
    
    if (days === 1) {
      return {
        color: 'warning.main' as const,
        bgColor: 'warning.light',
        text: 'Tomorrow',
        icon: <ScheduleIcon fontSize={compact ? 'small' : 'medium'} />,
        chipColor: 'warning' as const,
      };
    }
    
    if (days <= 7) {
      return {
        color: 'warning.main' as const,
        bgColor: 'warning.light',
        text: `${days} days`,
        icon: <ScheduleIcon fontSize={compact ? 'small' : 'medium'} />,
        chipColor: 'warning' as const,
      };
    }
    
    if (days <= 30) {
      return {
        color: 'info.main' as const,
        bgColor: 'info.light',
        text: `${days} days`,
        icon: <ScheduleIcon fontSize={compact ? 'small' : 'medium'} />,
        chipColor: 'info' as const,
      };
    }
    
    return {
      color: 'success.main' as const,
      bgColor: 'success.light',
      text: `${days} days`,
      icon: <ScheduleIcon fontSize={compact ? 'small' : 'medium'} />,
      chipColor: 'success' as const,
    };
  };

  const config = getCountdownConfig(daysUntil);

  if (compact) {
    return (
      <Chip
        label={config.text}
        color={config.chipColor}
        size="small"
        icon={showIcon ? config.icon : undefined}
        sx={{
          fontWeight: 500,
        }}
        aria-label={`Event countdown: ${config.text}`}
      />
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        borderRadius: 2,
        backgroundColor: config.bgColor,
        minWidth: 120,
        textAlign: 'center',
      }}
      role="status"
      aria-label={`Event countdown: ${config.text}`}
    >
      {showIcon && (
        <Box sx={{ mb: 1, color: config.color }}>
          {config.icon}
        </Box>
      )}
      
      <Typography
        variant="h6"
        component="span"
        sx={{
          color: config.color,
          fontWeight: 600,
          fontSize: { xs: '1rem', sm: '1.25rem' },
        }}
      >
        {config.text}
      </Typography>
      
      {daysUntil > 0 && (
        <Typography
          variant="caption"
          sx={{
            color: config.color,
            opacity: 0.8,
          }}
        >
          until event
        </Typography>
      )}
    </Box>
  );
};

export default EventCountdown;